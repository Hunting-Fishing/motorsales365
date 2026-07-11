import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface ShopNameData {
  id: string;
  name: string;
}

/**
 * Centralized hook for managing shop name across the application
 * Uses shops.name as the single source of truth
 */
export const useShopName = () => {
  const [shopData, setShopData] = useState<ShopNameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load current shop name from shops table
   */
  const loadShopName = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get user's shop from profile
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get user's profile to find their shop - handle both patterns
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('shop_id')
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .maybeSingle();

      if (profileError || !profile?.shop_id) {
        // Fallback to first shop
        const { data: shops, error: shopsError } = await supabase
          .from('shops')
          .select('id, name')
          .limit(1);

        if (shopsError || !shops || shops.length === 0) {
          throw new Error('No shop found');
        }

        setShopData({ id: shops[0].id, name: shops[0].name });
        return;
      }

      // Get the specific shop
      const { data: shop, error: shopError } = await supabase
        .from('shops')
        .select('id, name')
        .eq('id', profile.shop_id)
        .single();

      if (shopError || !shop) {
        throw new Error('Shop not found');
      }

      setShopData({ id: shop.id, name: shop.name });

    } catch (err) {
      console.error('Failed to load shop name:', err);
      setError(err instanceof Error ? err.message : 'Failed to load shop name');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update shop name in shops table
   */
  const updateShopName = async (newName: string): Promise<boolean> => {
    if (!shopData) {
      setError('No shop data available');
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('shops')
        .update({ 
          name: newName,
          updated_at: new Date().toISOString()
        })
        .eq('id', shopData.id);

      if (updateError) {
        throw updateError;
      }

      // Update local state
      setShopData(prev => prev ? { ...prev, name: newName } : null);

      toast({
        title: 'Success',
        description: 'Shop name updated successfully',
      });

      return true;

    } catch (err) {
      console.error('Failed to update shop name:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update shop name';
      setError(errorMessage);
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });

      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Refresh shop name data
   */
  const refresh = () => {
    loadShopName();
  };

  // Load data on mount
  useEffect(() => {
    loadShopName();
  }, []);

  return {
    shopName: shopData?.name || '',
    shopId: shopData?.id || '',
    loading,
    error,
    updateShopName,
    refresh,
    isLoaded: !loading && shopData !== null
  };
};