import { useState, useCallback } from 'react';
import { AffiliateProduct } from '@/types/affiliate';
import { useToast } from '@/hooks/use-toast';

const MAX_COMPARISON_PRODUCTS = 4;
const STORAGE_KEY = 'product_comparison';

export const useProductComparison = () => {
  const [comparisonProducts, setComparisonProducts] = useState<AffiliateProduct[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  
  const { toast } = useToast();

  const saveToStorage = useCallback((products: AffiliateProduct[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    } catch (error) {
      console.error('Failed to save comparison to localStorage:', error);
    }
  }, []);

  const addToComparison = useCallback((product: AffiliateProduct) => {
    setComparisonProducts(prev => {
      if (prev.find(p => p.id === product.id)) {
        toast({
          title: "Already in comparison",
          description: "This product is already being compared.",
        });
        return prev;
      }

      if (prev.length >= MAX_COMPARISON_PRODUCTS) {
        toast({
          title: "Comparison limit reached",
          description: `You can only compare up to ${MAX_COMPARISON_PRODUCTS} products at once.`,
          variant: "destructive"
        });
        return prev;
      }

      const newProducts = [...prev, product];
      saveToStorage(newProducts);
      
      toast({
        title: "Added to comparison",
        description: `${product.name} has been added to your comparison.`,
      });
      
      return newProducts;
    });
  }, [toast, saveToStorage]);

  const removeFromComparison = useCallback((productId: string) => {
    setComparisonProducts(prev => {
      const newProducts = prev.filter(p => p.id !== productId);
      saveToStorage(newProducts);
      
      toast({
        title: "Removed from comparison",
        description: "Product has been removed from your comparison.",
      });
      
      return newProducts;
    });
  }, [toast, saveToStorage]);

  const clearComparison = useCallback(() => {
    setComparisonProducts([]);
    saveToStorage([]);
    
    toast({
      title: "Comparison cleared",
      description: "All products have been removed from comparison.",
    });
  }, [toast, saveToStorage]);

  const isInComparison = useCallback((productId: string) => {
    return comparisonProducts.some(p => p.id === productId);
  }, [comparisonProducts]);

  const canAddMore = comparisonProducts.length < MAX_COMPARISON_PRODUCTS;
  const comparisonCount = comparisonProducts.length;

  return {
    comparisonProducts,
    addToComparison,
    removeFromComparison,
    clearComparison,
    isInComparison,
    canAddMore,
    comparisonCount,
    maxProducts: MAX_COMPARISON_PRODUCTS
  };
};