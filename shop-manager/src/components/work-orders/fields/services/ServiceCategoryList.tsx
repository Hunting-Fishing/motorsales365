
import React, { useState } from 'react';
import { ServiceMainCategory, ServiceJob } from '@/types/service';
import { SelectedService } from '@/types/selectedService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';

interface ServiceCategoryListProps {
  categories: ServiceMainCategory[];
  onServiceSelect: (service: ServiceJob, categoryName: string, subcategoryName: string) => void;
  selectedServices: SelectedService[];
  onRemoveService: (serviceId: string) => void;
  onUpdateServices: (services: SelectedService[]) => void;
  expandedCategories?: string[];
  expandedSubcategories?: string[];
  searchHighlight?: string;
}

export const ServiceCategoryList: React.FC<ServiceCategoryListProps> = ({
  categories,
  onServiceSelect,
  selectedServices,
  onRemoveService,
  onUpdateServices,
  expandedCategories = [],
  expandedSubcategories = [],
  searchHighlight = ''
}) => {
  const [localExpandedCategories, setLocalExpandedCategories] = useState<string[]>([]);
  const [localExpandedSubcategories, setLocalExpandedSubcategories] = useState<string[]>([]);

  // Use provided expanded states or local state
  const effectiveExpandedCategories = expandedCategories.length > 0 ? expandedCategories : localExpandedCategories;
  const effectiveExpandedSubcategories = expandedSubcategories.length > 0 ? expandedSubcategories : localExpandedSubcategories;

  const toggleCategory = (categoryId: string) => {
    if (expandedCategories.length > 0) return; // Don't allow manual toggle when search is active
    
    if (localExpandedCategories.includes(categoryId)) {
      setLocalExpandedCategories(localExpandedCategories.filter(id => id !== categoryId));
    } else {
      setLocalExpandedCategories([...localExpandedCategories, categoryId]);
    }
  };

  const toggleSubcategory = (subcategoryId: string) => {
    if (expandedSubcategories.length > 0) return; // Don't allow manual toggle when search is active
    
    if (localExpandedSubcategories.includes(subcategoryId)) {
      setLocalExpandedSubcategories(localExpandedSubcategories.filter(id => id !== subcategoryId));
    } else {
      setLocalExpandedSubcategories([...localExpandedSubcategories, subcategoryId]);
    }
  };

  const isCategoryExpanded = (categoryId: string) => {
    return effectiveExpandedCategories.includes(categoryId);
  };

  const isSubcategoryExpanded = (subcategoryId: string) => {
    return effectiveExpandedSubcategories.includes(subcategoryId);
  };

  const isServiceSelected = (serviceId: string) => {
    return selectedServices.some(selected => selected.serviceId === serviceId);
  };

  // Highlight search terms in text
  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === highlight.toLowerCase() 
        ? <mark key={index} className="bg-yellow-200 px-1 rounded">{part}</mark>
        : part
    );
  };

  if (categories.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {searchHighlight ? 'No services found matching your search.' : 'No services available.'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {categories.map(category => (
        <Card key={category.id} className="border">
          <CardHeader className="flex flex-row items-center justify-between p-3 cursor-pointer" 
                     onClick={() => toggleCategory(category.id)}>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
              >
                {isCategoryExpanded(category.id) ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
              {highlightText(category.name, searchHighlight)}
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {category.subcategories.reduce((total, sub) => total + sub.jobs.length, 0)} services
            </Badge>
          </CardHeader>
          
          {isCategoryExpanded(category.id) && (
            <CardContent className="pl-6 pb-3">
              <div className="space-y-3">
                {category.subcategories.map(subcategory => (
                  <div key={subcategory.id} className="border rounded-md">
                    <div 
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleSubcategory(subcategory.id)}
                    >
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0"
                        >
                          {isSubcategoryExpanded(subcategory.id) ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                        </Button>
                        <h4 className="text-sm font-medium">
                          {highlightText(subcategory.name, searchHighlight)}
                        </h4>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {subcategory.jobs.length}
                      </Badge>
                    </div>
                    
                    {isSubcategoryExpanded(subcategory.id) && (
                      <div className="px-6 pb-3">
                        <div className="space-y-2">
                          {subcategory.jobs.map(service => (
                            <div
                              key={service.id}
                              className="flex items-center justify-between p-2 rounded-md hover:bg-muted/30 border"
                            >
                              <div className="flex-1">
                                <div className="text-sm font-medium">
                                  {highlightText(service.name, searchHighlight)}
                                </div>
                                {service.description && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {highlightText(service.description, searchHighlight)}
                                  </div>
                                )}
                                <div className="flex items-center gap-3 mt-1">
                                  {service.estimatedTime && (
                                    <span className="text-xs text-muted-foreground">
                                      {service.estimatedTime} min
                                    </span>
                                  )}
                                  {service.price && (
                                    <span className="text-xs font-medium text-green-600">
                                      ${service.price}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant={isServiceSelected(service.id) ? "secondary" : "outline"}
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isServiceSelected(service.id)) {
                                    onServiceSelect(service, category.name, subcategory.name);
                                  }
                                }}
                                disabled={isServiceSelected(service.id)}
                                className="ml-2"
                              >
                                {isServiceSelected(service.id) ? (
                                  "Selected"
                                ) : (
                                  <>
                                    <Plus className="h-3 w-3 mr-1" />
                                    Add
                                  </>
                                )}
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
};
