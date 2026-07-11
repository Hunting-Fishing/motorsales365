import { supabase } from '@/integrations/supabase/client';

export interface CheckoutSessionData {
  sessionId: string;
  url: string;
}

export const createCheckoutSession = async (orderData: {
  orderId: string;
  amount: number;
  currency?: string;
  lineItems?: any[];
}): Promise<CheckoutSessionData> => {
  try {
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: orderData
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};

export const verifyCheckoutSession = async (sessionId: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('verify-checkout-session', {
      body: { sessionId }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error verifying checkout session:', error);
    throw error;
  }
};