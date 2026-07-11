import { supabase } from "@/integrations/supabase/client";

export interface PriceHistoryEntry {
  id: string;
  date: string;
  price: number;
  salePrice?: number;
  changedBy?: string;
  notes?: string;
}

export const productPriceHistoryService = {
  async getPriceHistory(productId: string): Promise<PriceHistoryEntry[]> {
    const { data, error } = await supabase
      .from('product_price_history')
      .select('*')
      .eq('product_id', productId)
      .order('changed_at', { ascending: false });

    if (error) throw error;

    return data?.map(entry => ({
      id: entry.id,
      date: entry.changed_at,
      price: Number(entry.price),
      salePrice: entry.sale_price ? Number(entry.sale_price) : undefined,
      notes: entry.notes
    })) || [];
  },

  async addPriceEntry(productId: string, price: number, salePrice?: number, notes?: string): Promise<void> {
    const { data: user } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('product_price_history')
      .insert({
        product_id: productId,
        price,
        sale_price: salePrice,
        changed_by: user.user?.id,
        notes
      });

    if (error) throw error;
  },

  async trackPriceChange(productId: string, oldPrice: number, newPrice: number, oldSalePrice?: number, newSalePrice?: number): Promise<void> {
    // Only add entry if price actually changed
    if (oldPrice !== newPrice || oldSalePrice !== newSalePrice) {
      await this.addPriceEntry(
        productId, 
        newPrice, 
        newSalePrice, 
        `Price updated from $${oldPrice} to $${newPrice}${
          oldSalePrice !== newSalePrice 
            ? `, sale price from ${oldSalePrice ? `$${oldSalePrice}` : 'none'} to ${newSalePrice ? `$${newSalePrice}` : 'none'}`
            : ''
        }`
      );
    }
  }
};