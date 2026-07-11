import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type FuelProduct = Tables<'fuel_delivery_products'>;

export function useFuelProducts() {
  return useQuery({
    queryKey: ['fuel-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fuel_delivery_products')
        .select('*')
        .eq('is_active', true)
        .order('fuel_type')
        .order('octane_rating')
        .order('product_name');
      
      if (error) throw error;
      return data;
    }
  });
}

export function useProductsByTruck(truckId: string | undefined) {
  return useQuery({
    queryKey: ['truck-products', truckId],
    queryFn: async () => {
      if (!truckId) return [];
      
      // Get unique products loaded in this truck's compartments
      const { data, error } = await supabase
        .from('fuel_delivery_truck_compartments')
        .select(`
          product:fuel_delivery_products(*)
        `)
        .eq('truck_id', truckId)
        .not('product_id', 'is', null);
      
      if (error) throw error;
      
      // Extract unique products
      const products = data
        .map(d => d.product)
        .filter((p): p is FuelProduct => p !== null);
      
      // Remove duplicates by ID
      const uniqueProducts = Array.from(
        new Map(products.map(p => [p.id, p])).values()
      );
      
      return uniqueProducts;
    },
    enabled: !!truckId
  });
}
