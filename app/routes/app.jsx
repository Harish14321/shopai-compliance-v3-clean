import { useMemo } from "react"; // Still needed if you use it for other logic
import { Link, Outlet, useLoaderData } from "react-router-dom"; 
// REMOVE AppProvider import:
// import { AppProvider } from "@shopify/polaris"; 
import enTranslations from "@shopify/polaris/locales/en.json"; // Can be removed

// NOTE: We keep the links export but should use Option B for CSS (empty array)
export const links = () => []; 

// REMOVE LOADER: The host/translations loader is now in root.jsx
// export const loader = ({ request }) => { ... }; 

export default function App() {
  // We no longer need to destruct host, polarisTranslations from useLoaderData()
  // const { host, polarisTranslations } = useLoaderData(); 

  // We can remove the useMemo/appBridgeConfig if it's not used here anymore

  return (
    // REMOVE AppProvider Wrapper
    <>
      
      {/* 1. Shopify Admin Navigation */}
      <ui-nav-menu>
          <Link to="/app" rel="home">Dashboard</Link>
          <Link to="/policy/generator">Policy Generator</Link>
          <Link to="/content/writer">Content Writer</Link>
      </ui-nav-menu>
      
      {/* 2. Page Content Slot */}
      <Outlet /> 
    </>
  );
}