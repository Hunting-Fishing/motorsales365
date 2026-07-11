
import { supabase } from "@/integrations/supabase/client";
import { FeedbackResponse } from "./types";
import { toast } from "@/hooks/use-toast";

// Submit feedback response
export const submitFeedbackResponse = async (response: Omit<FeedbackResponse, 'id' | 'submitted_at' | 'created_at'>): Promise<FeedbackResponse | null> => {
  try {
    const { data, error } = await supabase
      .from('feedback_responses')
      .insert([response])
      .select()
      .single();

    if (error) throw error;
    
    // Cast the response_data to Record<string, any>
    return {
      ...data,
      response_data: data.response_data as Record<string, any>
    };
  } catch (error) {
    console.error('Error submitting feedback response:', error);
    toast({
      title: 'Error',
      description: 'Failed to submit feedback. Please try again.',
      variant: 'destructive',
    });
    return null;
  }
};

// Get feedback responses for a specific form
export const getFeedbackResponses = async (formId: string): Promise<FeedbackResponse[]> => {
  try {
    const { data, error } = await supabase
      .from('feedback_responses')
      .select('*')
      .eq('form_id', formId)
      .order('submitted_at', { ascending: false });

    if (error) throw error;
    
    // Map the responses to cast response_data to Record<string, any>
    return (data || []).map(response => ({
      ...response,
      response_data: response.response_data as Record<string, any>
    }));
  } catch (error) {
    console.error('Error fetching feedback responses:', error);
    return [];
  }
};

// Get feedback responses for a specific customer
export const getCustomerFeedbackResponses = async (customerId: string): Promise<FeedbackResponse[]> => {
  try {
    const { data, error } = await supabase
      .from('feedback_responses')
      .select('*')
      .eq('customer_id', customerId)
      .order('submitted_at', { ascending: false });

    if (error) throw error;
    
    // Map the responses to cast response_data to Record<string, any>
    return (data || []).map(response => ({
      ...response,
      response_data: response.response_data as Record<string, any>
    }));
  } catch (error) {
    console.error('Error fetching customer feedback responses:', error);
    return [];
  }
};

// Get feedback responses for a specific work order
export const getWorkOrderFeedbackResponses = async (workOrderId: string): Promise<FeedbackResponse[]> => {
  try {
    const { data, error } = await supabase
      .from('feedback_responses')
      .select('*')
      .eq('work_order_id', workOrderId)
      .order('submitted_at', { ascending: false });

    if (error) throw error;
    
    // Map the responses to cast response_data to Record<string, any>
    return (data || []).map(response => ({
      ...response,
      response_data: response.response_data as Record<string, any>
    }));
  } catch (error) {
    console.error('Error fetching work order feedback responses:', error);
    return [];
  }
};
