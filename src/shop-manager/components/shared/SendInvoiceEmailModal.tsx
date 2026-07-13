import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Loader2, Paperclip, AlertCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SendInvoiceEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: {
    id: string;
    invoice_number: string;
    total: number;
    due_date?: string;
  };
  customer: {
    name: string;
    email: string;
  };
  invoiceType: 'standard' | 'power_washing' | 'gunsmith';
  companyName?: string;
  pdfBase64?: string;
  onSuccess?: () => void;
}

export function SendInvoiceEmailModal({
  isOpen,
  onClose,
  invoice,
  customer,
  invoiceType,
  companyName = 'Our Company',
  pdfBase64,
  onSuccess
}: SendInvoiceEmailModalProps) {
  const [loading, setLoading] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState(customer.email || '');
  const [subject, setSubject] = useState(`Invoice ${invoice.invoice_number} from ${companyName}`);
  const [message, setMessage] = useState(
    `Please find attached your invoice ${invoice.invoice_number}.\n\nIf you have any questions regarding this invoice, please don't hesitate to reach out.\n\nThank you for your business!`
  );

  const handleSend = async () => {
    if (!recipientEmail) {
      toast({
        title: 'Email Required',
        description: 'Please enter a recipient email address.',
        variant: 'destructive',
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-invoice-email', {
        body: {
          invoiceId: invoice.id,
          invoiceType,
          recipientEmail,
          recipientName: customer.name,
          subject,
          message,
          invoiceNumber: invoice.invoice_number,
          invoiceTotal: invoice.total,
          invoiceDueDate: invoice.due_date,
          companyName,
          pdfBase64
        }
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: 'Invoice Sent',
        description: `Invoice ${invoice.invoice_number} has been emailed to ${recipientEmail}.`,
      });

      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Error sending invoice email:', error);
      toast({
        title: 'Failed to Send Invoice',
        description: error.message || 'An error occurred while sending the invoice.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Send Invoice via Email
          </DialogTitle>
          <DialogDescription>
            Send invoice {invoice.invoice_number} to the customer via email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="recipientEmail">Recipient Email</Label>
            <Input
              id="recipientEmail"
              type="email"
              placeholder="customer@example.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
            />
            {!customer.email && (
              <p className="text-xs text-muted-foreground">
                No email on file for this customer. Please enter an email address.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject Line</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Invoice subject..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Email Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              rows={5}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              This message will appear in the email body along with the invoice details.
            </p>
          </div>

          {pdfBase64 ? (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
              <Paperclip className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                Invoice-{invoice.invoice_number}.pdf will be attached
              </span>
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Invoice details will be included in the email body. Generate a PDF first to include it as an attachment.
              </AlertDescription>
            </Alert>
          )}

          <div className="bg-muted/50 p-3 rounded-md space-y-1">
            <p className="text-sm font-medium">Invoice Summary</p>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Invoice #:</span>
              <span>{invoice.invoice_number}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-medium">${invoice.total?.toFixed(2)}</span>
            </div>
            {invoice.due_date && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Due Date:</span>
                <span>{invoice.due_date}</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Send Invoice
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
