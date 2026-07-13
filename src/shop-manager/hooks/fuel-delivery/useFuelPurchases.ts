import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useShopId } from '@/hooks/useShopId';

export interface FuelPurchase {
  id: string;
  shop_id: string;
  vendor_name: string;
  vendor_account_number: string | null;
  bol_number: string;
  po_number: string | null;
  product_id: string | null;
  quantity_gallons: number;
  price_per_gallon: number;
  subtotal: number | null;
  taxes: number | null;
  fees: number | null;
  total_cost: number | null;
  purchase_date: string;
  received_date: string | null;
  received_by: string | null;
  truck_id: string | null;
  compartment_id: string | null;
  meter_start_reading: number | null;
  meter_end_reading: number | null;
  actual_gallons_received: number | null;
  variance_gallons: number | null;
  terminal_name: string | null;
  terminal_location: string | null;
  rack_price: number | null;
  status: string;
  bol_document_url: string | null;
  invoice_document_url: string | null;
  payment_status: string;
  payment_due_date: string | null;
  payment_date: string | null;
  payment_reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Joined data
  product?: {
    product_name: string;
    product_code: string | null;
    octane_rating: number | null;
  } | null;
  truck?: {
    truck_number: string;
  } | null;
}

export function useFuelPurchases() {
  const { shopId } = useShopId();

  return useQuery({
    queryKey: ['fuel-purchases', shopId],
    queryFn: async () => {
      if (!shopId) return [];

      const { data, error } = await supabase
        .from('fuel_delivery_purchases')
        .select(`
          *,
          product:fuel_delivery_products(product_name, product_code, octane_rating),
          truck:fuel_delivery_trucks(truck_number)
        `)
        .eq('shop_id', shopId)
        .order('purchase_date', { ascending: false });

      if (error) throw error;
      return data as FuelPurchase[];
    },
    enabled: !!shopId
  });
}

export interface CreateFuelPurchaseParams {
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
  truck_id?: string;
  compartment_id?: string;
  terminal_name?: string;
  terminal_location?: string;
  rack_price?: number;
  payment_due_date?: string;
  notes?: string;
}

export function useCreateFuelPurchase() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { shopId } = useShopId();

  return useMutation({
    mutationFn: async (params: CreateFuelPurchaseParams) => {
      if (!shopId) throw new Error('No shop ID');

      const { data, error } = await supabase
        .from('fuel_delivery_purchases')
        .insert({
          shop_id: shopId,
          ...params,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-purchases'] });
      toast({
        title: 'Purchase Recorded',
        description: 'Fuel purchase/BOL has been recorded successfully.'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to record purchase: ' + (error as Error).message,
        variant: 'destructive'
      });
    }
  });
}

export function useUpdateFuelPurchase() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...params }: Partial<FuelPurchase> & { id: string }) => {
      const { data, error } = await supabase
        .from('fuel_delivery_purchases')
        .update(params)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-purchases'] });
      toast({
        title: 'Purchase Updated',
        description: 'Fuel purchase has been updated successfully.'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update purchase: ' + (error as Error).message,
        variant: 'destructive'
      });
    }
  });
}

export function useReceiveFuelPurchase() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      actual_gallons_received,
      meter_start_reading,
      meter_end_reading,
      truck_id,
      compartment_id
    }: {
      id: string;
      actual_gallons_received: number;
      meter_start_reading?: number;
      meter_end_reading?: number;
      truck_id?: string;
      compartment_id?: string;
    }) => {
      const { data, error } = await supabase
        .from('fuel_delivery_purchases')
        .update({
          actual_gallons_received,
          meter_start_reading,
          meter_end_reading,
          truck_id,
          compartment_id,
          received_date: new Date().toISOString(),
          status: 'received'
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-purchases'] });
      toast({
        title: 'Fuel Received',
        description: 'Fuel has been marked as received.'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to receive fuel: ' + (error as Error).message,
        variant: 'destructive'
      });
    }
  });
}

export function useDeleteFuelPurchase() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('fuel_delivery_purchases')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-purchases'] });
      toast({
        title: 'Purchase Deleted',
        description: 'Fuel purchase has been deleted.'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to delete purchase: ' + (error as Error).message,
        variant: 'destructive'
      });
    }
  });
}
