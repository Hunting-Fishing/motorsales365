import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WaterBusinessLocation {
  id: string;
  shop_id: string;
  business_name?: string;
  business_address?: string;
  business_city?: string;
  business_state?: string;
  business_zip?: string;
  business_phone?: string;
  business_email?: string;
  business_latitude?: number;
  business_longitude?: number;
  logo_url?: string;
  default_tax_rate: number;
  default_payment_terms: string;
  invoice_prefix: string;
  order_prefix: string;
  quote_prefix: string;
  enable_customer_portal: boolean;
  enable_online_payments: boolean;
  enable_auto_invoicing: boolean;
  enable_route_optimization: boolean;
  default_delivery_fee: number;
  minimum_order_gallons?: number;
  default_sanitization_interval_days: number;
  require_quality_readings: boolean;
  potable_certification_required: boolean;
  created_at: string;
  updated_at: string;
}

export function useWaterBusinessLocation(shopId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['water-business-location', shopId],
    queryFn: async () => {
      if (!shopId) return null;
      
      const { data, error } = await supabase
        .from('water_delivery_settings')
        .select('*')
        .eq('shop_id', shopId)
        .maybeSingle();
      
      if (error) throw error;
      return data as WaterBusinessLocation | null;
    },
    enabled: !!shopId,
  });

  const upsertMutation = useMutation({
    mutationFn: async (settings: Partial<WaterBusinessLocation>) => {
      if (!shopId) throw new Error('Shop ID required');
      
      const { data, error } = await supabase
        .from('water_delivery_settings')
        .upsert({
          shop_id: shopId,
          ...settings,
        }, {
          onConflict: 'shop_id',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['water-business-location', shopId] });
      toast.success('Settings saved');
    },
    onError: (error: any) => {
      toast.error(`Failed to save settings: ${error.message}`);
    },
  });

  return {
    settings: query.data,
    isLoading: query.isLoading,
    saveSettings: upsertMutation.mutate,
    isSaving: upsertMutation.isPending,
  };
}
