
import React, { useState } from 'react';
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
import { Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface MakeCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
  phoneNumber: string;
  workOrderId?: string;
  onSuccess: () => void;
}

export function MakeCallDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
  phoneNumber,
  workOrderId,
  onSuccess
}: MakeCallDialogProps) {
  const [callType, setCallType] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [calling, setCalling] = useState(false);

  const handleInitiateCall = async () => {
    if (!callType) {
      toast({
        title: "Error",
        description: "Please select a call type",
        variant: "destructive",
      });
      return;
    }

    setCalling(true);
    try {
      // Initiate call via Supabase function
      const { data: callResult, error: callError } = await supabase.functions.invoke('voice-call', {
        body: {
          action: 'initiate_call',
          phone_number: phoneNumber,
          call_type: callType,
          customer_id: customerId,
          notes: notes
        }
      });

      if (callError) throw callError;

      // Record communication in database
      const { error: recordError } = await supabase
        .from('customer_communications')
        .insert({
          customer_id: customerId,
          type: 'phone',
          direction: 'outbound',
          subject: `${callType.replace('_', ' ')} call`,
          content: notes || `Initiated ${callType.replace('_', ' ')} call to customer`,
          staff_member_id: 'current-user', // This would be the actual user ID
          staff_member_name: 'Current User', // This would be the actual user name
          status: 'completed'
        });

      if (recordError) throw recordError;

      toast({
        title: "Call Initiated",
        description: `Call initiated to ${customerName}`,
      });

      onSuccess();
      onOpenChange(false);
      setCallType('');
      setNotes('');
    } catch (error) {
      console.error('Error initiating call:', error);
      toast({
        title: "Error",
        description: "Failed to initiate call",
        variant: "destructive",
      });
    } finally {
      setCalling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Make Call to {customerName}
          </DialogTitle>
          <DialogDescription>
            Phone: {phoneNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="call-type">Call Type</Label>
            <Select value={callType} onValueChange={setCallType}>
              <SelectTrigger>
                <SelectValue placeholder="Select call type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="appointment_reminder">Appointment Reminder</SelectItem>
                <SelectItem value="service_update">Service Update</SelectItem>
                <SelectItem value="satisfaction_survey">Satisfaction Survey</SelectItem>
                <SelectItem value="follow_up">Follow Up</SelectItem>
                <SelectItem value="general">General Inquiry</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Call Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this call..."
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={calling}
            >
              Cancel
            </Button>
            <Button
              onClick={handleInitiateCall}
              disabled={calling || !callType}
            >
              <Phone className="h-4 w-4 mr-2" />
              {calling ? 'Calling...' : 'Initiate Call'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
