// Wishlist Service - Complete wishlist management
import { supabase } from '@/integrations/supabase/client';
import { Product, WishlistItem } from '@/types/product';

export interface WishlistItemWithProduct extends WishlistItem {
  product?: Product;
  addedAt: string;
}

export interface Wishlist {
  id: string;
  userId: string;
  items: WishlistItemWithProduct[];
  totalItems: number;
  updatedAt: string;
}

export class WishlistService {
  private storageKey = 'shopping_wishlist';

  // Get user's wishlist (database or localStorage)
  async getWishlist(userId?: string): Promise<Wishlist> {
    if (userId) {
      return this.getDatabaseWishlist(userId);
    } else {
      return this.getLocalStorageWishlist();
    }
  }

  // Add item to wishlist
  async addToWishlist(item: WishlistItem, userId?: string): Promise<void> {
    if (userId) {
      await this.addToDatabaseWishlist(item, userId);
    } else {
      this.addToLocalStorageWishlist(item);
    }
  }

  // Remove item from wishlist
  async removeFromWishlist(productId: string, userId?: string): Promise<void> {
    if (userId) {
      await this.removeFromDatabaseWishlist(productId, userId);
    } else {
      this.removeFromLocalStorageWishlist(productId);
    }
  }

  // Check if item is in wishlist
  async isInWishlist(productId: string, userId?: string): Promise<boolean> {
    const wishlist = await this.getWishlist(userId);
    return wishlist.items.some(item => item.productId === productId);
  }

  // Clear entire wishlist
  async clearWishlist(userId?: string): Promise<void> {
    if (userId) {
      await this.clearDatabaseWishlist(userId);
    } else {
      this.clearLocalStorageWishlist();
    }
  }

  // Sync local wishlist to database when user logs in
  async syncWishlistToDatabase(userId: string): Promise<void> {
    const localWishlist = this.getLocalStorageWishlist();
    if (localWishlist.items.length === 0) return;

    // Merge with existing database wishlist
    const dbWishlist = await this.getDatabaseWishlist(userId);
    
    for (const item of localWishlist.items) {
      const existingItem = dbWishlist.items.find(dbItem => dbItem.productId === item.productId);
      if (!existingItem) {
        // Add new item
        await this.addToDatabaseWishlist(item, userId);
      }
    }

    // Clear local wishlist after sync
    this.clearLocalStorageWishlist();
  }

  // Get wishlist from database
  private async getDatabaseWishlist(userId: string): Promise<Wishlist> {
    const { data: items, error } = await supabase
      .from('wishlist_items')
      .select(`
        *,
        products(
          id, name, title, price, image_url, affiliate_link, 
          category_id, average_rating, review_count, is_featured, is_bestseller
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const wishlistItems: WishlistItemWithProduct[] = (items || []).map(item => ({
      productId: item.product_id,
      name: item.products?.name || item.products?.title || 'Unknown Product',
      price: item.products?.price || 0,
      imageUrl: item.products?.image_url || '',
      category: 'Uncategorized', // Would need to join with categories
      manufacturer: 'Professional Tools',
      addedAt: item.created_at
    }));

    return {
      id: `wishlist-${userId}`,
      userId,
      items: wishlistItems,
      totalItems: wishlistItems.length,
      updatedAt: items?.[0]?.created_at || new Date().toISOString()
    };
  }

  // Add item to database wishlist
  private async addToDatabaseWishlist(item: WishlistItem, userId: string): Promise<void> {
    // Check if item already exists
    const { data: existingItem } = await supabase
      .from('wishlist_items')
      .select('*')
      .eq('user_id', userId)
      .eq('product_id', item.productId)
      .single();

    if (!existingItem) {
      await supabase
        .from('wishlist_items')
        .insert({
          user_id: userId,
          product_id: item.productId
        });
    }
  }

  // Remove item from database wishlist
  private async removeFromDatabaseWishlist(productId: string, userId: string): Promise<void> {
    await supabase
      .from('wishlist_items')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId);
  }

  // Clear database wishlist
  private async clearDatabaseWishlist(userId: string): Promise<void> {
    await supabase
      .from('wishlist_items')
      .delete()
      .eq('user_id', userId);
  }

  // LocalStorage wishlist methods
  private getLocalStorageWishlist(): Wishlist {
    try {
      const wishlistData = localStorage.getItem(this.storageKey);
      const wishlist = wishlistData ? JSON.parse(wishlistData) : { items: [] };
      
      return {
        id: 'local-wishlist',
        userId: 'anonymous',
        items: wishlist.items || [],
        totalItems: wishlist.items?.length || 0,
        updatedAt: wishlist.updatedAt || new Date().toISOString()
      };
    } catch {
      return {
        id: 'local-wishlist',
        userId: 'anonymous',
        items: [],
        totalItems: 0,
        updatedAt: new Date().toISOString()
      };
    }
  }

  private addToLocalStorageWishlist(item: WishlistItem): void {
    const wishlist = this.getLocalStorageWishlist();
    const existingIndex = wishlist.items.findIndex(wishlistItem => wishlistItem.productId === item.productId);

    if (existingIndex === -1) {
      wishlist.items.push({
        ...item,
        addedAt: new Date().toISOString()
      });
      this.saveLocalStorageWishlist(wishlist);
    }
  }

  private removeFromLocalStorageWishlist(productId: string): void {
    const wishlist = this.getLocalStorageWishlist();
    wishlist.items = wishlist.items.filter(item => item.productId !== productId);
    this.saveLocalStorageWishlist(wishlist);
  }

  private clearLocalStorageWishlist(): void {
    localStorage.removeItem(this.storageKey);
  }

  private saveLocalStorageWishlist(wishlist: Wishlist): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify({
        items: wishlist.items,
        updatedAt: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Failed to save wishlist to localStorage:', error);
    }
  }
}

// Export singleton instance
export const wishlistService = new WishlistService();