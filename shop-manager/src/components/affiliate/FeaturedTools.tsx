
import React from 'react';
import { Segment, Header } from 'semantic-ui-react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Sparkles, ShoppingCart, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AffiliateProduct } from '@/types/affiliate';

interface FeaturedToolsProps {
  tools?: AffiliateProduct[];
  isLoading?: boolean;
}

const FeaturedTools = ({ tools = [], isLoading = false }: FeaturedToolsProps) => {
  if (isLoading) {
    return (
      <Segment className="mb-6 bg-gradient-to-r from-yellow-50 to-amber-50 border-l-4 border-yellow-400">
        <Header as="h2" className="text-2xl font-semibold mb-4 flex items-center">
          <Sparkles className="mr-2 text-amber-500" />
          Featured Tools
        </Header>
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          <span className="ml-2 text-amber-700">Loading featured tools...</span>
        </div>
      </Segment>
    );
  }

  if (tools.length === 0) {
    return (
      <Segment className="mb-6 bg-gradient-to-r from-yellow-50 to-amber-50 border-l-4 border-yellow-400">
        <Header as="h2" className="text-2xl font-semibold mb-4 flex items-center">
          <Sparkles className="mr-2 text-amber-500" />
          Featured Tools
        </Header>
        <div className="text-center py-8">
          <p className="text-amber-700">No featured tools available at this time.</p>
        </div>
      </Segment>
    );
  }

  return (
    <Segment className="mb-6 bg-gradient-to-r from-yellow-50 to-amber-50 border-l-4 border-yellow-400">
      <Header as="h2" className="text-2xl font-semibold mb-4 flex items-center">
        <Sparkles className="mr-2 text-amber-500" />
        Featured Tools
      </Header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tools.map(tool => (
          <Card key={tool.id} className="h-full hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 border-t-4 border-amber-500">
            <CardContent className="p-0 relative">
              {tool.discount && (
                <div className="absolute top-2 left-2">
                  <Badge className="bg-red-100 text-red-800 border border-red-300">
                    {tool.discount}% OFF
                  </Badge>
                </div>
              )}
              <img
                src={tool.imageUrl}
                alt={tool.name}
                className="w-full h-[180px] object-cover"
              />
              <div className="p-4">
                <p className="font-medium mb-1">{tool.name}</p>
                <Badge variant="outline" className="mb-2 text-xs">{tool.category}</Badge>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-blue-600 font-bold">${tool.retailPrice.toFixed(2)}</span>
                  <span className="text-sm text-gray-600 flex items-center">
                    <Star size={14} className="text-yellow-500 mr-1 fill-yellow-500" /> 
                    {tool.rating ? tool.rating.toFixed(1) : "N/A"} 
                    {tool.reviewCount ? `(${tool.reviewCount})` : ""}
                  </span>
                </div>
                <Link to={`/tools/${tool.category.toLowerCase().replace(/\s+/g, '-')}/${tool.id}`}>
                  <Button className="w-full mt-3 bg-blue-600 hover:bg-blue-700">
                    <ShoppingCart size={16} className="mr-1" /> View Details
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </Segment>
  );
};

export default FeaturedTools;
