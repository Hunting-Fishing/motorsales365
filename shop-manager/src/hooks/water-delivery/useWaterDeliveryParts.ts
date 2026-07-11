import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { toast } from 'sonner';

export interface WaterDeliveryPart {
  id: string;
  shop_id: string;
  part_number: string | null;
  name: string;
  description: string | null;
  category: string;
  subcategory: string | null;
  quantity: number;
  unit_of_measure: string | null;
  min_quantity: number | null;
  max_quantity: number | null;
  cost_price: number | null;
  retail_price: number | null;
  supplier_id: string | null;
  supplier_part_number: string | null;
  lead_time_days: number | null;
  storage_location: string | null;
  bin_number: string | null;
  is_active: boolean | null;
  last_restock_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WaterDeliveryPartTransaction {
  id: string;
  shop_id: string;
  part_id: string;
  transaction_type: string;
  quantity: number;
  reference_type: string | null;
  reference_id: string | null;
  unit_cost: number | null;
  performed_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface CreatePartData {
  part_number?: string;
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  quantity?: number;
  unit_of_measure?: string;
  min_quantity?: number;
  max_quantity?: number;
  cost_price?: number;
  retail_price?: number;
  supplier_id?: string;
  supplier_part_number?: string;
  lead_time_days?: number;
  storage_location?: string;
  bin_number?: string;
  notes?: string;
}

export interface CreateTransactionData {
  part_id: string;
  transaction_type: string;
  quantity: number;
  reference_type?: string;
  reference_id?: string;
  unit_cost?: number;
  notes?: string;
}

export function useWaterDeliveryParts(category?: string) {
  const { shopId } = useShopId();

  return useQuery({
    queryKey: ['water-delivery-parts', shopId, category],
    queryFn: async () => {
      if (!shopId) return [];

      let query = supabase
        .from('water_delivery_parts_inventory')
        .select('*')
        .eq('shop_id', shopId)
        .eq('is_active', true)
        .order('name');

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as WaterDeliveryPart[];
    },
    enabled: !!shopId,
  });
}

export function useLowStockParts() {
  const { shopId } = useShopId();

  return useQuery({
    queryKey: ['water-delivery-parts-low-stock', shopId],
    queryFn: async () => {
      if (!shopId) return [];

      const { data, error } = await supabase
        .from('water_delivery_parts_inventory')
        .select('*')
        .eq('shop_id', shopId)
        .eq('is_active', true)
        .not('min_quantity', 'is', null)
        .order('name');

      if (error) throw error;
      
      // Filter parts where quantity <= min_quantity
      return (data as WaterDeliveryPart[]).filter(
        part => part.min_quantity !== null && part.quantity <= part.min_quantity
      );
    },
    enabled: !!shopId,
  });
}

export function useCreateWaterDeliveryPart() {
  const queryClient = useQueryClient();
  const { shopId } = useShopId();

  return useMutation({
    mutationFn: async (data: CreatePartData) => {
      if (!shopId) throw new Error('No shop selected');

      const { data: result, error } = await supabase
        .from('water_delivery_parts_inventory')
        .insert({
          shop_id: shopId,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['water-delivery-parts'] });
      toast.success('Part added successfully');
    },
    onError: (error) => {
      toast.error(`Failed to add part: ${error.message}`);
    },
  });
}

export function useUpdateWaterDeliveryPart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<WaterDeliveryPart> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('water_delivery_parts_inventory')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['water-delivery-parts'] });
      toast.success('Part updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update part: ${error.message}`);
    },
  });
}

export function useDeleteWaterDeliveryPart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('water_delivery_parts_inventory')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['water-delivery-parts'] });
      toast.success('Part deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete part: ${error.message}`);
    },
  });
}

export function useWaterDeliveryPartTransactions(partId?: string) {
  const { shopId } = useShopId();

  return useQuery({
    queryKey: ['water-delivery-part-transactions', shopId, partId],
    queryFn: async () => {
      if (!shopId) return [];

      let query = supabase
        .from('water_delivery_parts_transactions')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });

      if (partId) {
        query = query.eq('part_id', partId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as WaterDeliveryPartTransaction[];
    },
    enabled: !!shopId,
  });
}

export function useRecordPartTransaction() {
  const queryClient = useQueryClient();
  const { shopId } = useShopId();

  return useMutation({
    mutationFn: async (data: CreateTransactionData) => {
      if (!shopId) throw new Error('No shop selected');

      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();

      // Insert the transaction
      const { error: txError } = await supabase
        .from('water_delivery_parts_transactions')
        .insert({
          shop_id: shopId,
          performed_by: user?.id,
          ...data,
        });

      if (txError) throw txError;

      // Update the part quantity
      const { data: part, error: partError } = await supabase
        .from('water_delivery_parts_inventory')
        .select('quantity')
        .eq('id', data.part_id)
        .single();

      if (partError) throw partError;

      const newQuantity = (part.quantity || 0) + data.quantity;
      
      const updateData: { quantity: number; last_restock_date?: string } = {
        quantity: Math.max(0, newQuantity),
      };

      // Update last_restock_date if receiving stock
      if (data.transaction_type === 'received') {
        updateData.last_restock_date = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from('water_delivery_parts_inventory')
        .update(updateData)
        .eq('id', data.part_id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['water-delivery-parts'] });
      queryClient.invalidateQueries({ queryKey: ['water-delivery-part-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['water-delivery-parts-low-stock'] });
      toast.success('Transaction recorded successfully');
    },
    onError: (error) => {
      toast.error(`Failed to record transaction: ${error.message}`);
    },
  });
}
