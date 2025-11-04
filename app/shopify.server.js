import "@shopify/shopify-app-react-router/adapters/node";
import {
    ApiVersion,
    AppDistribution,
    shopifyApp,
} from "@shopify/shopify-app-react-router/server";

// --- MOCK IMPLEMENTATION FOR DEVELOPMENT ---

// 1. Mock Session Storage Interface
const mockSessionStorage = {
    store: (session) => {
        console.log("MOCK STORAGE: Session stored for", session.shop);
        return Promise.resolve(true);
    },
    load: (id) => {
        console.log("MOCK STORAGE: Loading session, returning null (no session)");
        return Promise.resolve(null);
    },
    delete: (id) => {
        console.log("MOCK STORAGE: Deleting session");
        return Promise.resolve(true);
    },
    deleteSessions: (ids) => {
        console.log("MOCK STORAGE: Deleting multiple sessions");
        return Promise.resolve(true);
    },
    findSessionsByShop: (shop) => {
        console.log("MOCK STORAGE: Finding sessions by shop, returning empty array");
        return Promise.resolve([]);
    },
};

// 2. Mock function for the Admin GraphQL client
const mockAdminClient = {
    graphql: async (query, options) => {
        console.log("MOCK SHOPIFY ADMIN API CALL:", query.substring(0, 50) + "...");

        // Mock response for the Auditor's Policy Check
        if (query.includes("getPolicyPages")) {
            return {
                data: {
                    shop: {
                        // Simulate Refund and Shipping Policy missing (2/4 compliant)
                        privacyPolicy: { handle: "privacy-policy" },
                        refundPolicy: null,
                        shippingPolicy: null,
                        termsOfService: { handle: "terms-of-service" },
                    },
                },
            };
        }
        
        // --- FIX FOR totalCount ERROR ---
        if (query.includes("productSeoCheck")) {
            return {
                data: {
                    products: {
                        nodes: [], // No products, as requested
                        pageInfo: { hasNextPage: false },
                        totalCount: 0, // CRITICAL: Ensure totalCount is 0, not undefined/null
                    },
                },
            };
        }
        
        // Mock response for page creation
        if (query.includes("pageCreate")) {
            return {
                data: {
                    pageCreate: {
                        page: {
                            id: "gid://shopify/Page/123456",
                            handle: "new-policy",
                            title: "Mock Policy Page",
                        },
                        userErrors: [],
                    },
                },
            };
        }
        
        // Mock response for product update
        if (query.includes("productUpdate")) {
            return {
                data: {
                    productUpdate: {
                        product: { id: "gid://shopify/Product/98765" },
                        userErrors: [],
                    },
                },
            };
        }

        return { data: {} };
    },
};

// 3. Mock the returned object from the `authenticate` helper
const mockAuthenticateResult = {
    session: {
        shop: "mock-shop-name.myshopify.com",
        accessToken: "shptok_mock_access_token",
    },
    admin: mockAdminClient,
};

// 4. Mock the main `authenticate` function used in the service files
const mockAuthenticate = async (request) => {
    return mockAuthenticateResult;
};
// ---------------------------------------------


// The main shopifyApp configuration uses our mock storage to start the server.
const shopify = shopifyApp({
    apiKey: process.env.SHOPIFY_API_KEY,
    apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
    apiVersion: ApiVersion.October25,
    scopes: process.env.SCOPES?.split(","),
    appUrl: process.env.SHOPIFY_APP_URL || "",
    authPathPrefix: "/auth",
    sessionStorage: mockSessionStorage, 
    distribution: AppDistribution.AppStore,
    ...(process.env.SHOP_CUSTOM_DOMAIN
        ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
        : {}),
});

// We export the mock functions for our service files
export default shopify; 
export const apiVersion = ApiVersion.October25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = mockAuthenticate; // CRITICAL: Exporting the mock function
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
