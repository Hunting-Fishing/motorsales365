
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface RecordCommunicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  workOrderId?: string;
  onSuccess: () => void;
}

export function RecordCommunicationDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
  customerEmail,
  customerPhone,
  workOrderId,
  onSuccess
}: RecordCommunicationDialogProps) {
  const [type, setType] = useState<string>('');
  const [direction, setDirection] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!type || !direction || !content.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('customer_communications')
        .insert({
          customer_id: customerId,
          type: type as 'email' | 'phone' | 'text' | 'in-person',
          direction: direction as 'inbound' | 'outbound',
          subject: subject.trim() || null,
          content: content.trim(),
          staff_member_id: 'current-user', // This would be the actual user ID
          staff_member_name: 'Current User', // This would be the actual user name
          status: 'completed'
        });

      if (error) throw error;

      toast({
        title: "Communication Recorded",
        description: "Communication has been saved successfully",
      });

      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setType('');
      setDirection('');
      setSubject('');
      setContent('');
    } catch (error) {
      console.error('Error recording communication:', error);
      toast({
        title: "Error",
        description: "Failed to record communication",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Record Communication with {customerName}
          </DialogTitle>
          <DialogDescription>
            Record a communication that has already taken place
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">Communication Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="phone">Phone Call</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="text">Text/SMS</SelectItem>
                  <SelectItem value="in-person">In-Person</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="direction">Direction</Label>
              <Select value={direction} onValueChange={setDirection}>
                <SelectTrigger>
                  <SelectValue placeholder="Select direction" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inbound">Inbound (Customer to Us)</SelectItem>
                  <SelectItem value="outbound">Outbound (Us to Customer)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="subject">Subject (Optional)</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter subject or brief description"
            />
          </div>

          <div>
            <Label htmlFor="content">Communication Details *</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Describe what was discussed, any decisions made, follow-up actions, etc."
              rows={6}
              className="resize-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !type || !direction || !content.trim()}
            >
              {saving ? 'Saving...' : 'Save Communication'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
