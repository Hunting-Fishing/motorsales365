import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Package } from 'lucide-react';
import { Container, Header, Grid, Segment } from 'semantic-ui-react';
import { useQuery } from '@tanstack/react-query';
import { getAffiliateTools } from '@/services/tools/toolService';
import { getToolCategories } from '@/services/tools/liveToolService';
import ProductCard from '@/components/affiliate/ProductCard';
import { Button } from '@/components/ui/button';
import { AffiliateTool, AffiliateProduct } from '@/types/affiliate';

export default function ToolCategoryPage() {
  const { category } = useParams<{ category: string }>();

  // Fetch tools and categories
  const { data: tools = [], isLoading: toolsLoading } = useQuery({
    queryKey: ['affiliate-tools'],
    queryFn: getAffiliateTools,
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['tool-categories'],
    queryFn: getToolCategories,
  });

  // Find the current category
  const currentCategory = useMemo(() => {
    return categories.find(cat => cat.slug === category);
  }, [categories, category]);

  // Filter tools by category and transform to AffiliateProduct
  const categoryTools = useMemo(() => {
    if (!currentCategory) return [];
    const filteredTools = tools.filter(tool => tool.category === 'Tools'); // For now, showing all tools
    
    // Transform AffiliateTool to AffiliateProduct
    return filteredTools.map((tool: AffiliateTool): AffiliateProduct => ({
      id: tool.id,
      name: tool.name,
      description: tool.description,
      imageUrl: tool.imageUrl || '/assets/tools/default.jpg',
      retailPrice: tool.price || 0,
      affiliateUrl: tool.affiliateLink,
      category: tool.category,
      tier: tool.featured ? 'premium' : 'economy',
      rating: tool.rating,
      reviewCount: tool.reviewCount,
      manufacturer: tool.manufacturer,
      isFeatured: tool.featured,
      bestSeller: tool.bestSeller,
      freeShipping: false,
      source: 'other' as const
    }));
  }, [tools, currentCategory]);

  if (categoriesLoading || toolsLoading) {
    return (
      <Container className="py-8">
        <div className="flex items-center justify-center min-h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Container>
    );
  }

  if (!currentCategory) {
    return (
      <Container className="py-8">
        <Segment textAlign="center" className="py-16">
          <Package className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <Header as="h2" className="text-2xl font-semibold mb-2">
            Category Not Found
          </Header>
          <p className="text-gray-600 mb-6">
            The category "{category}" could not be found.
          </p>
          <Link to="/shopping">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Shopping
            </Button>
          </Link>
        </Segment>
      </Container>
    );
  }

  return (
    <Container className="py-8">
      {/* Breadcrumb Navigation */}
      <div className="mb-6">
        <Link 
          to="/shopping" 
          className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Shopping
        </Link>
      </div>

      {/* Category Header */}
      <Segment raised className="mb-8">
        <div className="p-6">
          <Header as="h1" className="text-3xl font-bold mb-2">
            {currentCategory.name}
          </Header>
          {currentCategory.description && (
            <p className="text-gray-600 text-lg">
              {currentCategory.description}
            </p>
          )}
          <div className="mt-4 flex items-center text-sm text-gray-500">
            <Package className="mr-1 h-4 w-4" />
            {categoryTools.length} {categoryTools.length === 1 ? 'product' : 'products'} available
          </div>
        </div>
      </Segment>

      {/* Products Grid */}
      {categoryTools.length > 0 ? (
        <Grid columns={3} stackable doubling>
          {categoryTools.map((product) => (
            <Grid.Column key={product.id}>
              <ProductCard product={product} />
            </Grid.Column>
          ))}
        </Grid>
      ) : (
        <Segment textAlign="center" className="py-16">
          <Package className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <Header as="h3" className="text-xl font-semibold mb-2">
            No Products Available
          </Header>
          <p className="text-gray-600 mb-6">
            There are currently no products in the {currentCategory.name} category.
          </p>
          <Link to="/shopping">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Browse Other Categories
            </Button>
          </Link>
        </Segment>
      )}
    </Container>
  );
}