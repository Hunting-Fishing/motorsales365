
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Sparkles } from 'lucide-react';
import { EmailABTestVariant } from '@/types/email';

interface EmailTestFormProps {
  campaignId?: string;
  subject: string;
  content: string;
  variants?: EmailABTestVariant[];
  onClose?: () => void;
}

export function EmailTestForm({ campaignId, subject, content, variants, onClose }: EmailTestFormProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [includeTracking, setIncludeTracking] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<string | undefined>(undefined);
  const { toast } = useToast();

  const sendTestEmail = async () => {
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter a recipient email address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Determine which content to send
      let testContent = content;
      let testSubject = subject;

      // If a variant is selected, use its content and subject
      if (selectedVariant && variants) {
        const variant = variants.find(v => v.id === selectedVariant);
        if (variant) {
          testContent = variant.content;
          testSubject = variant.subject;
        }
      }

      const response = await fetch('/api/functions/v1/send-test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          subject: testSubject,
          content: testContent,
          includeTracking,
          campaignId,
          abTestVariantId: selectedVariant
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send test email');
      }

      toast({
        title: "Test Email Sent",
        description: `A test email has been sent to ${email}`,
      });

      // Close the form if onClose handler is provided
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to send test email",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Send Test Email
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="test-email">Recipient Email</Label>
          <Input
            id="test-email"
            type="email"
            placeholder="Enter email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <p className="text-sm text-muted-foreground mt-1">
            This is where the test email will be sent
          </p>
        </div>

        {variants && variants.length > 0 && (
          <div>
            <Label htmlFor="variant-select">Test A/B Variant (Optional)</Label>
            <Select value={selectedVariant} onValueChange={setSelectedVariant}>
              <SelectTrigger id="variant-select">
                <SelectValue placeholder="Select a variant to test" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="undefined">Default (Original)</SelectItem>
                {variants.map((variant) => (
                  <SelectItem key={variant.id} value={variant.id}>
                    {variant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-1">
              Choose which variant you want to test
            </p>
          </div>
        )}

        <div className="flex items-start space-x-2 pt-2">
          <Checkbox
            id="tracking"
            checked={includeTracking}
            onCheckedChange={(checked) => setIncludeTracking(checked as boolean)}
          />
          <div className="grid gap-1.5 leading-none">
            <Label htmlFor="tracking" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Include tracking pixels
            </Label>
            <p className="text-sm text-muted-foreground">
              Test open and click tracking functionality
            </p>
          </div>
        </div>
      </CardContent>
      <Separator />
      <CardFooter className="flex justify-between py-4">
        <Button variant="outline" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={sendTestEmail} disabled={loading || !email}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Send Test
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
