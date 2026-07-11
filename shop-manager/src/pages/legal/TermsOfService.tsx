import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TermsOfService() {
  const navigate = useNavigate();
  const lastUpdated = 'December 17, 2024';

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Terms of Service</CardTitle>
            <p className="text-muted-foreground">Last updated: {lastUpdated}</p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground">
                By accessing or using our service, you agree to be bound by these Terms of Service. 
                If you do not agree to these terms, please do not use our service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
              <p className="text-muted-foreground">
                Our platform provides fleet management, work order tracking, safety compliance, 
                and business operations tools. We reserve the right to modify, suspend, or 
                discontinue any aspect of the service at any time.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. User Accounts</h2>
              <p className="text-muted-foreground">
                You are responsible for maintaining the confidentiality of your account credentials 
                and for all activities that occur under your account. You must notify us immediately 
                of any unauthorized use of your account.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Subscription and Billing</h2>
              <p className="text-muted-foreground">
                Paid subscriptions are billed in advance on a monthly or annual basis. 
                Subscription fees are non-refundable except as required by law. 
                You may cancel your subscription at any time through your account settings.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. User Content</h2>
              <p className="text-muted-foreground">
                You retain ownership of content you upload to the service. By uploading content, 
                you grant us a license to use, store, and process that content to provide our services. 
                You are responsible for ensuring you have the right to upload any content.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Prohibited Conduct</h2>
              <p className="text-muted-foreground">
                You agree not to: violate any laws or regulations; infringe on intellectual property rights; 
                transmit malicious code; attempt to gain unauthorized access; use the service for any 
                illegal or harmful purpose; or interfere with the proper functioning of the service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Limitation of Liability</h2>
              <p className="text-muted-foreground">
                To the maximum extent permitted by law, we shall not be liable for any indirect, 
                incidental, special, consequential, or punitive damages, or any loss of profits or revenues, 
                whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Indemnification</h2>
              <p className="text-muted-foreground">
                You agree to indemnify and hold us harmless from any claims, damages, losses, or expenses 
                arising from your use of the service or violation of these terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Changes to Terms</h2>
              <p className="text-muted-foreground">
                We reserve the right to modify these terms at any time. We will notify users of any 
                material changes via email or through the service. Continued use of the service after 
                changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Contact Information</h2>
              <p className="text-muted-foreground">
                If you have any questions about these Terms of Service, please contact us through 
                the support channels available in your account dashboard.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
