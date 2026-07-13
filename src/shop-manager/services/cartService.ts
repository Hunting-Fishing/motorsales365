import { supabase } from "@/integrations/supabase/client";

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  // Product details
  name: string;
  price: number;
  image_url: string;
  category: string;
  manufacturer: string;
}

export interface Cart {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  items: CartItem[];
}

export interface AddToCartRequest {
  productId: string;
  name: string;
  price: number;
  imageUrl: string;
  category: string;
  manufacturer: string;
  quantity?: number;
}

/**
 * Get or create cart for authenticated user
 */
export const getOrCreateCart = async (): Promise<Cart> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  // First try to get existing cart
  let { data: cart, error } = await supabase
    .from("shopping_carts")
    .select(`
      *,
      items:cart_items(
        *,
        product:products(
          title,
          price,
          image_url
        )
      )
    `)
    .eq("user_id", user.id)
    .single();

  if (error && error.code === 'PGRST116') {
    // Cart doesn't exist, create one
    const { data: newCart, error: createError } = await supabase
      .from("shopping_carts")
      .insert({ user_id: user.id })
      .select()
      .single();

    if (createError) throw createError;
    
    cart = { ...newCart, items: [] };
  } else if (error) {
    throw error;
  }

  // Transform the data to match our interface
  const transformedCart: Cart = {
    id: cart.id,
    user_id: cart.user_id,
    created_at: cart.created_at,
    updated_at: cart.updated_at,
    items: (cart.items || []).map((item: any) => ({
      id: item.id,
      cart_id: item.cart_id,
      product_id: item.product_id,
      quantity: item.quantity,
      created_at: item.created_at,
      updated_at: item.updated_at,
      name: item.product?.title || 'Unknown Product',
      price: item.product?.price || 0,
      image_url: item.product?.image_url || '',
      category: 'Tools', // Default category since not in products table
      manufacturer: 'Various' // Default manufacturer since not in products table
    }))
  };

  return transformedCart;
};

/**
 * Add item to cart
 */
export const addToCart = async (request: AddToCartRequest): Promise<void> => {
  const cart = await getOrCreateCart();
  const quantity = request.quantity || 1;

  // Check if item already exists in cart
  const existingItem = cart.items.find(item => item.product_id === request.productId);

  if (existingItem) {
    // Update quantity
    const { error } = await supabase
      .from("cart_items")
      .update({ quantity: existingItem.quantity + quantity })
      .eq("id", existingItem.id);

    if (error) throw error;
  } else {
    // Add new item
    const { error } = await supabase
      .from("cart_items")
      .insert({
        cart_id: cart.id,
        product_id: request.productId,
        quantity
      });

    if (error) throw error;
  }
};

/**
 * Update cart item quantity
 */
export const updateCartItemQuantity = async (itemId: string, quantity: number): Promise<void> => {
  if (quantity <= 0) {
    await removeFromCart(itemId);
    return;
  }

  const { error } = await supabase
    .from("cart_items")
    .update({ quantity })
    .eq("id", itemId);

  if (error) throw error;
};

/**
 * Remove item from cart
 */
export const removeFromCart = async (itemId: string): Promise<void> => {
  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("id", itemId);

  if (error) throw error;
};

/**
 * Clear entire cart
 */
export const clearCart = async (): Promise<void> => {
  const cart = await getOrCreateCart();
  
  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("cart_id", cart.id);

  if (error) throw error;
};

/**
 * Get cart item count
 */
export const getCartItemCount = async (): Promise<number> => {
  try {
    const cart = await getOrCreateCart();
    return cart.items.reduce((total, item) => total + item.quantity, 0);
  } catch (error) {
    console.error('Error getting cart item count:', error);
    return 0;
  }
};

/**
 * Get cart total price
 */
export const getCartTotalPrice = async (): Promise<number> => {
  try {
    const cart = await getOrCreateCart();
    return cart.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  } catch (error) {
    console.error('Error getting cart total price:', error);
    return 0;
  }
};

/**
 * Migrate localStorage cart to database (for authentication flow)
 */
export const migrateLocalStorageCart = async (): Promise<void> => {
  try {
    const localCart = localStorage.getItem('shopping_cart');
    if (!localCart) return;

    const items = JSON.parse(localCart);
    if (!Array.isArray(items) || items.length === 0) return;

    // Add each item to database cart
    for (const item of items) {
      await addToCart({
        productId: item.productId || item.id,
        name: item.name,
        price: item.price,
        imageUrl: item.imageUrl || item.image_url || '',
        category: item.category,
        manufacturer: item.manufacturer,
        quantity: item.quantity
      });
    }

    // Clear localStorage cart after successful migration
    localStorage.removeItem('shopping_cart');
    localStorage.removeItem('cart-storage'); // Remove zustand cart storage too
  } catch (error) {
    console.error('Error migrating localStorage cart:', error);
  }
};

/**
 * Save cart to localStorage (for guest users)
 */
export const saveCartToLocalStorage = (items: CartItem[]): void => {
  const localItems = items.map(item => ({
    id: item.id,
    productId: item.product_id,
    name: item.name,
    price: item.price,
    imageUrl: item.image_url,
    category: item.category,
    manufacturer: item.manufacturer,
    quantity: item.quantity
  }));
  
  localStorage.setItem('shopping_cart', JSON.stringify(localItems));
};

/**
 * Load cart from localStorage (for guest users)
 */
export const loadCartFromLocalStorage = (): any[] => {
  try {
    const localCart = localStorage.getItem('shopping_cart');
    return localCart ? JSON.parse(localCart) : [];
  } catch (error) {
    console.error('Error loading cart from localStorage:', error);
    return [];
  }
};