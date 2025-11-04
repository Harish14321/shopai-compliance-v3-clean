import { useState } from "react";
import { Form, useActionData, useNavigation } from "react-router-dom";
import {
  Page, // <-- CRITICAL FIX: Re-added Page to imports
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
// Links to the server action for content generation
import { generateAndApplyContent } from "../services/content_writer.server"; 
// NOTE: authenticate is not needed here as it's used inside the action function
// import { authenticate } from "../shopify.server"; 

// --------------------------------------------------------------------------
// SERVER ACTION: Handles form submission for content generation
// --------------------------------------------------------------------------
export const action = async ({ request }) => {
  const result = await generateAndApplyContent(request);
  return result; // Remix sends this result back to useActionData()
};

// --------------------------------------------------------------------------
// CLIENT COMPONENT: Content Writer Form
// --------------------------------------------------------------------------
export default function ContentWriterPage() {
  const actionData = useActionData();
  const navigation = useNavigation();
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [tone, setTone] = useState("Professional");
  
  const isLoading = navigation.state === 'submitting';
  
  // Options based on your project plan
  const toneOptions = [
    { label: "Professional", value: "Professional" },
    { label: "Casual & Witty", value: "Casual" },
    { label: "Luxury & Exclusive", value: "Luxury" },
    { label: "Minimalist & Direct", value: "Minimalist" },
  ];

  // Placeholder function for product selection. 
  // In a real app, this would open the Shopify ResourcePicker.
  const handleProductSelect = () => {
    // Simulate selecting a product for demonstration purposes
    setSelectedProduct({
        id: "gid://shopify/Product/1234567890123", // Mock Product GID
        title: "The Ultimate Ergonomic Office Chair",
        description: "A comfortable and adjustable chair designed for long hours of productivity. Features lumbar support and breathable mesh.",
        tags: "office, ergonomic, chair, comfort, wfh",
    });
  };
  
  const isProductSelected = !!selectedProduct;


  return (
    // CRITICAL FIX: Wrapping the Layout in <Page> restores the Polaris context
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
            {/* Form uses method="post" to trigger the exported action function */}
            <Form method="post">
              <FormLayout>
                <Text variant="headingMd" as="h3">Product Selection</Text>
                
                {/* Button to simulate opening the ResourcePicker */}
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
                
                {/* Hidden fields to pass necessary product data to the server action */}
                <input type="hidden" name="productId" value={selectedProduct?.id || ''} />
                <input type="hidden" name="productName" value={selectedProduct?.title || ''} />
                <input type="hidden" name="productDescription" value={selectedProduct?.description || ''} />
                <input type="hidden" name="productTags" value={selectedProduct?.tags || ''} />


                <Text variant="headingMd" as="h3">Content Customization</Text>

                <Select
                  label="Content Tone"
                  name="productTone"
                  options={toneOptions}
                  onChange={setTone}
                  value={tone}
                  helpText="Select the voice style for the new description and meta tags."
                  requiredIndicator
                />

                <Button 
                  submit 
                  primary 
                  disabled={isLoading || !isProductSelected} // Disable if loading or no product selected
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