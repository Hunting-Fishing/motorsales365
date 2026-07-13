import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useShopId } from './useShopId';
import { useToast } from './use-toast';
import type { PayPeriod } from '@/types/phase5';

export function usePayPeriods() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [payPeriods, setPayPeriods] = useState<PayPeriod[]>([]);

  useEffect(() => {
    if (shopId) {
      fetchPayPeriods();
    }
  }, [shopId]);

  const fetchPayPeriods = async () => {
    if (!shopId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pay_periods')
        .select('*')
        .eq('shop_id', shopId)
        .order('start_date', { ascending: false });

      if (error) throw error;
      setPayPeriods(data as any || []); // Cast to handle status enum mismatch
    } catch (error: any) {
      console.error('Error fetching pay periods:', error);
      toast({
        title: 'Error',
        description: 'Failed to load pay periods',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const createPayPeriod = async (payPeriod: Partial<PayPeriod>) => {
    if (!shopId) return;

    try {
      const { data, error } = await supabase
        .from('pay_periods')
        .insert([{ ...payPeriod, shop_id: shopId } as any])
        .select()
        .single();

      if (error) throw error;
      
      await fetchPayPeriods();
      toast({
        title: 'Success',
        description: 'Pay period created successfully'
      });
      return data;
    } catch (error: any) {
      console.error('Error creating pay period:', error);
      toast({
        title: 'Error',
        description: 'Failed to create pay period',
        variant: 'destructive'
      });
    }
  };

  const closePayPeriod = async (payPeriodId: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('pay_periods')
        .update({
          status: 'closed',
          processed_by: userData.user.id,
          processed_at: new Date().toISOString()
        })
        .eq('id', payPeriodId);

      if (error) throw error;
      
      await fetchPayPeriods();
      toast({
        title: 'Success',
        description: 'Pay period closed'
      });
    } catch (error: any) {
      console.error('Error closing pay period:', error);
      toast({
        title: 'Error',
        description: 'Failed to close pay period',
        variant: 'destructive'
      });
    }
  };

  return {
    loading,
    payPeriods,
    createPayPeriod,
    closePayPeriod,
    refetch: fetchPayPeriods
  };
}
