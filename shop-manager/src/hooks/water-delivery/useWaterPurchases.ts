import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useShopId } from '@/hooks/useShopId';

export interface WaterPurchase {
  id: string;
  shop_id: string;
  vendor_name: string;
  vendor_account_number?: string;
  bol_number: string;
  po_number?: string;
  product_id?: string;
  quantity_gallons: number;
  price_per_gallon: number;
  subtotal?: number;
  taxes?: number;
  fees?: number;
  total_cost?: number;
  purchase_date: string;
  received_date?: string;
  received_by?: string;
  truck_id?: string;
  compartment_id?: string;
  meter_start_reading?: number;
  meter_end_reading?: number;
  actual_gallons_received?: number;
  variance_gallons?: number;
  source_name?: string;
  source_location?: string;
  source_ph_level?: number;
  source_chlorine_level?: number;
  source_tds_ppm?: number;
  quality_certificate_url?: string;
  status: 'pending' | 'in_transit' | 'received' | 'reconciled' | 'disputed';
  bol_document_url?: string;
  invoice_document_url?: string;
  payment_status: 'unpaid' | 'partial' | 'paid';
  payment_due_date?: string;
  payment_date?: string;
  payment_reference?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  water_delivery_products?: {
    product_name: string;
    water_type: string;
  };
}

export interface CreateWaterPurchaseInput {
  vendor_name: string;
  vendor_account_number?: string;
  bol_number: string;
  po_number?: string;
  product_id?: string;
  quantity_gallons: number;
  price_per_gallon: number;
  taxes?: number;
  fees?: number;
  total_cost?: number;
  purchase_date: string;
  source_name?: string;
  source_location?: string;
  source_ph_level?: number;
  source_chlorine_level?: number;
  source_tds_ppm?: number;
  payment_due_date?: string;
  notes?: string;
}

export function useWaterPurchases() {
  const { shopId } = useShopId();
  const queryClient = useQueryClient();

  const purchasesQuery = useQuery({
    queryKey: ['water-purchases', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      
      const { data, error } = await supabase
        .from('water_delivery_purchases')
        .select(`
          *,
          water_delivery_products (
            product_name,
            water_type
          )
        `)
        .eq('shop_id', shopId)
        .order('purchase_date', { ascending: false });
      
      if (error) throw error;
      return data as WaterPurchase[];
    },
    enabled: !!shopId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateWaterPurchaseInput) => {
      if (!shopId) throw new Error('Shop ID required');

      const { data, error } = await supabase
        .from('water_delivery_purchases')
        .insert({
          shop_id: shopId,
          ...input,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['water-purchases', shopId] });
      toast.success('Water purchase created successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to create purchase: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WaterPurchase> & { id: string }) => {
      const { data, error } = await supabase
        .from('water_delivery_purchases')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['water-purchases', shopId] });
      toast.success('Purchase updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update purchase: ${error.message}`);
    },
  });

  const receivePurchaseMutation = useMutation({
    mutationFn: async ({
      id,
      actual_gallons_received,
      truck_id,
      compartment_id,
      meter_start_reading,
      meter_end_reading,
      notes,
    }: {
      id: string;
      actual_gallons_received: number;
      truck_id?: string;
      compartment_id?: string;
      meter_start_reading?: number;
      meter_end_reading?: number;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('water_delivery_purchases')
        .update({
          status: 'received',
          received_date: new Date().toISOString(),
          actual_gallons_received,
          truck_id,
          compartment_id,
          meter_start_reading,
          meter_end_reading,
          notes,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['water-purchases', shopId] });
      toast.success('Water received successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to receive water: ${error.message}`);
    },
  });

  return {
    purchases: purchasesQuery.data || [],
    isLoading: purchasesQuery.isLoading,
    error: purchasesQuery.error,
    createPurchase: createMutation.mutate,
    isCreating: createMutation.isPending,
    updatePurchase: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    receivePurchase: receivePurchaseMutation.mutate,
    isReceiving: receivePurchaseMutation.isPending,
  };
}
