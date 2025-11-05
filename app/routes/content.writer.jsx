import { useState } from "react"; 
import { Form, useActionData, useNavigation } from "react-router-dom";
import {
  Page, 
  Layout,
  Card,
  Text,
  Button,
  FormLayout,
  Select, 
  TextContainer,
  Banner,
  List,
} from "@shopify/polaris";
import { generateAndApplyContent } from "../services/content_writer.server"; 

// --------------------------------------------------------------------------
// SERVER ACTION: Handles form submission for content generation
// --------------------------------------------------------------------------
export const action = async ({ request }) => {
  const result = await generateAndApplyContent(request);
  return result; // Remix sends this result back to useActionData()
};

// --- Initial Constants ---
const DEFAULT_TONE = "Professional";
const DEFAULT_LANGUAGE = "English";
// -------------------------

// --------------------------------------------------------------------------
// CLIENT COMPONENT: Content Writer Form
// --------------------------------------------------------------------------
export default function ContentWriterPage() {
  const actionData = useActionData();
  const navigation = useNavigation();
  
  // FIX: RESTORED dynamic state—selectedProduct starts as null
  const [selectedProduct, setSelectedProduct] = useState(null); 
  const isProductSelected = !!selectedProduct; 
  const isLoading = navigation.state === 'submitting';

  // FIX: Controlled state introduced to fix the UI Select lockup (required for Polaris)
  const [selectedTone, setSelectedTone] = useState(DEFAULT_TONE);
  const [targetLanguage, setTargetLanguage] = useState(DEFAULT_LANGUAGE);
  
  const toneOptions = [
    { label: "Professional", value: "Professional" },
    { label: "Casual & Witty", value: "Casual" },
    { label: "Luxury & Exclusive", value: "Luxury" },
    { label: "Minimalist & Direct", value: "Minimalist" },
  ];
  
  const languageOptions = [
    { label: "English", value: "English" },
    { label: "Spanish (Español)", value: "Spanish" },
    { label: "French (Français)", value: "French" },
    { label: "German (Deutsch)", value: "German" },
  ];

  // FIX: Restores the mock selection function (to be replaced by Shopify Resource Picker later)
  const handleProductSelect = () => {
    // NOTE: Replace this mock implementation with actual Shopify Resource Picker code later
    // This mock is here to simulate user interaction and allow testing in dev environment.
    const NEW_MOCK_PRODUCT = {
        id: "gid://shopify/Product/1234567890123", 
        title: "Current Product Title for Testing",
        description: "The existing product description for AI rewriting.",
        tags: "example, tag, test",
    };
    setSelectedProduct(NEW_MOCK_PRODUCT);
  };


  return (
    <Page> 
      <Layout>
        <Layout.Section>
          <Text variant="headingLg" as="h1">
            AI Product & SEO Content Writer
          </Text>
          <p>Optimize product titles, descriptions, and meta tags instantly.</p>
        </Layout.Section>

        <Layout.Section>
            {/* Display Success Banner */}
            {actionData?.success && (
                <Banner title="Content Applied Successfully!" status="success">
                    <p>{actionData.message}</p>
                    <List type="bullet">
                        <List.Item>Product **{actionData.productName}** updated successfully!</List.Item>
                        <List.Item>New Meta Description: *"{actionData.newMetaDescription}"*</List.Item>
                    </List>
                </Banner>
            )}
            {/* Display Error Banner */}
            {actionData?.errors && actionData.errors.length > 0 && (
                <Banner title="Generation Failed" status="critical">
                    <p>One or more errors occurred:</p>
                    <List type="bullet">
                        {actionData.errors.map((error, index) => (
                            <List.Item key={index}>{error}</List.Item>
                        ))}
                    </List>
                </Banner>
            )}
        </Layout.Section>
        
        <Layout.Section>
          <Card>
            <Form method="post">
              <FormLayout>
                <Text variant="headingMd" as="h3">Product Selection</Text>
                
                {/* Button to simulate opening the ResourcePicker / Display current selection */}
                {!isProductSelected && (
                    <Button onClick={handleProductSelect} primary>
                        Select Product
                    </Button>
                )}
                
                {/* Display selected product information */}
                {isProductSelected && (
                    <TextContainer>
                        <Text variant="bodyMd" as="p">
                            **Product Selected:** {selectedProduct.title}
                        </Text>
                        <Text variant="bodySm" as="p" color="subdued">
                            ID: {selectedProduct.id} | Tags: {selectedProduct.tags}
                        </Text>
                    </TextContainer>
                )}
                
                {/* Hidden fields pass the necessary product data to the server action */}
                <input type="hidden" name="productId" value={selectedProduct?.id || ''} />
                <input type="hidden" name="productName" value={selectedProduct?.title || ''} />
                <input type="hidden" name="productDescription" value={selectedProduct?.description || ''} />
                <input type="hidden" name="productTags" value={selectedProduct?.tags || ''} />


                <Text variant="headingMd" as="h3">Content Customization</Text>

                <Select
                  label="Content Tone"
                  name="productTone"
                  options={toneOptions}
                  value={selectedTone} // Value is managed by state
                  onChange={setSelectedTone} // State handler
                  helpText="Select the voice style for the new description and meta tags."
                  requiredIndicator
                />

                {/* --- Multilingual Field --- */}
                <Select
                  label="Target Language"
                  name="targetLanguage" 
                  options={languageOptions}
                  value={targetLanguage} // Value is managed by state
                  onChange={setTargetLanguage} // State handler
                  helpText="Select the language for the AI to translate and optimize the content."
                  requiredIndicator
                />
                {/* ----------------------------- */}


                <Button 
                  submit 
                  primary 
                  disabled={isLoading || !isProductSelected} 
                  loading={isLoading}
                >
                  {isLoading ? 'Generating Content...' : 'Generate & Apply Content'}
                </Button>
              </FormLayout>
            </Form>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}