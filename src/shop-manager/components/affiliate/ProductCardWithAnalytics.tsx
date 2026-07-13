
import React from 'react';
import ProductCard from './ProductCard';
import { 
  ProductViewTracker, 
  useProductAnalytics,
  ProductInteractionType 
} from '@/components/developer/shopping/analytics/AnalyticsTracker';
import { AffiliateProduct } from '@/types/affiliate';

interface ProductCardWithAnalyticsProps {
  product: AffiliateProduct;
}

const ProductCardWithAnalytics: React.FC<ProductCardWithAnalyticsProps> = ({ product }) => {
  const { trackInteraction } = useProductAnalytics();

  const handleClick = () => {
    trackInteraction({
      productId: product.id,
      productName: product.name,
      interactionType: ProductInteractionType.CLICK,
      category: product.category
    });
  };

  const handleSave = () => {
    trackInteraction({
      productId: product.id,
      productName: product.name,
      interactionType: ProductInteractionType.SAVE,
      category: product.category
    });
  };
  
  const handleShare = () => {
    trackInteraction({
      productId: product.id,
      productName: product.name,
      interactionType: ProductInteractionType.SHARE,
      category: product.category
    });
  };

  const handleAddToCart = () => {
    trackInteraction({
      productId: product.id,
      productName: product.name,
      interactionType: ProductInteractionType.ADD_TO_CART,
      category: product.category
    });
  };

  return (
    <>
      <ProductViewTracker product={product} />
      <ProductCard 
        product={product} 
        onProductClick={handleClick}
        onSaveClick={handleSave}
        onShareClick={handleShare}
        onAddToCartClick={handleAddToCart}
      />
    </>
  );
};

export default ProductCardWithAnalytics;
