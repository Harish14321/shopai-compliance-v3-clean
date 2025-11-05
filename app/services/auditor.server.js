import { authenticate } from "../shopify.server";

// --------------------------------------------------------------------------
// GRAPHQL QUERY 1: Checks for the presence of key Policy Pages
// --------------------------------------------------------------------------
const POLICY_CHECK_QUERY = `#graphql
  query getPolicyPages {
    shop {
      privacyPolicy: policy(handle: "privacy-policy") { handle }
      refundPolicy: policy(handle: "refund-policy") { handle }
      shippingPolicy: policy(handle: "shipping-policy") { handle }
      termsOfService: policy(handle: "terms-of-service") { handle }
    }
  }
`;

// --------------------------------------------------------------------------
// GRAPHQL QUERY 2: Checks products for missing SEO meta descriptions
// Checks the first 250 products for SEO score calculation.
// --------------------------------------------------------------------------
const PRODUCT_SEO_CHECK_QUERY = `#graphql
  query productSeoCheck($first: Int!) {
    products(first: $first) {
      nodes {
        id
        // Shopify GraphQL automatically checks the SEO metafield namespace/key
        hasMetaDescription: seo(present: true) {
          description
        }
      }
      pageInfo {
        hasNextPage
      }
      totalCount
    }
  }
`;

/**
 * GraphQL QUERY 3: Fetches all page titles for duplicate policy title detection.
 */
const ALL_PAGES_TITLES_QUERY = `#graphql
  query checkDuplicatePages($first: Int!) {
    pages(first: $first) {
      edges {
        node { 
          title 
        }
      }
    }
  }
`;


/**
 * Calculates the Compliance and SEO Health Score by querying the Shopify Admin API.
 * The total score is the sum of Compliance Score (Max 50) and SEO Score (Max 50).
 * @param {Request} request - The Remix request object.
 * @returns {Promise<object>} The audit results, total score, and any errors.
 */
export async function runStoreAudit(request) {
  // Initialize result structure
  const results = {
    complianceScore: 0,
    seoScore: 0,
    totalScore: 0,
    complianceStatus: {},
    seoStatus: {},
    recommendations: []
  };

  try {
    const { admin } = await authenticate(request);

    // --- 1. Compliance Audit (Max 50 points) ---
    const policyResponse = await admin.graphql(POLICY_CHECK_QUERY);
    const shopPolicies = policyResponse.data?.shop || {};
    
    const requiredPolicies = [
      { name: "Privacy Policy", handle: shopPolicies.privacyPolicy?.handle },
      { name: "Refund Policy", handle: shopPolicies.refundPolicy?.handle },
      { name: "Shipping Policy", handle: shopPolicies.shippingPolicy?.handle },
      { name: "Terms of Service", handle: shopPolicies.termsOfService?.handle }
    ];
    
    let compliantCount = 0;
    
    requiredPolicies.forEach(policy => {
      const isPresent = !!policy.handle;
      results.complianceStatus[policy.name] = isPresent;
      if (isPresent) {
        compliantCount++;
      } else {
        results.recommendations.push(`Missing critical policy: ${policy.name}. Use the Policy Generator to fix.`);
      }
    });

    // Score calculation
    results.complianceScore = Math.floor((compliantCount / requiredPolicies.length) * 50);


    // --- 1B. Duplicate Policy Title Check (CRITICAL FIX APPLIED HERE) ---
    const pagesResponse = await admin.graphql(ALL_PAGES_TITLES_QUERY, {
        variables: { first: 250 } // Check first 250 pages
    });
    
    // CRITICAL FIX: Use optional chaining to safely access nested properties and prevent crash
    const pageData = pagesResponse.data?.pages;
    
    if (pageData?.edges) {
        // This code only runs if 'pages.edges' exists, resolving the crash.
        const pageTitles = pageData.edges.map(e => e.node.title);
        const policyTitles = ["Privacy Policy", "Refund Policy", "Shipping Policy", "Terms of Service"];

        policyTitles.forEach(title => {
            const count = pageTitles.filter(t => t.includes(title)).length;
            if (count > 1) {
                results.recommendations.push(`Warning: Found ${count} pages containing the title "${title}". Delete duplicates to improve SEO.`);
            }
        });
    }
    // ----------------------------------------------------


    // --- 2. SEO Audit (Max 50 points) ---
    const productResponse = await admin.graphql(PRODUCT_SEO_CHECK_QUERY, {
      variables: { first: 250 }
    });

    const productData = productResponse.data?.products;
    let seoOptimizedCount = 0;
    let productsChecked = 0;

    if (productData && productData.nodes) {
        productData.nodes.forEach(product => {
            productsChecked++;
            // Check if the SEO description meta field is set and has content
            const isOptimized = product.hasMetaDescription?.description?.length > 10;  
            if (isOptimized) {
                seoOptimizedCount++;
            }
        });
    }

    const productsNeedingFix = productsChecked - seoOptimizedCount;
    
    // Calculate SEO score based on percentage of products optimized
    results.seoStatus = { totalProducts: productData?.totalCount || 0, optimized: seoOptimizedCount, checked: productsChecked };

    if (productsChecked > 0) {
        results.seoScore = Math.floor((seoOptimizedCount / productsChecked) * 50);
    }

    if (productsNeedingFix > 0) {
        results.recommendations.push(`Found ${productsNeedingFix} products needing SEO meta descriptions. Use the Content Writer for bulk optimization.`);
    }


    // --- 3. Final Score and Status ---
    results.totalScore = results.complianceScore + results.seoScore;
    
    // CRITICAL DEBUG: Log the final result before returning to verify logic
    console.log("--- STORE AUDIT COMPLETE ---");
    console.log(`Total Score: ${results.totalScore}`);
    console.log(`Recommendations: ${JSON.stringify(results.recommendations)}`);
    console.log("----------------------------");

    
    return {
      success: true,
      auditData: results,
      errors: []
    };

  } catch (error) {
    console.error("Store Audit Failed:", error);
    return {
      success: false,
      errors: [`Failed to run audit: ${error.message}. Ensure permissions are granted.`],
      // Return partial data so the UI can still show the scorecards
      auditData: results
    };
  }
}