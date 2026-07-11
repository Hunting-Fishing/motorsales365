
import { useState, useEffect } from 'react';
import { 
  getProducts, 
  getProductsByCategory, 
  getProductsByManufacturer,
  getProductsByFeaturedGroup,
  createProduct,
  updateProduct,
  deleteProduct,
  ProductData 
} from '@/services/affiliate/productService';
import { AffiliateTool } from '@/types/affiliate';
import { toast } from 'sonner';

interface UseProductsManagerReturn {
  products: AffiliateTool[];
  loading: boolean;
  error: string | null;
  fetchProducts: () => Promise<void>;
  fetchProductsByCategory: (category: string) => Promise<void>;
  fetchProductsByManufacturer: (manufacturer: string) => Promise<void>;
  fetchProductsByFeaturedGroup: (groupId: string) => Promise<void>;
  handleCreateProduct: (productData: Partial<ProductData>) => Promise<void>;
  handleUpdateProduct: (id: string, productData: Partial<ProductData>) => Promise<void>;
  handleDeleteProduct: (id: string) => Promise<void>;
}

// Transform ProductData to AffiliateTool
const transformProductToAffiliateTool = (product: ProductData): AffiliateTool => ({
  id: product.id,
  name: product.name,
  description: product.description,
  slug: product.slug,
  price: product.price,
  imageUrl: product.image_url,
  category: product.category,
  subcategory: product.subcategory,
  manufacturer: product.manufacturer,
  rating: product.average_rating,
  reviewCount: product.review_count,
  featured: product.featured,
  bestSeller: product.featured, // Use featured as bestseller since we don't have separate field
  affiliateLink: product.affiliate_link,
  seller: product.seller || 'Tool Supply Co',
  tags: product.tags || []
});

export function useProductsManager(): UseProductsManagerReturn {
  const [products, setProducts] = useState<AffiliateTool[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getProducts();
      setProducts(data.map(transformProductToAffiliateTool));
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const fetchProductsByCategory = async (category: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getProductsByCategory(category);
      setProducts(data.map(transformProductToAffiliateTool));
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to fetch products by category');
    } finally {
      setLoading(false);
    }
  };

  const fetchProductsByManufacturer = async (manufacturer: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getProductsByManufacturer(manufacturer);
      setProducts(data.map(transformProductToAffiliateTool));
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to fetch products by manufacturer');
    } finally {
      setLoading(false);
    }
  };

  const fetchProductsByFeaturedGroup = async (groupId: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getProductsByFeaturedGroup(groupId);
      setProducts(data.map(transformProductToAffiliateTool));
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to fetch products by featured group');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async (productData: Partial<ProductData>) => {
    try {
      const newProduct = await createProduct(productData);
      setProducts(prev => [...prev, transformProductToAffiliateTool(newProduct)]);
      toast.success(`Product "${newProduct.name}" created successfully`);
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to create product');
      throw err;
    }
  };

  const handleUpdateProduct = async (id: string, productData: Partial<ProductData>) => {
    try {
      const updatedProduct = await updateProduct(id, productData);
      setProducts(prev => 
        prev.map(product => 
          product.id === id 
            ? transformProductToAffiliateTool(updatedProduct)
            : product
        )
      );
      toast.success(`Product "${updatedProduct.name}" updated successfully`);
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to update product');
      throw err;
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await deleteProduct(id);
      setProducts(prev => prev.filter(product => product.id !== id));
      toast.success('Product deleted successfully');
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to delete product');
      throw err;
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return {
    products,
    loading,
    error,
    fetchProducts,
    fetchProductsByCategory,
    fetchProductsByManufacturer,
    fetchProductsByFeaturedGroup,
    handleCreateProduct,
    handleUpdateProduct,
    handleDeleteProduct
  };
}
