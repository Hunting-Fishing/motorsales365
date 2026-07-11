
import React, { useState } from 'react';
import { Container } from 'semantic-ui-react';
import CategoryGrid from '@/components/affiliate/CategoryGrid';
import HeroSection from '@/components/affiliate/HeroSection';
import SearchBar from '@/components/affiliate/SearchBar';
import FeaturedTools from '@/components/affiliate/FeaturedTools';
import BestSellingTools from '@/components/affiliate/BestSellingTools';
import ManufacturersGrid from '@/components/affiliate/ManufacturersGrid';
import { useQuery } from '@tanstack/react-query';
import { categories } from '@/data/toolCategories';
import { manufacturers } from '@/data/manufacturers';
import { supabase } from '@/integrations/supabase/client';

// Convert the categories dictionary to an array format for display
const categoryList = Object.keys(categories).map((name, id) => ({
  id: id.toString(),
  name,
  slug: name.toLowerCase().replace(/\s+/g, '-'),
  description: `Professional-grade ${name.toLowerCase()} tools for automotive repair and maintenance.`,
  subcategories: categories[name].slice(0, 5), // Show only first 5 subcategories in preview
}));

const AffiliateTool = () => {
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch featured tools from database
  const { data: featuredTools, isLoading: isFeaturedLoading } = useQuery({
    queryKey: ['featuredTools'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, title, description, image_url, price, affiliate_link')
        .eq('is_featured', true)
        .eq('is_approved', true)
        .limit(8);
      
      if (error) {
        console.error("Error fetching featured tools:", error);
        throw error;
      }
      
      // Map to AffiliateProduct format
      return (data || []).map(p => ({
        id: p.id,
        name: p.title || '',
        description: p.description || '',
        imageUrl: p.image_url || '',
        retailPrice: p.price || 0,
        affiliateUrl: p.affiliate_link || '',
        category: 'Tools',
        tier: 'economy' as const,
        manufacturer: '',
      }));
    },
  });

  // Fetch best selling tools from database
  const { data: bestSellingTools, isLoading: isBestSellingLoading } = useQuery({
    queryKey: ['bestSellingTools'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, title, description, image_url, price, affiliate_link')
        .eq('is_bestseller', true)
        .eq('is_approved', true)
        .limit(8);
      
      if (error) {
        console.error("Error fetching best selling tools:", error);
        throw error;
      }
      
      // Map to AffiliateProduct format
      return (data || []).map(p => ({
        id: p.id,
        name: p.title || '',
        description: p.description || '',
        imageUrl: p.image_url || '',
        retailPrice: p.price || 0,
        affiliateUrl: p.affiliate_link || '',
        category: 'Tools',
        tier: 'economy' as const,
        manufacturer: '',
        bestSeller: true,
      }));
    },
  });
  
  return (
    <Container fluid>
      {/* Hero Section */}
      <HeroSection />
      
      {/* Search Bar */}
      <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

      {/* Featured Products Section */}
      <FeaturedTools tools={featuredTools} isLoading={isFeaturedLoading} />
      
      {/* Categories Grid */}
      <CategoryGrid categories={categoryList} />
      
      {/* Best Selling Tools */}
      <BestSellingTools tools={bestSellingTools} isLoading={isBestSellingLoading} />
      
      {/* Manufacturers Section */}
      <ManufacturersGrid manufacturers={manufacturers} />
    </Container>
  );
};

export default AffiliateTool;
