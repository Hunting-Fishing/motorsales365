import { supabase } from "@/integrations/supabase/client";

export interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  product?: {
    id: string;
    name: string;
    description?: string;
    price: number;
    image_url?: string;
    sku?: string;
    stock_quantity?: number;
  };
}

/**
 * Add product to wishlist
 */
export const addToWishlist = async (productId: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { error } = await supabase
    .from("wishlist_items")
    .insert({
      user_id: user.id,
      product_id: productId
    });

  if (error) throw error;
};

/**
 * Remove product from wishlist
 */
export const removeFromWishlist = async (productId: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { error } = await supabase
    .from("wishlist_items")
    .delete()
    .eq("user_id", user.id)
    .eq("product_id", productId);

  if (error) throw error;
};

/**
 * Get user's wishlist items
 */
export const getWishlistItems = async (): Promise<WishlistItem[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { data, error } = await supabase
    .from("wishlist_items")
    .select(`
      *,
      product:products(
        id,
        name,
        description,
        price,
        image_url,
        sku,
        stock_quantity
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as any;
};

/**
 * Check if product is in wishlist
 */
export const isInWishlist = async (productId: string): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from("wishlist_items")
    .select("id")
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return !!data;
};

/**
 * Get wishlist count for user
 */
export const getWishlistCount = async (): Promise<number> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from("wishlist_items")
    .select("*", { count: 'exact', head: true })
    .eq("user_id", user.id);

  if (error) throw error;
  return count || 0;
};