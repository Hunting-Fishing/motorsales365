import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useShopId } from './useShopId';
import { useToast } from './use-toast';
import type { ShiftSwapRequest } from '@/types/employee-availability';

export function useShiftSwaps() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [swapRequests, setSwapRequests] = useState<ShiftSwapRequest[]>([]);

  useEffect(() => {
    if (shopId) {
      fetchSwapRequests();
    }
  }, [shopId]);

  const fetchSwapRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('shift_swap_requests')
        .select(`
          *,
          requesting_employee:profiles!shift_swap_requests_requesting_employee_id_fkey(first_name, last_name, email),
          target_employee:profiles!shift_swap_requests_target_employee_id_fkey(first_name, last_name, email)
        `)
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSwapRequests(data as any || []);
    } catch (error: any) {
      console.error('Error fetching swap requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load swap requests',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const createSwapRequest = async (data: Partial<ShiftSwapRequest>) => {
    try {
      const { data: result, error } = await supabase
        .from('shift_swap_requests')
        .insert([{ ...data, shop_id: shopId } as any])
        .select()
        .single();

      if (error) throw error;
      await fetchSwapRequests();
      toast({
        title: 'Success',
        description: 'Shift swap request created'
      });
      return result;
    } catch (error: any) {
      console.error('Error creating swap request:', error);
      toast({
        title: 'Error',
        description: 'Failed to create swap request',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const updateSwapRequest = async (id: string, updates: Partial<ShiftSwapRequest>) => {
    try {
      const { error } = await supabase
        .from('shift_swap_requests')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      await fetchSwapRequests();
      toast({
        title: 'Success',
        description: 'Swap request updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating swap request:', error);
      toast({
        title: 'Error',
        description: 'Failed to update swap request',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const approveSwapRequest = async (id: string, reviewNotes?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await updateSwapRequest(id, {
        status: 'approved',
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes
      });
    } catch (error) {
      throw error;
    }
  };

  const rejectSwapRequest = async (id: string, reviewNotes?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await updateSwapRequest(id, {
        status: 'rejected',
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes
      });
    } catch (error) {
      throw error;
    }
  };

  return {
    loading,
    swapRequests,
    createSwapRequest,
    updateSwapRequest,
    approveSwapRequest,
    rejectSwapRequest,
    refetch: fetchSwapRequests
  };
}
