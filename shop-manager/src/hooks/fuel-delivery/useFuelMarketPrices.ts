import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { toast } from 'sonner';

// Re-export from centralized city data
export { CANADIAN_CITIES, PROVINCE_NAMES, getCitiesByProvince, searchCities } from '@/data/canadianCities';
export type { CanadianCity } from '@/data/canadianCities';

export interface FuelMarketPrice {
  id: string;
  city: string;
  province: string;
  fuel_type: string;
  price_cents_per_litre: number;
  price_month: string;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface ShopFuelPriceSettings {
  id: string;
  shop_id: string;
  reference_city: string;
  reference_province: string;
  custom_location_label: string | null;
  show_on_portal: boolean;
  created_at: string;
  updated_at: string;
}

// Fetch fuel market prices for a specific city
export function useFuelMarketPrices(city?: string, province?: string) {
  return useQuery({
    queryKey: ['fuel-market-prices', city, province],
    queryFn: async () => {
      if (!city || !province) {
        // Return empty if no city specified
        const { data, error } = await supabase
          .from('fuel_market_prices')
          .select('*')
          .order('price_month', { ascending: false })
          .limit(50);
        
        if (error) throw error;
        return data as FuelMarketPrice[];
      }

      const { data, error } = await supabase
        .from('fuel_market_prices')
        .select('*')
        .eq('city', city)
        .eq('province', province)
        .order('price_month', { ascending: false })
        .limit(4);
      
      if (error) throw error;
      return data as FuelMarketPrice[];
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

// Fetch shop's fuel price settings
export function useShopFuelPriceSettings() {
  const { shopId } = useShopId();
  
  return useQuery({
    queryKey: ['shop-fuel-price-settings', shopId],
    queryFn: async () => {
      if (!shopId) return null;
      
      const { data, error } = await supabase
        .from('shop_fuel_price_settings')
        .select('*')
        .eq('shop_id', shopId)
        .maybeSingle();
      
      if (error) throw error;
      return data as ShopFuelPriceSettings | null;
    },
    enabled: !!shopId,
  });
}

// Update shop's fuel price settings
export function useUpdateFuelPriceSettings() {
  const queryClient = useQueryClient();
  const { shopId } = useShopId();
  
  return useMutation({
    mutationFn: async (settings: Partial<ShopFuelPriceSettings>) => {
      if (!shopId) throw new Error('Shop ID not found');
      
      // Check if settings exist
      const { data: existing } = await supabase
        .from('shop_fuel_price_settings')
        .select('id')
        .eq('shop_id', shopId)
        .maybeSingle();
      
      if (existing) {
        const { error } = await supabase
          .from('shop_fuel_price_settings')
          .update(settings)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('shop_fuel_price_settings')
          .insert({ ...settings, shop_id: shopId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-fuel-price-settings'] });
      toast.success('Fuel price settings saved');
    },
    onError: (error: any) => {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    },
  });
}

// Refresh prices from Statistics Canada (via edge function)
export function useRefreshFuelPrices() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-fuel-prices', {
        body: { action: 'refresh' },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-market-prices'] });
      toast.success('Fuel prices updated from Statistics Canada');
    },
    onError: (error: any) => {
      console.error('Error refreshing prices:', error);
      toast.error('Failed to refresh fuel prices');
    },
  });
}

// Get prices for the configured reference city
export function useConfiguredFuelPrices() {
  const { data: settings } = useShopFuelPriceSettings();
  
  const city = settings?.reference_city || 'Victoria';
  const province = settings?.reference_province || 'BC';
  
  const pricesQuery = useFuelMarketPrices(city, province);
  
  return {
    ...pricesQuery,
    settings,
    city,
    province,
    customLabel: settings?.custom_location_label,
    showOnPortal: settings?.show_on_portal ?? true,
  };
}
