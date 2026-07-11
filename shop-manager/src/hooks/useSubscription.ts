import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { PRODUCT_PLAN_MAP, TierType } from '@/config/stripePricing';

export interface SubscriptionStatus {
  subscribed: boolean;
  plan: 'free' | TierType;
  productId: string | null;
  subscriptionEnd: string | null;
  loading: boolean;
  error: string | null;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus>({
    subscribed: false,
    plan: 'free',
    productId: null,
    subscriptionEnd: null,
    loading: true,
    error: null,
  });

  const checkSubscription = useCallback(async () => {
    if (!user) {
      setStatus(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      setStatus(prev => ({ ...prev, loading: true, error: null }));
      
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) throw error;
      
      setStatus({
        subscribed: data.subscribed,
        plan: data.product_id ? (PRODUCT_PLAN_MAP[data.product_id] || 'free') : 'free',
        productId: data.product_id,
        subscriptionEnd: data.subscription_end,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error checking subscription:', error);
      setStatus(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to check subscription',
      }));
    }
  }, [user]);

  const createCheckout = async (priceId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('create-subscription-checkout', {
        body: { priceId },
      });
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error creating checkout:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create checkout' 
      };
    }
  };

  const openCustomerPortal = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error opening customer portal:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to open billing portal' 
      };
    }
  };

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Auto-refresh every minute
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [user, checkSubscription]);

  return {
    ...status,
    checkSubscription,
    createCheckout,
    openCustomerPortal,
  };
};
