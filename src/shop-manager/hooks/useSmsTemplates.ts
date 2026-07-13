
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SmsTemplate {
  id: string;
  name: string;
  content: string;
  category?: string;
  description?: string;
}

export const useSmsTemplates = (enabled = true) => {
  return useQuery({
    queryKey: ['smsTemplates'],
    queryFn: async (): Promise<SmsTemplate[]> => {
      const { data, error } = await supabase.from('sms_templates').select('*');
      if (error) throw error;
      return data || [];
    },
    enabled,
  });
};

// SMS sending via Twilio edge function
export const sendSms = async (
  customerId: string, 
  phoneNumber: string, 
  message: string, 
  templateId?: string
) => {
  // Log the attempt to SMS logs table with pending status
  const { data: smsLog, error } = await supabase.from('sms_logs').insert({
    customer_id: customerId,
    phone_number: phoneNumber,
    message: message,
    template_id: templateId || null,
    status: 'pending'
  }).select('id').single();
  
  if (error) throw error;
  
  // Call the Twilio edge function
  const { data, error: functionError } = await supabase.functions.invoke('send-sms', {
    body: {
      phoneNumber,
      message,
      customerId,
      templateId,
      smsLogId: smsLog?.id
    }
  });
  
  if (functionError) {
    // Update log status to failed
    await supabase.from('sms_logs').update({ status: 'failed' }).eq('id', smsLog?.id);
    throw functionError;
  }
  
  return data;
};
