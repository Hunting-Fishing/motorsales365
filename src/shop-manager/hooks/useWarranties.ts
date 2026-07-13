import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type AssetWarranty = Database['public']['Tables']['asset_warranties']['Row'];
type PartWarranty = Database['public']['Tables']['part_warranties']['Row'];
type WarrantyClaim = Database['public']['Tables']['warranty_claims']['Row'];

export type { AssetWarranty, PartWarranty, WarrantyClaim };

export function useWarranties() {
  const queryClient = useQueryClient();
  const { shopId } = useShopId();

  // Fetch asset warranties
  const { data: assetWarranties = [], isLoading: assetLoading } = useQuery({
    queryKey: ['asset-warranties', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('asset_warranties')
        .select('*')
        .eq('shop_id', shopId)
        .order('end_date', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!shopId
  });

  // Fetch part warranties
  const { data: partWarranties = [], isLoading: partLoading } = useQuery({
    queryKey: ['part-warranties', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('part_warranties')
        .select('*')
        .eq('shop_id', shopId)
        .order('expiry_date', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!shopId
  });

  // Fetch warranty claims
  const { data: warrantyClaims = [], isLoading: claimsLoading } = useQuery({
    queryKey: ['warranty-claims', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('warranty_claims')
        .select('*')
        .eq('shop_id', shopId)
        .order('claim_date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!shopId
  });

  // Create asset warranty
  const createAssetWarranty = useMutation({
    mutationFn: async (warranty: Omit<Database['public']['Tables']['asset_warranties']['Insert'], 'shop_id'>) => {
      if (!shopId) throw new Error('No shop ID');
      const { data, error } = await supabase
        .from('asset_warranties')
        .insert({ ...warranty, shop_id: shopId })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-warranties'] });
      toast.success('Asset warranty added');
    },
    onError: (error) => {
      toast.error('Failed to add asset warranty: ' + error.message);
    }
  });

  // Update asset warranty
  const updateAssetWarranty = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Database['public']['Tables']['asset_warranties']['Update']) => {
      const { data, error } = await supabase
        .from('asset_warranties')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-warranties'] });
      toast.success('Warranty updated');
    },
    onError: (error) => {
      toast.error('Failed to update warranty: ' + error.message);
    }
  });

  // Create part warranty
  const createPartWarranty = useMutation({
    mutationFn: async (warranty: Omit<Database['public']['Tables']['part_warranties']['Insert'], 'shop_id'>) => {
      if (!shopId) throw new Error('No shop ID');
      const { data, error } = await supabase
        .from('part_warranties')
        .insert({ ...warranty, shop_id: shopId })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['part-warranties'] });
      toast.success('Part warranty added');
    },
    onError: (error) => {
      toast.error('Failed to add part warranty: ' + error.message);
    }
  });

  // Create warranty claim
  const createWarrantyClaim = useMutation({
    mutationFn: async (claim: Omit<Database['public']['Tables']['warranty_claims']['Insert'], 'shop_id' | 'claim_number'>) => {
      if (!shopId) throw new Error('No shop ID');
      const claimNumber = `WC-${Date.now().toString(36).toUpperCase()}`;
      
      const { data, error } = await supabase
        .from('warranty_claims')
        .insert({ ...claim, shop_id: shopId, claim_number: claimNumber })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warranty-claims'] });
      toast.success('Warranty claim created');
    },
    onError: (error) => {
      toast.error('Failed to create claim: ' + error.message);
    }
  });

  // Update warranty claim
  const updateWarrantyClaim = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Database['public']['Tables']['warranty_claims']['Update']) => {
      const { data, error } = await supabase
        .from('warranty_claims')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warranty-claims'] });
      toast.success('Claim updated');
    },
    onError: (error) => {
      toast.error('Failed to update claim: ' + error.message);
    }
  });

  // Calculate warranty statistics
  const now = new Date();
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const sixtyDays = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  const ninetyDays = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const warrantyStats = {
    activeAssetWarranties: assetWarranties.filter(w => w.is_active && new Date(w.end_date) > now).length,
    activePartWarranties: partWarranties.filter(w => w.status === 'active').length,
    expiringSoon30: assetWarranties.filter(w => {
      const endDate = new Date(w.end_date);
      return w.is_active && endDate > now && endDate <= thirtyDays;
    }).length + partWarranties.filter(w => {
      const expiryDate = new Date(w.expiry_date);
      return w.status === 'active' && expiryDate > now && expiryDate <= thirtyDays;
    }).length,
    expiringSoon60: assetWarranties.filter(w => {
      const endDate = new Date(w.end_date);
      return w.is_active && endDate > thirtyDays && endDate <= sixtyDays;
    }).length,
    expiringSoon90: assetWarranties.filter(w => {
      const endDate = new Date(w.end_date);
      return w.is_active && endDate > sixtyDays && endDate <= ninetyDays;
    }).length,
    pendingClaims: warrantyClaims.filter(c => ['draft', 'submitted', 'under_review'].includes(c.status)).length,
    approvedClaims: warrantyClaims.filter(c => ['approved', 'partially_approved', 'paid'].includes(c.status)).length,
    totalClaimedValue: warrantyClaims.reduce((sum, c) => sum + (c.amount_claimed || 0), 0),
    totalApprovedValue: warrantyClaims.reduce((sum, c) => sum + (c.amount_approved || 0), 0)
  };

  return {
    assetWarranties,
    partWarranties,
    warrantyClaims,
    warrantyStats,
    isLoading: assetLoading || partLoading || claimsLoading,
    createAssetWarranty,
    updateAssetWarranty,
    createPartWarranty,
    createWarrantyClaim,
    updateWarrantyClaim
  };
}
