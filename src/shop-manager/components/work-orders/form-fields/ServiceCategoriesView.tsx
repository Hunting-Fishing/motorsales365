
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Clock, DollarSign, ChevronDown, ChevronRight } from 'lucide-react';
import { ServiceMainCategory } from '@/types/service';
import { useServiceCategories } from '@/hooks/useServiceCategories';

interface ServiceCategoriesViewProps {
  showSelectionMode?: boolean;
  categories?: ServiceMainCategory[];
}

export const ServiceCategoriesView: React.FC<ServiceCategoriesViewProps> = ({ 
  showSelectionMode = true,
  categories: providedCategories
}) => {
  const { categories: fetchedCategories, loading } = useServiceCategories();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set());

  // Use provided categories or fetch from hook
  const categories = providedCategories || fetchedCategories;

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleSubcategory = (subcategoryId: string) => {
    const newExpanded = new Set(expandedSubcategories);
    if (newExpanded.has(subcategoryId)) {
      newExpanded.delete(subcategoryId);
    } else {
      newExpanded.add(subcategoryId);
    }
    setExpandedSubcategories(newExpanded);
  };

  if (loading && !providedCategories) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Service Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!categories || categories.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Service Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No service categories available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Service Categories Overview</CardTitle>
        <p className="text-sm text-muted-foreground">
          Browse available service categories and their offerings
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {categories.map((category) => (
          <Collapsible
            key={category.id}
            open={expandedCategories.has(category.id)}
            onOpenChange={() => toggleCategory(category.id)}
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-4 h-auto bg-slate-50 hover:bg-slate-100"
              >
                <div className="flex items-center space-x-3">
                  {expandedCategories.has(category.id) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <div className="text-left">
                    <h3 className="font-semibold">{category.name}</h3>
                    {category.description && (
                      <p className="text-sm text-muted-foreground">
                        {category.description}
                      </p>
                    )}
                  </div>
                </div>
                <Badge variant="outline">
                  {category.subcategories.length} subcategories
                </Badge>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-6 space-y-2">
              {category.subcategories.map((subcategory) => (
                <Collapsible
                  key={subcategory.id}
                  open={expandedSubcategories.has(subcategory.id)}
                  onOpenChange={() => toggleSubcategory(subcategory.id)}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between p-3 h-auto bg-white hover:bg-gray-50 border"
                    >
                      <div className="flex items-center space-x-2">
                        {expandedSubcategories.has(subcategory.id) ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                        <span className="font-medium">{subcategory.name}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {subcategory.jobs.length} services
                      </Badge>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-6 space-y-1">
                    {subcategory.jobs.map((job) => (
                      <div
                        key={job.id}
                        className="p-3 bg-gray-50 border rounded-md"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{job.name}</h4>
                            {job.description && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {job.description}
                              </p>
                            )}
                          </div>
                          <div className="flex space-x-2 ml-3">
                            {job.estimatedTime && (
                              <Badge variant="outline" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                {job.estimatedTime}m
                              </Badge>
                            )}
                            {job.price && (
                              <Badge variant="outline" className="text-xs">
                                <DollarSign className="h-3 w-3 mr-1" />
                                ${job.price}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </CollapsibleContent>
          </Collapsible>
        ))}
      </CardContent>
    </Card>
  );
};
