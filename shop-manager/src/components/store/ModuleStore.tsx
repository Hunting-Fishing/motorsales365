import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
  Heart,
  ExternalLink,
  Plus,
  LucideIcon,
  ShoppingBag
} from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { FadeIn, SlideIn } from '@/components/layout/AnimatedPage';
import { AnimatedGrid } from '@/components/ui/animated-list';
import { motion } from 'framer-motion';
import { useWishlist } from '@/hooks/shopping/useWishlist';
import { useAffiliateTracking } from '@/hooks/useAffiliateTracking';
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
  module_id: string | null;
}

export interface StoreCategory {
  id: string;
  name: string;
  icon: LucideIcon;
}

export interface ModuleStoreProps {
  moduleId: string;
  moduleName: string;
  moduleIcon: LucideIcon;
  accentColor: string;
  categories: StoreCategory[];
}

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

interface StoreProductCardProps {
  product: Product;
  isInWishlist: boolean;
  onToggleWishlist: () => void;
  wishlistLoading: boolean;
}

function StoreProductCard({ product, isInWishlist, onToggleWishlist, wishlistLoading }: StoreProductCardProps) {
  const displayName = product.name || product.title;
  const displayPrice = product.sale_price || product.price;
  const hasDiscount = product.sale_price && product.sale_price < product.price;

  const handleClick = () => {
    if (product.affiliate_link) {
      window.open(product.affiliate_link, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
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
          <motion.div
            whileTap={{ scale: 0.85 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <Button 
              variant="outline" 
              size="icon"
              onClick={onToggleWishlist}
              disabled={wishlistLoading}
              className="relative"
            >
              <motion.div
                animate={isInWishlist ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Heart 
                  className={cn(
                    "h-4 w-4 transition-colors",
                    isInWishlist && "fill-red-500 text-red-500"
                  )}
                />
              </motion.div>
            </Button>
          </motion.div>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

export function ModuleStore({ 
  moduleId, 
  moduleName, 
  moduleIcon: ModuleIcon, 
  accentColor,
  categories 
}: ModuleStoreProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  
  // Wishlist integration
  const { items: wishlistItems, loading: wishlistLoading, addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const wishlistProductIds = React.useMemo(() => wishlistItems.map(item => item.productId), [wishlistItems]);

  // Affiliate tracking
  const { trackClick } = useAffiliateTracking(moduleId);

  const handleBannerClick = () => {
    trackClick('banner', 'https://amzn.to/4b7nheJ');
  };

  // Add Favorites to categories
  const allCategories: StoreCategory[] = React.useMemo(() => [
    ...categories,
    { id: 'favorites', name: 'Favorites', icon: Heart }
  ], [categories]);

  // Fetch products filtered by module_id and category
  const { data: products, isLoading } = useQuery({
    queryKey: ['store-products', moduleId, searchQuery, selectedCategory],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*, category:product_categories(id, name, slug)')
        .eq('is_approved', true)
        .eq('is_available', true)
        .eq('module_id', moduleId)
        .not('affiliate_link', 'is', null)
        .order('is_featured', { ascending: false })
        .order('is_bestseller', { ascending: false })
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as (Product & { category?: { id: string; name: string; slug: string } })[];
    },
  });

  // Client-side filter by category (including favorites)
  const filteredByCategory = React.useMemo(() => {
    if (!products) return [];
    
    // Handle Favorites tab
    if (selectedCategory === 'favorites') {
      return products.filter(product => wishlistProductIds.includes(product.id));
    }
    
    if (selectedCategory === 'all') return products;
    
    // Match by category slug from product_categories table
    return products.filter(product => {
      if (!product.category) return false;
      return product.category.slug === selectedCategory || product.category.id === selectedCategory;
    });
  }, [products, selectedCategory, wishlistProductIds]);

  const featuredProducts = selectedCategory === 'favorites' ? [] : filteredByCategory.filter(p => p.is_featured).slice(0, 4);
  const bestSellers = selectedCategory === 'favorites' ? [] : filteredByCategory.filter(p => p.is_bestseller && !p.is_featured).slice(0, 4);
  const allProducts = filteredByCategory;

  // Handle wishlist toggle
  const handleToggleWishlist = async (product: Product) => {
    const productData = {
      productId: product.id,
      name: product.name || product.title,
      price: product.sale_price || product.price,
      imageUrl: product.image_url || '',
      category: 'Store',
      manufacturer: 'Various'
    };
    
    if (isInWishlist(product.id)) {
      await removeFromWishlist(product.id);
    } else {
      await addToWishlist(productData);
    }
  };

  // Generate gradient class based on accent color
  const getGradientClass = () => {
    const gradients: Record<string, string> = {
      cyan: 'from-cyan-500/10 via-blue-500/5',
      orange: 'from-orange-500/10 via-amber-500/5',
      green: 'from-green-500/10 via-emerald-500/5',
      purple: 'from-purple-500/10 via-violet-500/5',
      red: 'from-red-500/10 via-rose-500/5',
      blue: 'from-blue-500/10 via-indigo-500/5',
    };
    return gradients[accentColor] || gradients.cyan;
  };

  const getAccentTextClass = () => {
    const colors: Record<string, string> = {
      cyan: 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/10',
      orange: 'text-orange-600 dark:text-orange-400 bg-orange-500/10',
      green: 'text-green-600 dark:text-green-400 bg-green-500/10',
      purple: 'text-purple-600 dark:text-purple-400 bg-purple-500/10',
      red: 'text-red-600 dark:text-red-400 bg-red-500/10',
      blue: 'text-blue-600 dark:text-blue-400 bg-blue-500/10',
    };
    return colors[accentColor] || colors.cyan;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <FadeIn>
        <div className={`bg-gradient-to-br ${getGradientClass()} to-background py-12 px-4`}>
          <div className="max-w-6xl mx-auto text-center">
            <motion.div 
              className={`inline-flex items-center gap-2 ${getAccentTextClass()} px-4 py-2 rounded-full mb-4`}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <ModuleIcon className="h-4 w-4" />
              <span className="text-sm font-medium">Pro Shop</span>
            </motion.div>
            <motion.h1 
              className="text-3xl md:text-4xl font-bold mb-3"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {moduleName} Equipment & Gear
            </motion.h1>
            <motion.p 
              className="text-muted-foreground max-w-2xl mx-auto mb-8"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Professional equipment trusted by {moduleName.toLowerCase()} experts. 
              Shop our curated selection of top-rated products for your business.
            </motion.p>
            
            <SlideIn direction="up" delay={0.4} className="flex flex-col sm:flex-row gap-3 justify-center max-w-xl mx-auto">
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
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Suggest a Product
                    </Button>
                  </motion.div>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Suggest a Product</DialogTitle>
                  </DialogHeader>
                  <SubmitProductForm 
                    moduleId={moduleId}
                    onSuccess={() => setSubmitDialogOpen(false)} 
                  />
                </DialogContent>
              </Dialog>
            </SlideIn>
          </div>
        </div>
      </FadeIn>

      {/* Amazon Affiliate Banner */}
      <motion.a
        href="https://amzn.to/4b7nheJ"
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleBannerClick}
        className="block max-w-6xl mx-auto px-4 mb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        whileHover={{ scale: 1.01 }}
      >
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-4 shadow-lg">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
                <ShoppingBag className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm md:text-base">
                  Shop on Amazon
                </p>
                <p className="text-white/80 text-xs md:text-sm">
                  Find more professional equipment and supplies
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
              <span className="text-white text-sm font-medium hidden sm:inline">
                Browse Now
              </span>
              <ExternalLink className="h-4 w-4 text-white" />
            </div>
          </div>
          {/* Decorative elements */}
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
          <div className="absolute -right-8 -bottom-8 h-32 w-32 rounded-full bg-white/5" />
        </div>
      </motion.a>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Category Filter */}
        <SlideIn direction="right" delay={0.2} className="flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-hide">
          {allCategories.map((category) => {
            const Icon = category.icon;
            const isFavorites = category.id === 'favorites';
            const favoritesCount = isFavorites ? wishlistProductIds.length : 0;
            
            return (
              <motion.div
                key={category.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant={selectedCategory === category.id ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    "gap-2 whitespace-nowrap",
                    isFavorites && selectedCategory === 'favorites' && "bg-red-500 hover:bg-red-600 text-white border-red-500"
                  )}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <Icon className={cn("h-4 w-4", isFavorites && wishlistProductIds.length > 0 && "fill-current")} />
                  {category.name}
                  {isFavorites && favoritesCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                      {favoritesCount}
                    </Badge>
                  )}
                </Button>
              </motion.div>
            );
          })}
        </SlideIn>

        {/* Featured Products */}
        {featuredProducts.length > 0 && (
          <section className="mb-12">
            <FadeIn delay={0.3}>
              <div className="flex items-center gap-2 mb-6">
                <Star className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Featured Products</h2>
              </div>
            </FadeIn>
            <AnimatedGrid columns={4} staggerDelay={0.08} className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product) => (
                <StoreProductCard 
                  key={product.id} 
                  product={product}
                  isInWishlist={isInWishlist(product.id)}
                  onToggleWishlist={() => handleToggleWishlist(product)}
                  wishlistLoading={wishlistLoading}
                />
              ))}
            </AnimatedGrid>
          </section>
        )}

        {/* Best Sellers */}
        {bestSellers.length > 0 && (
          <section className="mb-12">
            <FadeIn delay={0.4}>
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="h-5 w-5 text-amber-500" />
                <h2 className="text-xl font-semibold">Best Sellers</h2>
              </div>
            </FadeIn>
            <AnimatedGrid columns={4} staggerDelay={0.08} className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {bestSellers.map((product) => (
                <StoreProductCard 
                  key={product.id} 
                  product={product}
                  isInWishlist={isInWishlist(product.id)}
                  onToggleWishlist={() => handleToggleWishlist(product)}
                  wishlistLoading={wishlistLoading}
                />
              ))}
            </AnimatedGrid>
          </section>
        )}

        {/* All Products / Favorites */}
        <section>
          <FadeIn delay={0.5}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                {selectedCategory === 'favorites' ? (
                  <Heart className="h-5 w-5 text-red-500 fill-red-500" />
                ) : (
                  <Package className="h-5 w-5 text-muted-foreground" />
                )}
                <h2 className="text-xl font-semibold">
                  {selectedCategory === 'favorites' ? 'Your Favorites' : 'All Products'}
                </h2>
              </div>
              {allProducts.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {allProducts.length} product{allProducts.length !== 1 ? 's' : ''}
                  {selectedCategory !== 'all' && selectedCategory !== 'favorites' && products && allProducts.length !== products.length && (
                    <span className="text-muted-foreground/70"> (of {products.length} total)</span>
                  )}
                </span>
              )}
            </div>
          </FadeIn>
          
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : allProducts.length > 0 ? (
            <AnimatedGrid columns={4} staggerDelay={0.05} className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {allProducts.map((product) => (
                <StoreProductCard 
                  key={product.id} 
                  product={product}
                  isInWishlist={isInWishlist(product.id)}
                  onToggleWishlist={() => handleToggleWishlist(product)}
                  wishlistLoading={wishlistLoading}
                />
              ))}
            </AnimatedGrid>
          ) : (
            <FadeIn delay={0.3}>
              <Card className="p-12 text-center">
                {selectedCategory === 'favorites' ? (
                  <>
                    <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No favorites yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Click the heart icon on products to save them to your favorites
                    </p>
                    <Button variant="outline" onClick={() => setSelectedCategory('all')}>
                      Browse Products
                    </Button>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </Card>
            </FadeIn>
          )}
        </section>
      </div>
    </div>
  );
}
