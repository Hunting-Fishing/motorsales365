import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicy() {
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
            <CardTitle className="text-3xl">Privacy Policy</CardTitle>
            <p className="text-muted-foreground">Last updated: {lastUpdated}</p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2>
              <p className="text-muted-foreground mb-2">We collect information you provide directly:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Account information (name, email, password)</li>
                <li>Company and business information</li>
                <li>Work orders, customer data, and operational records</li>
                <li>Payment and billing information</li>
                <li>Communications with our support team</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Automatically Collected Information</h2>
              <p className="text-muted-foreground mb-2">When you use our service, we automatically collect:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Device information and browser type</li>
                <li>IP address and location data</li>
                <li>Usage patterns and feature interactions</li>
                <li>Log data and error reports</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
              <p className="text-muted-foreground mb-2">We use collected information to:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Provide and maintain our services</li>
                <li>Process transactions and send related information</li>
                <li>Send technical notices and support messages</li>
                <li>Respond to your comments and questions</li>
                <li>Analyze usage to improve our services</li>
                <li>Detect and prevent fraudulent activity</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Data Sharing</h2>
              <p className="text-muted-foreground mb-2">We may share your information with:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Service providers who assist in our operations</li>
                <li>Payment processors for billing purposes</li>
                <li>Law enforcement when required by law</li>
                <li>Business partners with your consent</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                We do not sell your personal information to third parties.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Data Security</h2>
              <p className="text-muted-foreground">
                We implement appropriate technical and organizational measures to protect your data, 
                including encryption, access controls, and regular security assessments. However, 
                no method of transmission over the Internet is 100% secure.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Data Retention</h2>
              <p className="text-muted-foreground">
                We retain your information for as long as your account is active or as needed to 
                provide services. We may retain certain information as required by law or for 
                legitimate business purposes after account deletion.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Your Rights</h2>
              <p className="text-muted-foreground mb-2">Depending on your location, you may have the right to:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Access and receive a copy of your data</li>
                <li>Rectify inaccurate personal data</li>
                <li>Request deletion of your data</li>
                <li>Object to or restrict processing</li>
                <li>Data portability</li>
                <li>Withdraw consent at any time</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Cookies and Tracking</h2>
              <p className="text-muted-foreground">
                We use cookies and similar technologies to maintain sessions, remember preferences, 
                and analyze usage. You can control cookie settings through your browser, though 
                some features may not function properly without cookies.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Children's Privacy</h2>
              <p className="text-muted-foreground">
                Our service is not intended for children under 13. We do not knowingly collect 
                information from children under 13. If we learn we have collected such information, 
                we will delete it promptly.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Changes to This Policy</h2>
              <p className="text-muted-foreground">
                We may update this Privacy Policy from time to time. We will notify you of any 
                material changes by posting the new policy on this page and updating the 
                "Last updated" date.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">11. Contact Us</h2>
              <p className="text-muted-foreground">
                If you have questions about this Privacy Policy or our data practices, 
                please contact us through the support channels available in your account dashboard.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
