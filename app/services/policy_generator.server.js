import { authenticate } from "../shopify.server";
import { generateGeminiContent } from "./gemini_api.server.js"; // <-- PATH IS CORRECT: ./ because gemini_api.server.js is in the same folder

// GraphQL mutation and POLICY_SCHEMA definitions remain the same...
const PAGE_CREATE_MUTATION = `
  mutation pageCreate($input: PageInput!) {
    pageCreate(input: $input) {
      page {
        id
        handle
        title
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const POLICY_SCHEMA = {
    type: "OBJECT",
    properties: {
        privacyPolicyContent: { type: "STRING", description: "The complete HTML content for the Privacy Policy." },
        termsOfServiceContent: { type: "STRING", description: "The complete HTML content for the Terms of Service." },
        refundPolicyContent: { type: "STRING", description: "The complete HTML content for the Refund Policy." }
    },
    propertyOrdering: ["privacyPolicyContent", "termsOfServiceContent", "refundPolicyContent"]
};

/**
 * Generates legal policies using the Gemini API and creates Shopify pages.
 */
export async function generateAndApplyPolicies(request) {
    const data = await request.formData();
    
    // --- CRITICAL DEBUG FIX: HARDCODED MOCK DATA ---
    const businessName = "ShopAI Test Company"; 
    const contactEmail = "support@shopaitest.com"; 
    const jurisdiction = "EU_GDPR"; 
    const refundDays = "45"; 
    
    // CRITICAL DEBUG: Log incoming data to the server terminal
    console.log("--- INCOMING FORM DATA (HARDCODED) ---");
    console.log(`Business Name: ${businessName}`);
    console.log(`Contact Email: ${contactEmail}`);
    console.log(`Jurisdiction: ${jurisdiction}`);
    console.log(`Refund Days: ${refundDays}`);
    console.log("--------------------------------------");

    // 1. Input Validation is BYPASSED
    // if (!businessName || !contactEmail || !jurisdiction || !refundDays) { ... }

    const errors = [];
    let policyData;

    try {
        // 2. Prepare the AI prompt
        const systemPrompt = `You are a professional legal compliance assistant. Your task is to generate three legal documents (Privacy Policy, Terms of Service, Refund Policy) based on the user's business details. The output MUST be a JSON object adhering to the provided schema. The policy content must be in clean HTML format. Use the jurisdiction setting to ensure compliance (e.g., mention GDPR for EU).`;
        
        const userQuery = `Generate policies for a business named "${businessName}" with contact email "${contactEmail}". Primary jurisdiction is set to "${jurisdiction}". The refund period is ${refundDays} days. Ensure policies are comprehensive and include standard clauses.`;

        // 3. Call the Gemini API for structured JSON response
        const jsonText = await generateGeminiContent(systemPrompt, userQuery, POLICY_SCHEMA); 
        
        // 4. Parse the AI's JSON response
        policyData = JSON.parse(jsonText);

    } catch (e) {
        console.error("Gemini API or JSON Parsing failed:", e);
        errors.push(`AI Policy Generation Failed: ${e.message}`);
        return { success: false, errors };
    }
    
    const policyPages = [
        { title: "Privacy Policy", content: policyData.privacyPolicyContent, handle: 'privacy-policy' },
        { title: "Terms of Service", content: policyData.termsOfServiceContent, handle: 'terms-of-service' },
        { title: "Refund Policy", content: policyData.refundPolicyContent, handle: 'refund-policy' }
    ];

    const policyResults = [];

    // 5. Authenticate and create pages in Shopify
    try {
        const { admin, session } = await authenticate(request); 
        
        for (const policy of policyPages) {
            const response = await admin.graphql(PAGE_CREATE_MUTATION, {
                variables: {
                    input: {
                        title: policy.title,
                        bodyHtml: policy.content,
                        published: true,
                        handle: policy.handle
                    }
                }
            });

            // FIX: Access the data directly. admin.graphql returns the parsed JSON object.
            const result = response; 
            const userErrors = result.data?.pageCreate?.userErrors;
            
            if (userErrors && userErrors.length > 0) {
                userErrors.forEach(e => errors.push(`Shopify Error for ${policy.title}: ${e.message}`));
            } else if (result.data?.pageCreate?.page) {
                const page = result.data.pageCreate.page;
                policyResults.push({
                    policy: policy.title,
                    url: `https://${session.shop}/admin/pages/${page.id.split('/').pop()}` 
                });
            } else {
                errors.push(`Unknown Shopify Error when creating ${policy.title}.`);
            }
        }

    } catch (e) {
        console.error("Shopify API call failed:", e);
        errors.push(`Shopify API Integration Error: ${e.message}`);
    }

    if (errors.length > 0) {
        return { success: false, errors };
    }

    return {
        success: true,
        message: "All policies successfully generated and created on Shopify.",
        policyResults
    };
}