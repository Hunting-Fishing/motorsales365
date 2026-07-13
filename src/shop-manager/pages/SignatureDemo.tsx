import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Layout } from '@/components/layout/Layout';
import { SignaturePad } from '@/components/signature/SignaturePad';
import { CompactSignaturePad } from '@/components/signature/CompactSignaturePad';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';

export default function SignatureDemo() {
  const [signature1, setSignature1] = useState<string | null>(null);
  const [signature2, setSignature2] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSignatureSave = (signature: string, label: string) => {
    toast({
      title: "Signature Saved",
      description: `${label} has been captured successfully`,
    });
  };

  return (
    <>
      <Helmet>
        <title>Digital Signatures | All Business 365</title>
        <meta name="description" content="Capture digital signatures for work orders, inspections, and customer approvals" />
      </Helmet>
      
      <Layout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Digital Signatures</h1>
            <p className="text-muted-foreground mt-2">
              Capture customer and technician signatures for work orders, inspections, and approvals
            </p>
          </div>

          <Tabs defaultValue="full" className="w-full">
            <TabsList>
              <TabsTrigger value="full">Full Signature Pad</TabsTrigger>
              <TabsTrigger value="compact">Compact Version</TabsTrigger>
              <TabsTrigger value="multiple">Multiple Signatures</TabsTrigger>
            </TabsList>

            <TabsContent value="full" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Full-Featured Signature Pad</CardTitle>
                  <CardDescription>
                    Complete signature capture with save, clear, and download functionality
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SignaturePad
                    title="Customer Signature"
                    onSave={(sig) => {
                      setSignature1(sig);
                      handleSignatureSave(sig, "Customer signature");
                    }}
                    onClear={() => setSignature1(null)}
                    required
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="compact" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Compact Signature Pad</CardTitle>
                  <CardDescription>
                    Space-efficient version ideal for forms and mobile devices
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CompactSignaturePad
                    onChange={(sig) => {
                      setSignature2(sig);
                      if (sig) {
                        handleSignatureSave(sig, "Compact signature");
                      }
                    }}
                    value={signature2 || ''}
                    required
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="multiple" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Customer Signature</CardTitle>
                    <CardDescription>
                      Customer approval for work order
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CompactSignaturePad
                      onChange={(sig) => {
                        if (sig) handleSignatureSave(sig, "Customer");
                      }}
                      required
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Technician Signature</CardTitle>
                    <CardDescription>
                      Technician sign-off on completed work
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CompactSignaturePad
                      onChange={(sig) => {
                        if (sig) handleSignatureSave(sig, "Technician");
                      }}
                      required
                    />
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Inspector Signature</CardTitle>
                  <CardDescription>
                    Quality assurance inspection approval
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SignaturePad
                    title="Inspector Signature"
                    onSave={(sig) => handleSignatureSave(sig, "Inspector")}
                    height={150}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Card>
            <CardHeader>
              <CardTitle>Integration Examples</CardTitle>
              <CardDescription>
                Where digital signatures can be used in your workflow
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span><strong>Work Order Completion:</strong> Customer signs off on completed repairs and services</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span><strong>Safety Inspections:</strong> Inspector signatures for compliance documentation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span><strong>Vehicle Drop-off:</strong> Customer signature acknowledging vehicle condition</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span><strong>Service Agreements:</strong> Digital signing of service contracts and warranties</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span><strong>Daily Checklists:</strong> Technician sign-off on daily vehicle inspections</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span><strong>Form Submissions:</strong> Add signature fields to any custom form</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </Layout>
    </>
  );
}
