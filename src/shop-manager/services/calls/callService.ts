
import { supabase } from "@/integrations/supabase/client";

interface CallParams {
  phone_number: string;
  call_type: 'appointment_reminder' | 'service_update' | 'satisfaction_survey';
  customer_id?: string;
  notes?: string;
}

interface SmsParams {
  phone_number: string;
  message: string;
  customer_id?: string;
  template_id?: string;
}

export const initiateVoiceCall = async (params: CallParams) => {
  try {
    // Log the call attempt to the database first
    const { data: callLog, error: logError } = await supabase
      .from('call_logs')
      .insert({
        customer_id: params.customer_id,
        phone_number: params.phone_number,
        call_type: params.call_type,
        call_direction: 'outbound',
        call_status: 'initiated',
        caller_id: 'system',
        caller_name: 'Auto Shop',
        notes: params.notes,
        call_started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (logError) throw logError;

    // Initiate the actual call through edge function
    const { data, error } = await supabase.functions.invoke('voice-call', {
      body: {
        action: 'initiate_call',
        phone_number: params.phone_number,
        call_type: params.call_type,
        customer_id: params.customer_id,
        notes: params.notes,
        call_log_id: callLog.id
      },
    });

    if (error) {
      // Update call log with error status
      await supabase
        .from('call_logs')
        .update({ 
          call_status: 'failed',
          notes: `${params.notes || ''} - Call failed: ${error.message}`,
          call_ended_at: new Date().toISOString()
        })
        .eq('id', callLog.id);
      throw error;
    }

    console.log('Voice call initiated:', data);
    return { ...data, callLogId: callLog.id };
  } catch (error) {
    console.error('Error initiating call:', error);
    throw error;
  }
};

export const sendSms = async (params: SmsParams) => {
  try {
    // Log the SMS attempt to the database first
    const { data: callLog, error: logError } = await supabase
      .from('call_logs')
      .insert({
        customer_id: params.customer_id,
        phone_number: params.phone_number,
        call_type: 'sms',
        call_direction: 'outbound',
        call_status: 'initiated',
        caller_id: 'system',
        caller_name: 'Auto Shop',
        notes: `SMS: ${params.message}`,
        call_started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (logError) throw logError;

    // Send the actual SMS through edge function
    const { data, error } = await supabase.functions.invoke('voice-call', {
      body: {
        action: 'send_sms',
        phone_number: params.phone_number,
        message: params.message,
        customer_id: params.customer_id,
        template_id: params.template_id,
        call_log_id: callLog.id
      },
    });

    if (error) {
      // Update call log with error status
      await supabase
        .from('call_logs')
        .update({ 
          call_status: 'failed',
          notes: `SMS: ${params.message} - Failed: ${error.message}`,
          call_ended_at: new Date().toISOString()
        })
        .eq('id', callLog.id);
      throw error;
    }

    // Update call log with success status
    await supabase
      .from('call_logs')
      .update({ 
        call_status: 'completed',
        call_ended_at: new Date().toISOString()
      })
      .eq('id', callLog.id);

    console.log('SMS sent:', data);
    return { ...data, callLogId: callLog.id };
  } catch (error) {
    console.error('Error sending SMS:', error);
    throw error;
  }
};

export const getCallHistory = async (customerId: string) => {
  try {
    const { data, error } = await supabase
      .from('call_logs')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching call history:', error);
    throw error;
  }
};

// Add a type for the VoiceCallType
export type VoiceCallType = 'appointment_reminder' | 'service_update' | 'satisfaction_survey';
