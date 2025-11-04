import { 
  Links, 
  Meta, 
  Outlet, 
  Scripts, 
  ScrollRestoration, 
  useLoaderData,
  Link // CRITICAL FIX: Imported Link for the AppProvider's linkComponent prop
} from "react-router"; 
import { AppProvider } from "@shopify/polaris"; 
import enTranslations from "@shopify/polaris/locales/en.json"; 
import { useMemo } from "react"; 

// --------------------------------------------------------------------------
// LOADER (Runs on the server)
// Safely retrieves the host and the client-side API Key
// --------------------------------------------------------------------------
export const loader = ({ request }) => {
  const url = new URL(request.url);
  const host = url.searchParams.get("host"); 
  
  return { 
      host, 
      polarisTranslations: enTranslations,
      // CRITICAL FIX: Pass the API Key explicitly from the secure Node environment
      shopifyApiKey: process.env.SHOPIFY_API_KEY
  };
};

// --------------------------------------------------------------------------
// ROOT COMPONENT (Renders the initial HTML structure and providers)
// --------------------------------------------------------------------------
export default function Root() {
  // Destructure all necessary data passed from the server-side loader
  const { host, polarisTranslations, shopifyApiKey } = useLoaderData(); 

  // Configure App Bridge on the client using the exposed key
  const appBridgeConfig = useMemo(() => {
    return {
      // CRITICAL FIX: Use the exposed shopifyApiKey, avoiding the ReferenceError for process.env
      apiKey: shopifyApiKey, 
      host: host,
      forceRedirect: false,
    };
  }, [host, shopifyApiKey]);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <Meta />
        <Links />
      </head>
      <body>
        
        {/* CRITICAL FIX: AppProvider must wrap the Outlet to provide context */}
        <AppProvider i18n={polarisTranslations} linkComponent={Link}> 
            <Outlet />
        </AppProvider>
        
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}