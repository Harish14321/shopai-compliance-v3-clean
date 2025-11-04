import { useLoaderData, Link } from "react-router-dom"; 
import {
  Page, 
  Layout,
  Card,
  Text,
  Badge,
  List,
  Button,
  Grid,
} from "@shopify/polaris";
import { runStoreAudit } from "../services/auditor.server";
// REMOVED: import { useAppBridge } from "@shopify/app-bridge-react"; 
// REMOVED: import { Redirect } from "@shopify/app-bridge/actions"; 


// Component to display an individual score
function ScoreCard({ title, score, status, description }) {
  return (
    <Card sectioned>
      <Text variant="headingMd" as="h3" color="subdued">
        {title}
      </Text>
      <div style={{ marginTop: '8px', marginBottom: '8px' }}>
        <Text variant="heading3xl" as="p">
          <Badge status={status}>{score}%</Badge>
        </Text>
      </div>
      <Text variant="bodyMd" as="p" color="subdued">
        {description}
      </Text>
    </Card>
  );
}

// The loader function returns the raw data object
export const loader = async ({ request }) => {
  const auditResult = await runStoreAudit(request);
  return auditResult;
};

export default function Index() {
  const { auditData, errors: loaderErrors } = useLoaderData() || {};
  
  const getScoreStatus = (score) => {
    if (score >= 80) return "success";
    if (score >= 50) return "attention";
    return "critical";
  };
  
  // Placeholder for audit data
  const initialAuditData = {
    totalScore: 25, 
    complianceScore: 25, 
    seoScore: 0, 
    recommendations: ["Missing critical policy: Refund Policy.", "Missing critical policy: Shipping Policy."],
    errors: [],
  };

  const data = auditData || initialAuditData;
  const errors = loaderErrors || data.errors;
  const totalStatus = getScoreStatus(data.totalScore);


  // REMOVED: App Bridge Navigation handlers (useAppBridge, redirect, navigateTo...)
  // We rely entirely on the Remix <Link> component now.


  return (
    <Page> 
      <Layout>
        
        {/* --- Header & Title --- */}
        <Layout.Section>
          <Text variant="headingXl" as="h1">
            ShopAI Store Health Overview
          </Text>
          <Text variant="bodyMd" as="p" color="subdued">
             Your unified view for compliance status and content optimization opportunities.
          </Text>
        </Layout.Section>

        {/* --- 1. Consolidated Scorecard Grid --- */}
        <Layout.Section>
          <Card>
             <Grid>
                <Grid.Cell columnSpan={{xs: 6, sm: 6, md: 4, lg: 4, xl: 4}}>
                   <ScoreCard 
                      title="Overall Health Score"
                      score={data.totalScore}
                      status={totalStatus}
                      description="Combined score for legal and content health."
                   />
                </Grid.Cell>
                <Grid.Cell columnSpan={{xs: 6, sm: 6, md: 4, lg: 4, xl: 4}}>
                   <ScoreCard 
                      title="Compliance Score"
                      score={data.complianceScore}
                      status={getScoreStatus(data.complianceScore)}
                      description="Based on the presence and completeness of legal pages."
                   />
                </Grid.Cell>
                 <Grid.Cell columnSpan={{xs: 6, sm: 6, md: 4, lg: 4, xl: 4}}>
                   <ScoreCard 
                      title="SEO Content Score"
                      score={data.seoScore}
                      status={getScoreStatus(data.seoScore)}
                      description="Measures product content quality and meta tag usage."
                   />
                </Grid.Cell>
             </Grid>
          </Card>
        </Layout.Section>

        {/* --- 2. Actionable Recommendations --- */}
        <Layout.Section>
            {(data.recommendations && data.recommendations.length > 0) && (
                <Card title="Actionable Recommendations" sectioned>
                    <List type="bullet">
                        {data.recommendations.map((rec, index) => (<List.Item key={index}>{rec}</List.Item>))}
                    </List>
                    
                    <div style={{ marginTop: '20px' }}>
                        
                        {/* Use Link component for reliable client-side navigation */}
                        {data.recommendations.some(r => r.includes('Policy')) && (
                            <Link to="/policy/generator" style={{ textDecoration: 'none', marginRight: '8px' }}>
                                <Button primary>Fix Policies Now</Button>
                            </Link>
                        )}
                        {data.recommendations.some(r => r.includes('SEO')) && (
                            <Link to="/content/writer" style={{ textDecoration: 'none' }}>
                                <Button primary>Optimize Content</Button>
                            </Link>
                        )}
                    </div>
                </Card>
            )}
            
            {errors && errors.length > 0 && (
                <Card title="System Alert" sectioned status="critical">
                    <Text variant="headingMd" as="h3" color="critical">
                        Audit Failed
                    </Text>
                    <Text variant="bodyMd" as="p">
                        The audit could not be completed due to a system error. Please try refreshing or ensure your app is authorized.
                        <br/>
                        <span style={{color: 'gray', fontSize: '0.8rem'}}>Error Detail: {errors.join(', ')}</span>
                    </Text>
                </Card>
            )}
            
        </Layout.Section>
        
        {/* --- 3. Feature Cards --- */}
        <Layout.Section oneHalf>
          <Card title="Policy Generator" sectioned>
            <p>Generate legally sound Privacy, Terms, and Refund policies instantly, compliant with GDPR and CCPA.</p>
            <Link to="/policy/generator" 
                  style={{ textDecoration: 'none' }}>
                <Button primary fullWidth>
                    Start Policy Generation
                </Button>
            </Link>
          </Card>
        </Layout.Section>
        
        <Layout.Section oneHalf>
          <Card title="Content Writer" sectioned>
            <p>Use AI to generate SEO-optimized product titles, descriptions, and meta tags with a custom brand tone.</p>
            <Link to="/content/writer" 
                  style={{ textDecoration: 'none' }}>
                <Button primary fullWidth>
                    Start Content Optimization
                </Button>
            </Link>
          </Card>
        </Layout.Section>

      </Layout>
    </Page>
  );
}