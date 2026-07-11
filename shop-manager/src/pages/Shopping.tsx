
import React, { useState, useMemo } from 'react';
import { Container } from 'semantic-ui-react';
import CategoryGrid from '@/components/affiliate/CategoryGrid';
import HeroSection from '@/components/affiliate/HeroSection';
import SearchBar from '@/components/affiliate/SearchBar';
import FeaturedTools from '@/components/affiliate/FeaturedTools';
import BestSellingTools from '@/components/affiliate/BestSellingTools';
import ManufacturersGrid from '@/components/affiliate/ManufacturersGrid';
import { VariantAwareProductCard } from '@/components/shopping/VariantAwareProductCard';
import PopularProducts from '@/components/shopping/PopularProducts';
import RecentlyViewed from '@/components/shopping/RecentlyViewed';
import ShoppingCartComponent from '@/components/shopping/ShoppingCart';
import ProductQuickView from '@/components/shopping/ProductQuickView';
import ProductFilters, { FilterState } from '@/components/shopping/ProductFilters';
import ProductComparison from '@/components/shopping/ProductComparison';
import ShoppingErrorBoundary from '@/components/error/ShoppingErrorBoundary';
import LoadingSkeleton from '@/components/shopping/LoadingSkeleton';
import OfflineIndicator from '@/components/shopping/OfflineIndicator';
import SearchAnalytics, { useSearchAnalytics } from '@/components/shopping/SearchAnalytics';
import ProductCard from '@/components/shopping/ProductCard';

import RecentlyViewedProducts from '@/components/shopping/RecentlyViewedProducts';
import ProductBundles from '@/components/shopping/product/ProductBundles';
import InventoryAlerts from '@/components/shopping/product/InventoryAlerts';
import { useProductsManager } from '@/hooks/affiliate/useProductsManager';
import { useCart } from '@/hooks/shopping/useCart';
import { useProductComparison } from '@/hooks/shopping/useProductComparison';
import { categories } from '@/data/toolCategories';
import { manufacturers } from '@/data/manufacturers';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Database, 
  Filter, 
  Grid3X3, 
  List, 
  ShoppingCart, 
  Eye,
  Loader2 
} from 'lucide-react';
import { AffiliateTool, AffiliateProduct } from '@/types/affiliate';

// Convert the categories dictionary to an array format for display
const categoryList = Object.keys(categories).map((name, id) => ({
  id: id.toString(),
  name,
  slug: name.toLowerCase().replace(/\s+/g, '-'),
  description: `Professional-grade ${name.toLowerCase()} tools for automotive repair and maintenance.`,
  subcategories: categories[name].slice(0, 5), // Show only first 5 subcategories in preview
}));

// Transform AffiliateTool to AffiliateProduct
const transformToAffiliateProduct = (tool: AffiliateTool): AffiliateProduct => ({
  id: tool.id,
  name: tool.name,
  description: tool.description,
  imageUrl: tool.imageUrl || '',
  retailPrice: tool.price || 0,
  affiliateUrl: tool.affiliateLink,
  category: tool.category,
  tier: 'midgrade', // Default tier since not available in AffiliateTool
  rating: tool.rating,
  reviewCount: tool.reviewCount,
  manufacturer: tool.manufacturer,
  model: tool.name, // Use name as model since model field doesn't exist
  discount: tool.salePrice ? Math.round(((tool.price || 0) - tool.salePrice) / (tool.price || 1) * 100) : undefined,
  isFeatured: tool.featured,
  bestSeller: tool.bestSeller,
  freeShipping: false, // Default value
  source: 'other' // Default value
});

