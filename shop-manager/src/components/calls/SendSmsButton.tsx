import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { sendSms } from '@/services/calls/callService';
import { recordSmsActivity } from '@/utils/activity/communicationActivity';

interface SendSmsButtonProps {
  phoneNumber: string;
  message: string;
  customerId?: string;
  templateId?: string;
  workOrderId?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  disabled?: boolean;
}

export const SendSmsButton = ({
  phoneNumber,
  message,
  customerId,
  templateId,
  workOrderId,
  variant = 'outline',
  size = 'sm',
  className = '',
  disabled = false
}: SendSmsButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSendSms = async () => {
    if (!phoneNumber || !message) {
      toast({
        title: "Error",
        description: "Phone number and message are required",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await sendSms({
        phone_number: phoneNumber,
        message: message,
        customer_id: customerId,
        template_id: templateId
      });

      // Record the SMS activity in work order history if applicable
      if (workOrderId) {
        try {
          await recordSmsActivity(
            workOrderId,
            phoneNumber,
            message,
            "user-123", // This would be the actual user ID in a real app
            "System User" // This would be the actual user name in a real app
          );
        } catch (activityError) {
          console.error("Error recording SMS activity:", activityError);
        }
      }

      toast({
        title: "SMS sent",
        description: "The SMS message has been sent successfully",
      });
    } catch (error) {
      console.error("Error sending SMS:", error);
      toast({
        title: "SMS failed",
        description: "Could not send the SMS. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleSendSms}
      disabled={disabled || isLoading}
    >
      <MessageSquare className="h-4 w-4 mr-2" />
      {isLoading ? "Sending..." : "Send SMS"}
    </Button>
  );
};
