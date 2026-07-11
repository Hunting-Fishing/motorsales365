import { supabase } from "@/integrations/supabase/client";

export interface FlashSale {
  id: string;
  name: string;
  description?: string;
  discount_percentage: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  product_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface FlashSaleWithTimeLeft extends FlashSale {
  timeLeft: number; // milliseconds
  isLive: boolean;
  hasEnded: boolean;
}

export const getActiveFlashSales = async (): Promise<FlashSaleWithTimeLeft[]> => {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('flash_sales')
      .select('*')
      .eq('is_active', true)
      .lte('start_time', now)
      .gt('end_time', now)
      .order('start_time', { ascending: true });

    if (error) throw error;

    const flashSalesWithTime = (data || []).map(sale => {
      const endTime = new Date(sale.end_time).getTime();
      const currentTime = new Date().getTime();
      const timeLeft = Math.max(0, endTime - currentTime);
      
      return {
        ...sale,
        timeLeft,
        isLive: timeLeft > 0,
        hasEnded: timeLeft === 0
      };
    });

    return flashSalesWithTime;
  } catch (error) {
    console.error('Error fetching active flash sales:', error);
    return [];
  }
};

export const getUpcomingFlashSales = async (): Promise<FlashSale[]> => {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('flash_sales')
      .select('*')
      .eq('is_active', true)
      .gt('start_time', now)
      .order('start_time', { ascending: true })
      .limit(5);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching upcoming flash sales:', error);
    return [];
  }
};

export const getFlashSaleForProduct = async (productId: string): Promise<FlashSaleWithTimeLeft | null> => {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('flash_sales')
      .select('*')
      .eq('is_active', true)
      .lte('start_time', now)
      .gt('end_time', now)
      .contains('product_ids', [productId])
      .limit(1);

    if (error) throw error;

    if (!data || data.length === 0) return null;

    const sale = data[0];
    const endTime = new Date(sale.end_time).getTime();
    const currentTime = new Date().getTime();
    const timeLeft = Math.max(0, endTime - currentTime);

    return {
      ...sale,
      timeLeft,
      isLive: timeLeft > 0,
      hasEnded: timeLeft === 0
    };
  } catch (error) {
    console.error('Error fetching flash sale for product:', error);
    return null;
  }
};

export const createFlashSale = async (
  flashSale: Omit<FlashSale, 'id' | 'created_at' | 'updated_at'>
): Promise<FlashSale | null> => {
  try {
    const { data, error } = await supabase
      .from('flash_sales')
      .insert(flashSale)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating flash sale:', error);
    return null;
  }
};

export const updateFlashSale = async (
  id: string,
  updates: Partial<FlashSale>
): Promise<FlashSale | null> => {
  try {
    const { data, error } = await supabase
      .from('flash_sales')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating flash sale:', error);
    return null;
  }
};

export const calculateFlashSalePrice = (originalPrice: number, discountPercentage: number): number => {
  return originalPrice * (1 - discountPercentage / 100);
};

export const formatTimeLeft = (milliseconds: number): string => {
  if (milliseconds <= 0) return 'Ended';

  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
};