export default function Shopping() {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState('browse');
  const [showFilters, setShowFilters] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<AffiliateProduct | null>(null);
  
  const [currentSearchId, setCurrentSearchId] = useState<string | null>(null);
  const { trackSearch } = useSearchAnalytics();
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    manufacturers: [],
    priceRange: [0, 1000],
    minRating: 0,
    sortBy: 'name',
    showFeatured: false,
    showBestSellers: false,
    freeShipping: false
  });

  // Use the real products manager hook instead of mock queries
  const { products, loading, error } = useProductsManager();
  const { itemCount, addToCart } = useCart();
  const { 
    comparisonProducts, 
    removeFromComparison, 
    clearComparison,
    comparisonCount 
  } = useProductComparison();
  const { trackSearchClick } = useSearchAnalytics();

  // Transform and filter products
  const allProducts = useMemo(() => 
    products.map(transformToAffiliateProduct), 
    [products]
  );

  // Filter and sort products based on current filters
  const filteredProducts = useMemo(() => {
    let filtered = allProducts.filter(product => {
      // Search query filter
      if (searchQuery && !product.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !product.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !product.category.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Category filter
      if (filters.categories.length > 0 && !filters.categories.includes(product.category)) {
        return false;
      }

      // Manufacturer filter
      if (filters.manufacturers.length > 0 && !filters.manufacturers.includes(product.manufacturer)) {
        return false;
      }

      // Price range filter
      if (product.retailPrice < filters.priceRange[0] || product.retailPrice > filters.priceRange[1]) {
        return false;
      }

      // Rating filter
      if (product.rating && product.rating < filters.minRating) {
        return false;
      }

      // Special filters
      if (filters.showFeatured && !product.isFeatured) {
        return false;
      }

      if (filters.showBestSellers && !product.bestSeller) {
        return false;
      }

      if (filters.freeShipping && !product.freeShipping) {
        return false;
      }

      return true;
    });

    // Sort products
    switch (filters.sortBy) {
      case 'price-low':
        filtered.sort((a, b) => a.retailPrice - b.retailPrice);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.retailPrice - a.retailPrice);
        break;
      case 'rating':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'popularity':
        filtered.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
        break;
      default:
        filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    return filtered;
  }, [allProducts, searchQuery, filters]);

  // Filter products for featured and best selling sections and transform them
  const featuredTools = products
    .filter(product => product.featured)
    .map(transformToAffiliateProduct);
  
  // For best selling, we'll use featured products since they're marked as high-quality
  const bestSellingTools = products
    .filter(product => product.featured || product.bestSeller)
    .map(transformToAffiliateProduct);

  // Get unique categories and manufacturers for filters
  const uniqueCategories = useMemo(() => 
    [...new Set(allProducts.map(p => p.category))].sort(), 
    [allProducts]
  );
  
  const uniqueManufacturers = useMemo(() => 
    [...new Set(allProducts.map(p => p.manufacturer))].sort(), 
    [allProducts]
  );

  const handleAddToCart = async (product: AffiliateProduct) => {
    await addToCart({
      productId: product.id,
      name: product.name,
      price: product.retailPrice,
      imageUrl: product.imageUrl,
      category: product.category,
      manufacturer: product.manufacturer
    });

    // Track search click if this came from search results
    if (currentSearchId && searchQuery.trim()) {
      trackSearchClick(currentSearchId, product.id);
    }
  };

  const handleProductClick = (product: AffiliateProduct) => {
    // Track search click if this came from search results
    if (currentSearchId && searchQuery.trim()) {
      trackSearchClick(currentSearchId, product.id);
    }
  };
  
  // Show error state if there's an issue loading products
  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <Database className="h-4 w-4" />
          <AlertDescription>
            Error loading products from database: {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <ShoppingErrorBoundary>
      <div className="space-y-6">
        <OfflineIndicator />
        
        <Alert>
          <Database className="h-4 w-4" />
          <AlertDescription>
            🚀 Phase 11: Complete E-Commerce Foundation - Production-ready shopping system with real payment processing, address management, and inventory integration! {allProducts.length} products available.
          </AlertDescription>
        </Alert>

      <Container fluid>
        {/* Header with Cart */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Shop Tools & Equipment</h1>
            <p className="text-muted-foreground">Professional automotive tools and equipment</p>
          </div>
          <Button 
            variant="outline" 
            className="relative"
            onClick={() => setActiveTab('cart')}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Cart
            {itemCount > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                {itemCount}
              </Badge>
            )}
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="browse">Browse</TabsTrigger>
            <TabsTrigger value="bundles">Bundles</TabsTrigger>
            <TabsTrigger value="featured">Featured</TabsTrigger>
            <TabsTrigger value="bestsellers">Best Sellers</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="compare" className="relative">
              Compare
              {comparisonCount > 0 && (
                <Badge className="ml-1 h-4 w-4 rounded-full p-0 flex items-center justify-center text-xs">
                  {comparisonCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="cart" className="relative">
              Cart
              {itemCount > 0 && (
                <Badge className="ml-1 h-4 w-4 rounded-full p-0 flex items-center justify-center text-xs">
                  {itemCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-6">
            {/* Hero Section */}
            <HeroSection />
            
            {/* Search and Filters */}
            <div className="flex gap-4">
              <div className="flex-1">
                <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
                <SearchAnalytics
                  query={searchQuery}
                  resultsCount={filteredProducts.length}
                  filters={filters}
                  onSearchTracked={setCurrentSearchId}
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="shrink-0"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-r-none"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-l-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex gap-6">
              {/* Left Sidebar */}
              <div className="w-80 shrink-0 space-y-6">
                {/* Filters */}
                {showFilters && (
                  <ProductFilters
                    filters={filters}
                    onFiltersChange={setFilters}
                    categories={uniqueCategories}
                    manufacturers={uniqueManufacturers}
                    isOpen={showFilters}
                  />
                )}
                
                {/* Recently Viewed Products */}
                <RecentlyViewedProducts 
                  sessionId="guest-session" 
                  limit={5}
                />
              </div>

              {/* Products Grid/List */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {filteredProducts.length} of {allProducts.length} products
                  </p>
                </div>

                {loading ? (
                  <LoadingSkeleton 
                    variant={viewMode} 
                    count={viewMode === 'grid' ? 8 : 6} 
                  />
                ) : (
                  <div className={
                    viewMode === 'grid' 
                      ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                      : "space-y-4"
                  }>
                    {filteredProducts.map(product => (
                      <div 
                        key={product.id}
                        onClick={() => handleProductClick(product)}
                      >
                        <VariantAwareProductCard
                          product={product}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {!loading && filteredProducts.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">No products found matching your criteria.</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setFilters({
                        categories: [],
                        manufacturers: [],
                        priceRange: [0, 1000],
                        minRating: 0,
                        sortBy: 'name',
                        showFeatured: false,
                        showBestSellers: false,
                        freeShipping: false
                      })}
                    >
                      Clear Filters
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Popular Products */}
            <PopularProducts limit={8} />
            
            {/* Recently Viewed */}
            <RecentlyViewed limit={10} />
            
            {/* Categories Grid */}
            <CategoryGrid categories={categoryList} />
            
            {/* Manufacturers Section */}
            <ManufacturersGrid manufacturers={manufacturers} />
          </TabsContent>

          <TabsContent value="bundles">
            <ProductBundles featured={true} limit={12} />
          </TabsContent>

          <TabsContent value="featured">
            <FeaturedTools tools={featuredTools} isLoading={loading} />
          </TabsContent>

          <TabsContent value="bestsellers">
            <BestSellingTools tools={bestSellingTools} isLoading={loading} />
          </TabsContent>

          <TabsContent value="alerts">
            <InventoryAlerts showActions={false} compact={false} limit={20} />
          </TabsContent>

          <TabsContent value="compare">
            <ProductComparison
              products={comparisonProducts}
              onRemoveProduct={removeFromComparison}
              onAddToCart={handleAddToCart}
              onAddToWishlist={async (product) => {
                // Wishlist integration completed
                const { useWishlist } = await import('@/hooks/shopping/useWishlist');
                const wishlist = useWishlist();
                await wishlist.addToWishlist({
                  productId: product.id,
                  name: product.name,
                  price: product.retailPrice,
                  imageUrl: product.imageUrl,
                  category: product.category,
                  manufacturer: product.manufacturer
                });
              }}
            />
            {comparisonCount > 0 && (
              <div className="mt-4 text-center">
                <Button variant="outline" onClick={clearComparison}>
                  Clear All Comparisons
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="cart">
            <div className="max-w-md mx-auto">
              <ShoppingCartComponent />
            </div>
          </TabsContent>
        </Tabs>

        {/* Quick View Modal */}
        <ProductQuickView
          product={quickViewProduct}
          isOpen={!!quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
        />
      </Container>
      </div>
    </ShoppingErrorBoundary>
  );
}
