import React, { useEffect, useRef } from 'react';
import { useProductAnalytics } from '@/hooks/shopping/useProductAnalytics';
import { AffiliateProduct } from '@/types/affiliate';

interface ProductViewTrackerProps {
  product: AffiliateProduct;
  threshold?: number; // Time in milliseconds before tracking view
}

const ProductViewTracker: React.FC<ProductViewTrackerProps> = ({ 
  product, 
  threshold = 1000 
}) => {
  const { trackInteraction } = useProductAnalytics();
  const viewedRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Track view after threshold time
    timeoutRef.current = setTimeout(() => {
      if (!viewedRef.current) {
        viewedRef.current = true;
        trackInteraction({
          productId: product.id,
          productName: product.name,
          interactionType: 'view',
          category: product.category,
          metadata: {
            price: product.retailPrice,
            manufacturer: product.manufacturer,
            rating: product.rating,
            viewedAt: new Date().toISOString()
          }
        });
      }
    }, threshold);

    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [product.id, product.name, product.category, product.retailPrice, product.manufacturer, product.rating, threshold, trackInteraction]);

  // This component doesn't render anything
  return null;
};

export default ProductViewTracker;