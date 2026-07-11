import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import * as cartService from '@/services/cartService';
import { calculateDynamicPrice, getBulkPricingTier } from '@/services/shopping/cartVariantService';

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  imageUrl: string;
  quantity: number;
  category: string;
  manufacturer: string;
  variantId?: string;
  variantName?: string;
  bundleId?: string;
  bundleName?: string;
  originalPrice?: number;
  appliedDiscounts?: string[];
}

interface UseCartReturn {
  items: CartItem[];
  itemCount: number;
  totalPrice: number;
  loading: boolean;
  addToCart: (product: Omit<CartItem, 'id' | 'quantity'>) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

export function useCart(): UseCartReturn {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const wasAuthenticated = isAuthenticated;
        const nowAuthenticated = !!session?.user;
        setIsAuthenticated(nowAuthenticated);

        if (!wasAuthenticated && nowAuthenticated) {
          // User just logged in - migrate localStorage cart
          await cartService.migrateLocalStorageCart();
          await refreshCart();
        } else if (nowAuthenticated) {
          // User is authenticated - load from database
          await refreshCart();
        } else {
          // User logged out - load from localStorage
          loadFromLocalStorage();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [isAuthenticated]);

  // Load cart on mount
  useEffect(() => {
    if (isAuthenticated) {
      refreshCart();
    } else {
      loadFromLocalStorage();
    }
  }, [isAuthenticated]);

  const loadFromLocalStorage = () => {
    const localItems = cartService.loadCartFromLocalStorage();
    const transformedItems: CartItem[] = localItems.map(item => ({
      id: item.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
      productId: item.productId,
      name: item.name,
      price: item.price,
      imageUrl: item.imageUrl,
      quantity: item.quantity,
      category: item.category,
      manufacturer: item.manufacturer
    }));
    setItems(transformedItems);
  };

  const refreshCart = useCallback(async () => {
    if (!isAuthenticated) {
      loadFromLocalStorage();
      return;
    }

    try {
      setLoading(true);
      const cart = await cartService.getOrCreateCart();
      const transformedItems: CartItem[] = cart.items.map(item => ({
        id: item.id,
        productId: item.product_id,
        name: item.name,
        price: item.price,
        imageUrl: item.image_url,
        quantity: item.quantity,
        category: item.category,
        manufacturer: item.manufacturer
      }));
      setItems(transformedItems);
    } catch (error) {
      console.error('Error refreshing cart:', error);
      // Fallback to localStorage
      loadFromLocalStorage();
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const addToCart = async (product: Omit<CartItem, 'id' | 'quantity'>) => {
    try {
      setLoading(true);

      // Calculate dynamic pricing
      const dynamicPrice = calculateDynamicPrice(product.price, {
        quantity: 1,
        customerTier: 'regular', // Default tier
        appliedDiscounts: product.appliedDiscounts || []
      });

      const productWithPricing = {
        ...product,
        price: dynamicPrice.finalPrice,
        originalPrice: product.originalPrice || product.price,
        appliedDiscounts: dynamicPrice.appliedDiscounts
      };

      if (isAuthenticated) {
        // Add to database
        await cartService.addToCart({
          productId: productWithPricing.productId,
          name: productWithPricing.name,
          price: productWithPricing.price,
          imageUrl: productWithPricing.imageUrl,
          category: productWithPricing.category,
          manufacturer: productWithPricing.manufacturer
        });
        await refreshCart();
      } else {
        // Add to localStorage - check for variant uniqueness
        const existingItemIndex = items.findIndex(item => 
          item.productId === productWithPricing.productId && 
          item.variantId === productWithPricing.variantId &&
          item.bundleId === productWithPricing.bundleId
        );
        
        let updatedItems: CartItem[];
        if (existingItemIndex >= 0) {
          updatedItems = [...items];
          updatedItems[existingItemIndex].quantity += 1;
          
          // Recalculate bulk pricing for updated quantity
          const bulkTier = getBulkPricingTier(updatedItems[existingItemIndex].quantity);
          if (bulkTier) {
            const newPrice = calculateDynamicPrice(productWithPricing.originalPrice || productWithPricing.price, {
              quantity: updatedItems[existingItemIndex].quantity,
              customerTier: 'regular',
              appliedDiscounts: [...(productWithPricing.appliedDiscounts || []), bulkTier.name]
            });
            updatedItems[existingItemIndex].price = newPrice.finalPrice;
            updatedItems[existingItemIndex].appliedDiscounts = newPrice.appliedDiscounts;
          }
        } else {
          const newItem: CartItem = {
            ...productWithPricing,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            quantity: 1
          };
          updatedItems = [...items, newItem];
        }
        
        setItems(updatedItems);
        cartService.saveCartToLocalStorage(updatedItems.map(item => ({
          ...item,
          product_id: item.productId,
          cart_id: 'guest',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          image_url: item.imageUrl
        })));
      }

      const itemName = productWithPricing.variantName 
        ? `${productWithPricing.name} (${productWithPricing.variantName})`
        : productWithPricing.bundleName
        ? `${productWithPricing.bundleName}`
        : productWithPricing.name;
      
      toast.success(`${itemName} added to cart`);
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add item to cart');
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (itemId: string) => {
    try {
      setLoading(true);

      if (isAuthenticated) {
        await cartService.removeFromCart(itemId);
        await refreshCart();
      } else {
        const updatedItems = items.filter(item => item.id !== itemId);
        setItems(updatedItems);
        cartService.saveCartToLocalStorage(updatedItems.map(item => ({
          ...item,
          product_id: item.productId,
          cart_id: 'guest',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          image_url: item.imageUrl
        })));
      }

      toast.success('Item removed from cart');
    } catch (error: any) {
      console.error('Error removing from cart:', error);
      toast.error('Failed to remove item from cart');
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      await removeFromCart(itemId);
      return;
    }

    try {
      setLoading(true);

      if (isAuthenticated) {
        await cartService.updateCartItemQuantity(itemId, quantity);
        await refreshCart();
      } else {
        const updatedItems = items.map(item => 
          item.id === itemId ? { ...item, quantity } : item
        );
        setItems(updatedItems);
        cartService.saveCartToLocalStorage(updatedItems.map(item => ({
          ...item,
          product_id: item.productId,
          cart_id: 'guest',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          image_url: item.imageUrl
        })));
      }
    } catch (error: any) {
      console.error('Error updating quantity:', error);
      toast.error('Failed to update quantity');
    } finally {
      setLoading(false);
    }
  };

  const clearCart = async () => {
    try {
      setLoading(true);

      if (isAuthenticated) {
        await cartService.clearCart();
        await refreshCart();
      } else {
        setItems([]);
        localStorage.removeItem('shopping_cart');
      }

      toast.success('Cart cleared');
    } catch (error: any) {
      console.error('Error clearing cart:', error);
      toast.error('Failed to clear cart');
    } finally {
      setLoading(false);
    }
  };

  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const totalPrice = items.reduce((total, item) => {
    // Apply any additional cart-level discounts
    const itemTotal = item.price * item.quantity;
    return total + itemTotal;
  }, 0);

  return {
    items,
    itemCount,
    totalPrice,
    loading,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    refreshCart
  };
}