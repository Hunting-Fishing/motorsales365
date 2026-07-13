import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/layout/Layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { SubmitProductForm } from '@/components/affiliate/SubmitProductForm';
import { 
  Search, 
  Star, 
  TrendingUp, 
  Package, 
  Wrench, 
  Cog, 
  Heart,
  ExternalLink,
  Plus,
  ShoppingBag
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Product {
  id: string;
  title: string;
  name: string | null;
  description: string | null;
  image_url: string | null;
  price: number;
  sale_price: number | null;
  affiliate_link: string | null;
  is_featured: boolean;
  is_bestseller: boolean;
  average_rating: number | null;
  review_count: number | null;
  category_id: string | null;
}

const CATEGORIES = [
  { id: 'all', name: 'All Products', icon: Package },
  { id: 'tools', name: 'Tools', icon: Wrench },
  { id: 'equipment', name: 'Equipment', icon: Cog },
  { id: 'parts', name: 'Parts', icon: Package },
  { id: 'accessories', name: 'Accessories', icon: ShoppingBag },
];

function ProductCardSkeleton() {
  return (
    <Card className="overflow-hidden h-full flex flex-col">
      <Skeleton className="aspect-square w-full" />
      <CardContent className="flex-grow p-4 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-6 w-1/4" />
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Skeleton className="h-10 w-full" />
      </CardFooter>
    </Card>
  );
}

function StoreProductCard({ product }: { product: Product }) {
  const displayName = product.name || product.title;
  const displayPrice = product.sale_price || product.price;
  const hasDiscount = product.sale_price && product.sale_price < product.price;

  const handleClick = () => {
    if (product.affiliate_link) {
      window.open(product.affiliate_link, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Card className="overflow-hidden h-full flex flex-col transition-all hover:shadow-lg group">
      <div 
        className="relative aspect-square cursor-pointer overflow-hidden bg-muted"
        onClick={handleClick}
      >
        {product.image_url ? (
          <img 
            src={product.image_url} 
            alt={displayName} 
            className="h-full w-full object-contain bg-white p-2 transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <Package className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        {hasDiscount && (
          <Badge className="absolute top-2 right-2 bg-destructive text-destructive-foreground">
            Sale
          </Badge>
        )}
        {product.is_featured && (
          <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground">
            Featured
          </Badge>
        )}
        {product.is_bestseller && !product.is_featured && (
          <Badge className="absolute top-2 left-2 bg-amber-500 text-white">
            Best Seller
          </Badge>
        )}
      </div>
      
      <CardContent className="flex-grow p-4">
        <h3 
          className="font-medium text-base line-clamp-2 cursor-pointer hover:text-primary transition-colors mb-2"
          onClick={handleClick}
        >
          {displayName}
        </h3>
        
        {product.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {product.description}
          </p>
        )}
        
        <div className="flex items-center gap-2 mb-2">
          <span className="font-bold text-lg text-primary">
            {formatCurrency(displayPrice)}
          </span>
          {hasDiscount && (
            <span className="text-sm text-muted-foreground line-through">
              {formatCurrency(product.price)}
            </span>
          )}
        </div>
        
        {product.average_rating && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span>{product.average_rating.toFixed(1)}</span>
            {product.review_count && (
              <span>({product.review_count} reviews)</span>
            )}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="p-4 pt-0 flex gap-2">
        <Button 
          className="flex-1 gap-2"
          onClick={handleClick}
          disabled={!product.affiliate_link}
        >
          <ExternalLink className="h-4 w-4" />
          View Product
        </Button>
        <Button variant="outline" size="icon">
          <Heart className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function Store() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);

  // Fetch products from database
  const { data: products, isLoading } = useQuery({
    queryKey: ['store-products', searchQuery, selectedCategory],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*')
        .eq('is_approved', true)
        .eq('is_available', true)
        .not('affiliate_link', 'is', null)
        .order('is_featured', { ascending: false })
        .order('is_bestseller', { ascending: false })
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Product[];
    },
  });

  const featuredProducts = products?.filter(p => p.is_featured).slice(0, 4) || [];
  const bestSellers = products?.filter(p => p.is_bestseller && !p.is_featured).slice(0, 4) || [];
  const allProducts = products || [];

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background py-12 px-4">
          <div className="max-w-6xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4">
              <ShoppingBag className="h-4 w-4" />
              <span className="text-sm font-medium">Affiliate Store</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              Recommended Tools & Equipment
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
              Shop our curated selection of professional tools and equipment. 
              Support us by shopping through our affiliate links at no extra cost to you!
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-xl mx-auto">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Suggest a Product
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Suggest a Product</DialogTitle>
                  </DialogHeader>
                  <SubmitProductForm onSuccess={() => setSubmitDialogOpen(false)} />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Category Filter */}
          <div className="flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-hide">
            {CATEGORIES.map((category) => {
              const Icon = category.icon;
              return (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? 'default' : 'outline'}
                  size="sm"
                  className="gap-2 whitespace-nowrap"
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <Icon className="h-4 w-4" />
                  {category.name}
                </Button>
              );
            })}
          </div>

          {/* Featured Products */}
          {featuredProducts.length > 0 && (
            <section className="mb-12">
              <div className="flex items-center gap-2 mb-6">
                <Star className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Featured Products</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {featuredProducts.map((product) => (
                  <StoreProductCard key={product.id} product={product} />
                ))}
              </div>
            </section>
          )}

          {/* Best Sellers */}
          {bestSellers.length > 0 && (
            <section className="mb-12">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="h-5 w-5 text-amber-500" />
                <h2 className="text-xl font-semibold">Best Sellers</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {bestSellers.map((product) => (
                  <StoreProductCard key={product.id} product={product} />
                ))}
              </div>
            </section>
          )}

          {/* All Products */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-xl font-semibold">All Products</h2>
              </div>
              {products && (
                <span className="text-sm text-muted-foreground">
                  {products.length} products
                </span>
              )}
            </div>
            
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : allProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {allProducts.map((product) => (
                  <StoreProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No products found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery 
                    ? 'Try adjusting your search query'
                    : 'Check back soon for new products!'}
                </p>
                <Button variant="outline" onClick={() => setSubmitDialogOpen(true)}>
                  Suggest a Product
                </Button>
              </Card>
            )}
          </section>
        </div>
      </div>
    </Layout>
  );
}
