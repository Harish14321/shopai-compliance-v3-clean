import { authenticate } from "../shopify.server";

// --------------------------------------------------------------------------
// GRAPHQL QUERY 1: Checks for the presence of key Policy Pages
// Uses the `policy` fields on the `shop` object which automatically checks
// the standard policy handles (privacy-policy, refund-policy, etc.)
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
// It checks the first 250 products.
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
    // CRITICAL FIX: Destructure the admin client correctly from the authenticate function.
    const { admin } = await authenticate(request);

    // --- 1. Compliance Audit (Max 50 points) ---
    // Policies use the built-in Shopify policy handles for reliable checking.
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

    // Score is weighted out of 50. 4 policies * 12.5 points each.
    results.complianceScore = Math.floor((compliantCount / requiredPolicies.length) * 50);

    // --- 2. SEO Audit (Max 50 points) ---
    // Note: We only check the first 250 products for speed.
    const productResponse = await admin.graphql(PRODUCT_SEO_CHECK_QUERY, {
      variables: { first: 250 }
    });

    const productData = productResponse.data?.products;
    const totalProducts = productData.totalCount;
    let seoOptimizedCount = 0;
    let productsChecked = 0;

    if (productData && productData.nodes) {
        productData.nodes.forEach(product => {
            productsChecked++;
            // Check if the SEO description meta field is set and has content (length > 10 is a good proxy)
            const isOptimized = product.hasMetaDescription?.description?.length > 10;  
            if (isOptimized) {
                seoOptimizedCount++;
            }
        });
    }

    const productsNeedingFix = productsChecked - seoOptimizedCount;
    
    // Calculate SEO score based on percentage of products optimized (weighted against 50 max points)
    results.seoStatus = { totalProducts: totalProducts, optimized: seoOptimizedCount, checked: productsChecked };

    if (productsChecked > 0) {
        results.seoScore = Math.floor((seoOptimizedCount / productsChecked) * 50);
    }

    if (productsNeedingFix > 0) {
        results.recommendations.push(`Found ${productsNeedingFix} products needing SEO meta descriptions. Use the Content Writer for bulk optimization.`);
    }


    // --- 3. Final Score and Status ---
    results.totalScore = results.complianceScore + results.seoScore;
    
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
      auditData: results
    };
  }
}
