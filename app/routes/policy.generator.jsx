import { useActionData, useNavigation, Form } from "react-router-dom"; 
import {
  Page, // <-- CRITICAL FIX: Re-added Page to imports
  Layout,
  Card,
  Text,
  TextField,
  Select,
  Button,
  FormLayout,
  Banner,
  List
} from "@shopify/polaris";
import { generateAndApplyPolicies } from "../services/policy_generator.server"; 
// NOTE: authenticate is not needed here as it's used inside the action function
// import { authenticate } from "../shopify.server";

// --------------------------------------------------------------------------
// SERVER ACTION: Handles form submission for policy generation
// --------------------------------------------------------------------------
export const action = async ({ request }) => {
  const result = await generateAndApplyPolicies(request);
  return result; // Remix sends this result back to useActionData()
};

// --------------------------------------------------------------------------
// CLIENT COMPONENT: Policy Generation Form
// --------------------------------------------------------------------------
export default function PolicyGeneratorPage() {
  const actionData = useActionData(); // Data returned by the action function
  const navigation = useNavigation(); // State of the current navigation/submission
  
  const isLoading = navigation.state === 'submitting';

  const jurisdictionOptions = [
    { label: "United States (Standard)", value: "US_Standard" },
    { label: "European Union (GDPR)", value: "EU_GDPR" },
    { label: "California (CCPA)", value: "US_CCPA" },
    { label: "India (PDPB)", value: "IN_PDPB" },
  ];

  return (
    // CRITICAL FIX: Wrapping the Layout in <Page> restores the Polaris context
    <Page> 
      <Layout>
        <Layout.Section>
          <Text variant="headingLg" as="h1">
            AI Policy Generator
          </Text>
          <p>Generate compliant Privacy Policy & Terms of Service using Gemini.</p>
        </Layout.Section>

        <Layout.Section>
            {/* Display Success Banner */}
            {actionData?.success && (
                <Banner title="Policies Generated Successfully!" status="success">
                    <p>
                        The following pages were created on your Shopify store. You can now link them in your store's navigation menus.
                    </p>
                    <List type="bullet">
                        {/* Map through the results returned from the server action */}
                        {actionData.policyResults.map((res, index) => (
                            <List.Item key={index}>
                                **{res.policy}**: <a href={res.url} target="_blank">{res.url}</a>
                            </List.Item>
                        ))}
                    </List>
                </Banner>
            )}
            {/* Display Error Banner */}
            {actionData?.errors && actionData.errors.length > 0 && (
                 <Banner title="Generation Failed" status="critical">
                    <p>One or more errors occurred during generation or saving:</p>
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
                <Text variant="headingMd" as="h3">Business Details</Text>
                
                {/* Text fields map directly to server action's Form Data keys */}
                <TextField
                  label="Business Name"
                  name="businessName"
                  placeholder="e.g., Shopi-Compliance Inc."
                  requiredIndicator
                  autoComplete="organization"
                />
                <TextField
                  label="Contact Email"
                  name="contactEmail"
                  placeholder="support@shopicompliance.com"
                  type="email"
                  requiredIndicator
                  autoComplete="email"
                />
                <Select
                  label="Primary Jurisdiction"
                  name="jurisdiction"
                  options={jurisdictionOptions}
                  helpText="Select the jurisdiction your business primarily operates in (e.g., for GDPR/CCPA compliance)."
                  requiredIndicator
                />
                <TextField
                  label="Refund Period (Days)"
                  name="refundDays"
                  placeholder="30"
                  type="number"
                  requiredIndicator
                />

                <Button 
                  submit 
                  primary 
                  disabled={isLoading} // Disable button while submitting
                  loading={isLoading} // Show loading spinner
                >
                  {isLoading ? 'Generating Policies...' : 'Generate & Apply Policies'}
                </Button>
              </FormLayout>
            </Form>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}