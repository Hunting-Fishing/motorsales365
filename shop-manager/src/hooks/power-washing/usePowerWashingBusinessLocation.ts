import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BusinessLocation {
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  name: string | null;
  phone: string | null;
}

interface UpdateLocationData {
  business_address: string;
  business_latitude: number;
  business_longitude: number;
  city?: string;
  state?: string;
  postal_code?: string;
}

export function usePowerWashingBusinessLocation(shopId: string | null) {
  const queryClient = useQueryClient();

  const { data: location, isLoading } = useQuery({
    queryKey: ['power-washing-business-location', shopId],
    queryFn: async () => {
      if (!shopId) return null;

      const { data, error } = await supabase
        .from('shops')
        .select('address, latitude, longitude, city, state, postal_code, name, phone')
        .eq('id', shopId)
        .single();

      if (error) {
        console.error('Error fetching business location:', error);
        return null;
      }

      return {
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        city: data.city,
        state: data.state,
        postal_code: data.postal_code,
        name: data.name,
        phone: data.phone,
      } as BusinessLocation;
    },
    enabled: !!shopId,
  });

  const { mutate: updateLocation, isPending: isUpdating } = useMutation({
    mutationFn: async (data: UpdateLocationData) => {
      if (!shopId) throw new Error('No shop ID');

      const { error } = await supabase
        .from('shops')
        .update({
          address: data.business_address,
          latitude: data.business_latitude,
          longitude: data.business_longitude,
          city: data.city || null,
          state: data.state || null,
          postal_code: data.postal_code || null,
        })
        .eq('id', shopId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-washing-business-location', shopId] });
      queryClient.invalidateQueries({ queryKey: ['power-washing-weather'] });
      toast.success('Business location updated');
    },
    onError: (error) => {
      console.error('Error updating business location:', error);
      toast.error('Failed to update business location');
    },
  });

  return {
    location,
    isLoading,
    updateLocation,
    isUpdating,
  };
}
