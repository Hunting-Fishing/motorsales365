
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface SmsTemplate {
  id: string;
  name: string;
  content: string;
  category?: string;
}

interface SendSmsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
  phoneNumber: string;
  workOrderId?: string;
  onSuccess: () => void;
}

export function SendSmsDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
  phoneNumber,
  workOrderId,
  onSuccess
}: SendSmsDialogProps) {
  const [message, setMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open]);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('sms_templates')
        .select('*')
        .order('name');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching SMS templates:', error);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      // Replace placeholders in template
      let content = template.content;
      content = content.replace(/\{customer_name\}/g, customerName);
      content = content.replace(/\{work_order_id\}/g, workOrderId || '');
      setMessage(content);
    }
  };

  const handleSend = async () => {
    if (!message.trim()) {
      toast({
        title: "Error",
        description: "Please enter a message",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      // Send SMS via Supabase function
      const { data: smsResult, error: smsError } = await supabase.functions.invoke('send-sms', {
        body: {
          phoneNumber: phoneNumber,
          message: message,
          customerId: customerId,
          templateId: selectedTemplate || null
        }
      });

      if (smsError) throw smsError;

      // Record communication in database
      const { error: recordError } = await supabase
        .from('customer_communications')
        .insert({
          customer_id: customerId,
          type: 'text',
          direction: 'outbound',
          content: message,
          staff_member_id: 'current-user', // This would be the actual user ID
          staff_member_name: 'Current User', // This would be the actual user name
          status: smsResult.success ? 'sent' : 'failed',
          template_id: selectedTemplate || null,
          template_name: selectedTemplate ? templates.find(t => t.id === selectedTemplate)?.name : null
        });

      if (recordError) throw recordError;

      toast({
        title: "SMS Sent",
        description: `Message sent to ${customerName}`,
      });

      onSuccess();
      onOpenChange(false);
      setMessage('');
      setSelectedTemplate('');
    } catch (error) {
      console.error('Error sending SMS:', error);
      toast({
        title: "Error",
        description: "Failed to send SMS",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Send SMS to {customerName}
          </DialogTitle>
          <DialogDescription>
            Phone: {phoneNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="template">Use Template (Optional)</Label>
            <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              rows={4}
              className="resize-none"
            />
            <div className="text-xs text-muted-foreground mt-1">
              {message.length}/160 characters
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={sending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={sending || !message.trim()}
            >
              <Send className="h-4 w-4 mr-2" />
              {sending ? 'Sending...' : 'Send SMS'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
