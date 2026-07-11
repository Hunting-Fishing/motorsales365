import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export interface WishlistItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  imageUrl: string;
  category: string;
  manufacturer: string;
  created_at: string;
}

interface UseWishlistReturn {
  items: WishlistItem[];
  loading: boolean;
  addToWishlist: (product: Omit<WishlistItem, 'id' | 'created_at'>) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  refreshWishlist: () => Promise<void>;
}

export function useWishlist(): UseWishlistReturn {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      if (user) {
        await refreshWishlist();
      }
    };
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setIsAuthenticated(!!session?.user);
        if (session?.user) {
          await refreshWishlist();
        } else {
          setItems([]);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const refreshWishlist = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('wishlist_items')
        .select(`
          id,
          product_id,
          created_at,
          product:products(
            title,
            price,
            image_url
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedItems: WishlistItem[] = (data || []).map(item => ({
        id: item.id,
        productId: item.product_id,
        name: item.product?.title || 'Unknown Product',
        price: item.product?.price || 0,
        imageUrl: item.product?.image_url || '',
        category: 'Tools', // Default category since not in products table
        manufacturer: 'Various', // Default manufacturer since not in products table
        created_at: item.created_at
      }));

      setItems(transformedItems);
    } catch (error) {
      console.error('Error refreshing wishlist:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const addToWishlist = async (product: Omit<WishlistItem, 'id' | 'created_at'>) => {
    if (!isAuthenticated) {
      toast.error('Please sign in to add items to wishlist');
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('wishlist_items')
        .insert({
          user_id: user.id,
          product_id: product.productId
        });

      if (error) throw error;

      await refreshWishlist();
      toast.success(`${product.name} added to wishlist`);
    } catch (error: any) {
      console.error('Error adding to wishlist:', error);
      if (error.code === '23505') {
        toast.error('Item is already in your wishlist');
      } else {
        toast.error('Failed to add item to wishlist');
      }
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (productId: string) => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('wishlist_items')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId);

      if (error) throw error;

      await refreshWishlist();
      toast.success('Item removed from wishlist');
    } catch (error: any) {
      console.error('Error removing from wishlist:', error);
      toast.error('Failed to remove item from wishlist');
    } finally {
      setLoading(false);
    }
  };

  const isInWishlist = (productId: string): boolean => {
    return items.some(item => item.productId === productId);
  };

  return {
    items,
    loading,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    refreshWishlist
  };
}