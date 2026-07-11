import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Package } from 'lucide-react';
import { AffiliateProduct } from '@/types/affiliate';
import { useProductsManager } from '@/hooks/affiliate/useProductsManager';
import { formatCurrency } from '@/lib/utils';
import { ProductRating } from '@/components/affiliate/ProductRating';
import { useNavigate } from 'react-router-dom';

interface RelatedProductsProps {
  currentProduct: AffiliateProduct;
  limit?: number;
}

const RelatedProducts: React.FC<RelatedProductsProps> = ({ 
  currentProduct, 
  limit = 8 
}) => {
  const [relatedProducts, setRelatedProducts] = useState<AffiliateProduct[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { products, loading } = useProductsManager();
  const navigate = useNavigate();

  useEffect(() => {
    if (products.length > 0) {
      findRelatedProducts();
    }
  }, [products, currentProduct]);

  const findRelatedProducts = () => {
    // Find products in the same category, excluding the current product
    const related = products
      .filter(product => 
        product.id !== currentProduct.id && 
        product.category === currentProduct.category
      )
      .map(product => ({
        id: product.id,
        name: product.name,
        description: product.description || '',
        imageUrl: product.imageUrl || '',
        retailPrice: product.price || 0,
        affiliateUrl: product.affiliateLink || '#',
        category: product.category || 'Tools',
        tier: 'midgrade' as const,
        rating: product.rating || 0,
        reviewCount: product.reviewCount || 0,
        manufacturer: 'Professional Tools',
        model: product.name,
        isFeatured: product.featured || false,
        bestSeller: product.bestSeller || false,
        freeShipping: false,
        source: 'other' as const
      }))
      .slice(0, limit);

    // If not enough products in the same category, fill with random products
    if (related.length < limit) {
      const additionalProducts = products
        .filter(product => 
          product.id !== currentProduct.id && 
          !related.some(rp => rp.id === product.id)
        )
        .map(product => ({
          id: product.id,
          name: product.name,
          description: product.description || '',
          imageUrl: product.imageUrl || '',
          retailPrice: product.price || 0,
          affiliateUrl: product.affiliateLink || '#',
          category: product.category || 'Tools',
          tier: 'midgrade' as const,
          rating: product.rating || 0,
          reviewCount: product.reviewCount || 0,
          manufacturer: 'Professional Tools',
          model: product.name,
          isFeatured: product.featured || false,
          bestSeller: product.bestSeller || false,
          freeShipping: false,
          source: 'other' as const
        }))
        .slice(0, limit - related.length);

      related.push(...additionalProducts);
    }

    setRelatedProducts(related);
  };

  const handleNext = () => {
    setCurrentIndex(prev => 
      prev + 4 >= relatedProducts.length ? 0 : prev + 4
    );
  };

  const handlePrev = () => {
    setCurrentIndex(prev => 
      prev - 4 < 0 ? Math.max(0, relatedProducts.length - 4) : prev - 4
    );
  };

  const handleProductClick = (productId: string) => {
    navigate(`/product/${productId}`);
  };

  if (loading || relatedProducts.length === 0) {
    return null;
  }

  const visibleProducts = relatedProducts.slice(currentIndex, currentIndex + 4);
  const canNavigate = relatedProducts.length > 4;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Related Products
          </CardTitle>
          {canNavigate && (
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrev}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNext}
                disabled={currentIndex + 4 >= relatedProducts.length}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {visibleProducts.map(product => (
            <div
              key={product.id}
              className="group cursor-pointer"
              onClick={() => handleProductClick(product.id)}
            >
              <Card className="h-full hover:shadow-md transition-shadow">
                <div className="aspect-square overflow-hidden rounded-t-lg">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <CardContent className="p-3">
                  <h3 className="font-medium text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                    {product.name}
                  </h3>
                  <div className="space-y-2">
                    <div className="font-bold text-lg">
                      {formatCurrency(product.retailPrice)}
                    </div>
                    {product.rating > 0 && (
                      <ProductRating 
                        rating={product.rating} 
                        reviewCount={product.reviewCount}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {canNavigate && (
          <div className="flex justify-center mt-4">
            <div className="flex gap-1">
              {Array.from({ length: Math.ceil(relatedProducts.length / 4) }).map((_, index) => (
                <button
                  key={index}
                  className={`h-2 w-2 rounded-full transition-colors ${
                    Math.floor(currentIndex / 4) === index
                      ? 'bg-primary'
                      : 'bg-muted-foreground/30'
                  }`}
                  onClick={() => setCurrentIndex(index * 4)}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RelatedProducts;