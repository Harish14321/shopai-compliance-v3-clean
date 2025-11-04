import { useActionData, useNavigation, Form } from "react-router-dom"; 
// Note: We import the action function from the SERVICES directory.
import { generateAndApplyPolicies } from "../services/policy_generator.server"; 
import { 
  Page, 
  Layout,
  Card,
  Text,
  Button,
  FormLayout,
  Banner,
  List
} from "@shopify/polaris";

// --------------------------------------------------------------------------
// SERVER ACTION: This function runs on the server and calls the server service
// --------------------------------------------------------------------------
export const action = async ({ request }) => {
  const result = await generateAndApplyPolicies(request);
  return result; 
};

// --------------------------------------------------------------------------
// CLIENT COMPONENT: Policy Generation Form (Mock Data UI)
// --------------------------------------------------------------------------
export default function PolicyGeneratorPage() {
  const actionData = useActionData(); 
  const navigation = useNavigation(); 
  const isLoading = navigation.state === 'submitting';
  
  // MOCK DATA (Kept in the client file for display and form submission)
  const mockData = {
      businessName: "ShopAI Test Company",
      contactEmail: "support@shopaitest.com",
      jurisdiction: "EU_GDPR", 
      refundDays: "45"
  };

  return (
    <Page> 
      <Layout>
        {/* ... (UI and Banner logic remains the same) ... */}
        <Layout.Section>
          <Text variant="headingLg" as="h1">AI Policy Generator</Text>
          <p>Generate compliant Privacy Policy & Terms of Service using Gemini.</p>
        </Layout.Section>

        <Layout.Section>
            {/* Display Banners (Success/Error) */}
            {actionData?.success && ( <Banner title="Policies Generated Successfully!" status="success">...</Banner> )}
            {actionData?.errors && actionData.errors.length > 0 && ( <Banner title="Generation Failed" status="critical">...</Banner> )}
        </Layout.Section>
        
        <Layout.Section>
          <Card>
            <Form method="post">
              <FormLayout>
                <Text variant="headingMd" as="h3">Business Details</Text>
                
                {/* --------------------------------------------- */}
                {/* CRITICAL FIX: HIDDEN INPUTS FOR MOCK SUBMISSION */}
                {/* --------------------------------------------- */}
                
                <input type="hidden" name="businessName" value={mockData.businessName} />
                <input type="hidden" name="contactEmail" value={mockData.contactEmail} />
                <input type="hidden" name="jurisdiction" value={mockData.jurisdiction} />
                <input type="hidden" name="refundDays" value={mockData.refundDays} />

                {/* VISIBLE OUTPUT: Shows user what is being submitted */}
                <Text variant="bodyMd" as="p">
                    **Submission Status:** Mock data is active. Click below to test API connection.
                </Text>
                <List type="bullet">
                    <List.Item>Business Name: **{mockData.businessName}**</List.Item>
                    <List.Item>Jurisdiction: **{mockData.jurisdiction}** (EU_GDPR)</List.Item>
                    <List.Item>Refund Days: **{mockData.refundDays}**</List.Item>
                </List>
                <hr style={{ margin: '1rem 0'}} />
                
                <Button 
                  submit 
                  primary 
                  disabled={isLoading}
                  loading={isLoading}
                >
                  {isLoading ? 'Generating Policies...' : 'Generate & APPLY POLICIES (Test Gemini)'}
                </Button>
              </FormLayout>
            </Form>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}