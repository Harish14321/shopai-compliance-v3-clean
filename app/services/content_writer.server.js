import { authenticate } from "../shopify.server";
import { generateGeminiContent } from "./gemini_api.server.js";

// --- 1. JSON Schema for Content Generation ---
// We strictly define the output structure to ensure the AI returns usable fields.
const CONTENT_JSON_SCHEMA = {
    type: "OBJECT",
    description: "Generated SEO content fields.",
    properties: {
        newDescription: {
            type: "STRING",
            description: "The new, SEO-optimized product description, formatted with HTML."
        },
        newMetaDescription: {
            type: "STRING",
            description: "A concise, SEO-friendly meta description (120-155 characters)."
        },
        newTitle: {
            type: "STRING",
            description: "A slightly optimized, catchy product title."
        },
    },
    required: ["newDescription", "newMetaDescription", "newTitle"]
};

/**
 * Updates a product in Shopify with new content using the Admin API.
 * @param {object} admin - The Shopify Admin API client.
 * @param {string} productId - The product GID to update (e.g., "gid://shopify/Product/123...").
 * @param {object} content - The content object from Gemini.
 * @returns {Promise<void>}
 */
async function updateShopifyProduct(admin, productId, content) {
    // GraphQL mutation to update a product
    const PRODUCT_UPDATE_MUTATION = `
        mutation productUpdate($input: ProductInput!) {
            productUpdate(input: $input) {
                product {
                    id
                    title
                }
                userErrors {
                    field
                    message
                }
            }
        }
    `;

    const response = await admin.graphql(PRODUCT_UPDATE_MUTATION, {
        variables: {
            input: {
                id: productId,
                title: content.newTitle,
                bodyHtml: content.newDescription,
                seo: {
                    title: content.newTitle, // Use new title for SEO title by default
                    description: content.newMetaDescription,
                }
            },
        },
    });

    const result = await response.json();
    const errors = result.data?.productUpdate?.userErrors;

    if (errors && errors.length > 0) {
        throw new Error(`Shopify Product Update failed: ${errors.map(e => e.message).join(', ')}`);
    }
}


/**
 * Handles the content generation action: calls Gemini and updates the Shopify product.
 * @param {Request} request - The incoming Remix request (contains form data).
 * @returns {Promise<object>} The result object for the Remix action.
 */
export async function generateAndApplyContent(request) {
    const formData = await request.formData();
    const productId = formData.get("productId");
    const productName = formData.get("productName");
    const productDescription = formData.get("productDescription");
    const productTags = formData.get("productTags");
    const productTone = formData.get("productTone");

    const errors = [];

    // Basic validation
    if (!productId) {
        return { success: false, errors: ["No product ID provided. Please select a product."] };
    }

    try {
        // 1. Authenticate with Shopify
        const { admin } = await authenticate(request);

        // 2. Prepare the AI Prompt
        const systemPrompt = `You are an expert SEO copywriter. You must rewrite the provided product content to be more engaging and optimized for search engines, adhering to a '${productTone}' tone. Your output MUST be valid JSON and conform strictly to the provided schema.`;
        
        const userQuery = `Rewrite the following product content using a ${productTone} tone. Original Title: "${productName}". Original Description: "${productDescription}". Existing Tags: ${productTags}. Generate a new product title, a new HTML product description, and a 120-155 character SEO meta description.`;

        // 3. Call Gemini API for structured content
        const geminiResponseText = await generateGeminiContent(systemPrompt, userQuery, CONTENT_JSON_SCHEMA);
        
        // 4. Parse the JSON response
        const generatedContent = JSON.parse(geminiResponseText);
        
        // 5. Update the product in Shopify
        await updateShopifyProduct(admin, productId, generatedContent);
        
        return {
            success: true,
            message: `Product content for ${productName} has been successfully updated with a ${productTone} tone.`,
            productName: generatedContent.newTitle,
            newMetaDescription: generatedContent.newMetaDescription,
        };

    } catch (error) {
        console.error("Content Generation Action Error:", error);
        errors.unshift(error.message || "An unexpected error occurred during content generation.");
        
        return {
            success: false,
            errors,
        };
    }
}
