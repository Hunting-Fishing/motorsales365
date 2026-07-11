
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import ProductCard from '@/components/affiliate/ProductCard';

// Define interface that matches the actual database schema
interface DatabaseProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  image_url: string;
  affiliate_link: string;
  average_rating: number;
  review_count: number;
  category_id: string;
  created_at: string;
  updated_at: string;
  is_approved: boolean;
  is_featured: boolean;
  is_bestseller: boolean;
  product_type: string;
  stock_quantity: number;
  sku: string;
}

export default function ManufacturerPage() {
  const { manufacturer } = useParams<{ manufacturer: string }>();
  const [products, setProducts] = useState<DatabaseProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (manufacturer) {
      fetchManufacturerProducts();
    }
  }, [manufacturer]);

  const fetchManufacturerProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Since manufacturer column doesn't exist, we'll search in description for now
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_approved', true)
        .eq('product_type', 'affiliate')
        .or(`title.ilike.%${manufacturer}%,description.ilike.%${manufacturer}%`);

      if (error) throw error;

      setProducts(data || []);
    } catch (error: any) {
      console.error('Error fetching manufacturer products:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading products...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">{manufacturer} Products</h1>
      
      {products.length === 0 ? (
        <div className="text-center text-gray-600">
          No products found for this manufacturer.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => {
            // Transform to AffiliateProduct for ProductCard
            const affiliateProduct = {
              id: product.id,
              name: product.title || 'Product',
              description: product.description || '',
              imageUrl: product.image_url || '',
              retailPrice: product.price || 0,
              affiliateUrl: product.affiliate_link || '',
              category: 'Tools',
              tier: 'midgrade' as const,
              rating: product.average_rating || 0,
              reviewCount: product.review_count || 0,
              manufacturer: manufacturer || 'Professional Tools',
              isFeatured: product.is_featured || false,
              bestSeller: product.is_bestseller || false
            };
            
            return (
              <ProductCard key={product.id} product={affiliateProduct} />
            );
          })}
        </div>
      )}
    </div>
  );
};
