
import React, { useEffect, createContext, useContext } from 'react';
import { AffiliateProduct } from '@/types/affiliate';
import { trackProductAnalytics } from '@/services/affiliate/productService';
import { useToast } from '@/hooks/use-toast';

// Enum for different types of interactions
export enum ProductInteractionType {
  VIEW = 'view',
  CLICK = 'click',
  SAVE = 'save',
  SHARE = 'share',
  ADD_TO_CART = 'add_to_cart'
}

// Interface for tracking product interactions
interface ProductInteraction {
  productId: string;
  productName: string;
  interactionType: ProductInteractionType;
  category: string;
  additionalData?: any;
}

// Create a context to hold analytics-related functions
const ProductAnalyticsContext = createContext<{
  trackInteraction: (interaction: ProductInteraction) => void;
}>({
  trackInteraction: () => {}
});

// Hook to use the analytics context
export function useProductAnalytics() {
  return useContext(ProductAnalyticsContext);
}

// Provider component for product analytics
export const ProductAnalyticsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toast } = useToast();

  // Function to track product interactions
  const trackInteraction = async (interaction: ProductInteraction) => {
    try {
      await trackProductAnalytics({
        productId: interaction.productId,
        productName: interaction.productName,
        category: interaction.category,
        interactionType: interaction.interactionType,
        additionalData: interaction.additionalData
      });
    } catch (error) {
      console.error("Failed to track product interaction:", error);
      
      // Only show error toasts in development environment
      if (process.env.NODE_ENV === 'development') {
        toast({
          title: "Analytics Error",
          description: "Failed to record product interaction. This won't affect functionality.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <ProductAnalyticsContext.Provider value={{ trackInteraction }}>
      {children}
    </ProductAnalyticsContext.Provider>
  );
};

// Component to track a product view
export const ProductViewTracker: React.FC<{ product: AffiliateProduct }> = ({ product }) => {
  const { trackInteraction } = useProductAnalytics();

  useEffect(() => {
    // Track a view interaction when the component mounts
    trackInteraction({
      productId: product.id,
      productName: product.name,
      interactionType: ProductInteractionType.VIEW,
      category: product.category
    });
  }, [product.id, product.name, product.category, trackInteraction]);

  // This component doesn't render anything
  return null;
};

// Utility function to track click events
export const trackProductClick = (product: AffiliateProduct) => {
  // Get the analytics context
  const context = useContext(ProductAnalyticsContext);
  
  if (context) {
    context.trackInteraction({
      productId: product.id,
      productName: product.name,
      interactionType: ProductInteractionType.CLICK,
      category: product.category
    });
  } else {
    console.warn("ProductAnalyticsContext not available. Make sure to use ProductAnalyticsProvider.");
  }
};

export default ProductAnalyticsProvider;
