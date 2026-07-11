import { useState, useEffect } from 'react';
import { productPriceHistoryService, PriceHistoryEntry } from '@/services/productPriceHistoryService';
import { toast } from '@/hooks/use-toast';

export function useProductPriceHistory(productId: string) {
  const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPriceHistory = async () => {
    if (!productId) return;
    
    try {
      setLoading(true);
      setError(null);
      const history = await productPriceHistoryService.getPriceHistory(productId);
      setPriceHistory(history);
    } catch (err) {
      console.error('Error fetching price history:', err);
      setError('Failed to load price history');
    } finally {
      setLoading(false);
    }
  };

  const addPriceEntry = async (price: number, salePrice?: number, notes?: string) => {
    try {
      await productPriceHistoryService.addPriceEntry(productId, price, salePrice, notes);
      await fetchPriceHistory(); // Refresh the list
      toast({
        title: "Success",
        description: "Price history entry added",
      });
    } catch (err) {
      console.error('Error adding price entry:', err);
      toast({
        title: "Error",
        description: "Failed to add price entry",
        variant: "destructive",
      });
    }
  };

  const trackPriceChange = async (oldPrice: number, newPrice: number, oldSalePrice?: number, newSalePrice?: number) => {
    try {
      await productPriceHistoryService.trackPriceChange(productId, oldPrice, newPrice, oldSalePrice, newSalePrice);
      await fetchPriceHistory(); // Refresh the list
    } catch (err) {
      console.error('Error tracking price change:', err);
    }
  };

  useEffect(() => {
    fetchPriceHistory();
  }, [productId]);

  return {
    priceHistory,
    loading,
    error,
    addPriceEntry,
    trackPriceChange,
    refreshPriceHistory: fetchPriceHistory
  };
}