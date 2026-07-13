import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BusinessLocation {
  business_address?: string;
  business_latitude?: number;
  business_longitude?: number;
}

export function useBusinessLocation(shopId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['fuel-delivery-business-location', shopId],
    queryFn: async () => {
      if (!shopId) return null;
      
      const { data, error } = await supabase
        .from('fuel_delivery_settings')
        .select('business_address, business_latitude, business_longitude')
        .eq('shop_id', shopId)
        .maybeSingle();
      
      if (error) throw error;
      return data as BusinessLocation | null;
    },
    enabled: !!shopId,
  });

  const updateMutation = useMutation({
    mutationFn: async (location: BusinessLocation) => {
      if (!shopId) throw new Error('Shop ID required');
      
      // Check if settings exist
      const { data: existing } = await supabase
        .from('fuel_delivery_settings')
        .select('id')
        .eq('shop_id', shopId)
        .maybeSingle();
      
      if (existing) {
        const { error } = await supabase
          .from('fuel_delivery_settings')
          .update({
            business_address: location.business_address,
            business_latitude: location.business_latitude,
            business_longitude: location.business_longitude,
          })
          .eq('shop_id', shopId);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('fuel_delivery_settings')
          .insert({
            shop_id: shopId,
            business_address: location.business_address,
            business_latitude: location.business_latitude,
            business_longitude: location.business_longitude,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-business-location', shopId] });
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-settings'] });
      toast.success('Business location updated');
    },
    onError: (error: any) => {
      console.error('Update business location error:', error);
      toast.error('Failed to update business location');
    },
  });

  return {
    location: query.data,
    isLoading: query.isLoading,
    updateLocation: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}
