import React, { useState } from 'react';
import { ServiceMainCategory } from '@/types/service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Edit, Trash2, Plus } from 'lucide-react';

interface ServiceCategoryListProps {
  categories: ServiceMainCategory[];
  onServiceSelect: (serviceId: string, categoryName: string, subcategoryName: string) => void;
  selectedServices: any[];
}

export function ServiceCategoryList({
  categories,
  onServiceSelect,
  selectedServices
}: ServiceCategoryListProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  const toggleCategory = (categoryId: string) => {
    if (expandedCategories.includes(categoryId)) {
      setExpandedCategories(expandedCategories.filter(id => id !== categoryId));
    } else {
      setExpandedCategories([...expandedCategories, categoryId]);
    }
  };

  const isCategoryExpanded = (categoryId: string) => {
    return expandedCategories.includes(categoryId);
  };

  const isServiceSelected = (serviceId: string) => {
    return selectedServices.some(selected => selected.serviceId === serviceId);
  };

  return (
    <div className="space-y-4">
      {categories.map(category => (
        <Card key={category.id}>
          <CardHeader className="flex items-center justify-between p-3">
            <CardTitle className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleCategory(category.id)}
                className="h-8 w-8 p-0"
              >
                {isCategoryExpanded(category.id) ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
              {category.name}
            </CardTitle>
            <Badge variant="secondary">{category.subcategories.length} Subcategories</Badge>
          </CardHeader>
          {isCategoryExpanded(category.id) && (
            <CardContent className="pl-12">
              <div className="space-y-2">
                {category.subcategories.map(subcategory => (
                  <div key={subcategory.id} className="border rounded-md p-3">
                    <h4 className="text-sm font-medium">{subcategory.name}</h4>
                    <ul className="mt-2 space-y-1">
                      {subcategory.jobs.map(service => (
                        <li
                          key={service.id}
                          className="flex items-center justify-between p-2 rounded-md hover:bg-gray-100"
                        >
                          <span className="text-xs">{service.name}</span>
                          <Button
                            variant={isServiceSelected(service.id) ? "secondary" : "outline"}
                            size="xs"
                            onClick={() => onServiceSelect(service.id, category.name, subcategory.name)}
                            disabled={isServiceSelected(service.id)}
                          >
                            {isServiceSelected(service.id) ? "Selected" : <Plus className="h-3 w-3 mr-1" />}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
