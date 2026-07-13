import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/context/AuthContext';
import { AutomotiveRegion, DEFAULT_REGION } from '@/lib/regions/automotive';

const KEY = ['automotive-region'];

export function useAutomotiveRegion() {
  const { userId, isAuthenticated } = useAuthContext();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: [...KEY, userId],
    enabled: isAuthenticated && !!userId,
    staleTime: 60_000,
    queryFn: async (): Promise<AutomotiveRegion> => {
      if (!userId) return DEFAULT_REGION;
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('automotive_region')
        .eq('id', userId)
        .maybeSingle();
      if (error) {
        console.warn('useAutomotiveRegion read error', error);
        return DEFAULT_REGION;
      }
      return (data?.automotive_region as AutomotiveRegion) ?? DEFAULT_REGION;
    },
  });

  const mutate = useMutation({
    mutationFn: async (region: AutomotiveRegion) => {
      if (!userId) throw new Error('Not authenticated');
      const { error } = await (supabase as any)
        .from('profiles')
        .update({ automotive_region: region })
        .eq('id', userId);
      if (error) throw error;
      return region;
    },
    onSuccess: (region) => {
      qc.setQueryData([...KEY, userId], region);
    },
  });

  const setRegion = useCallback((r: AutomotiveRegion) => mutate.mutate(r), [mutate]);

  return {
    region: (query.data ?? DEFAULT_REGION) as AutomotiveRegion,
    isLoading: query.isLoading,
    setRegion,
    isSaving: mutate.isPending,
  };
}
