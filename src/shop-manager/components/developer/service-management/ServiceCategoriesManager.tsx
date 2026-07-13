
import React, { useState } from 'react';
import { ServiceMainCategory } from '@/types/service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Edit, Trash2, ChevronDown, ChevronRight, RefreshCw, AlertCircle, Eye, EyeOff, Search, MoreVertical } from 'lucide-react';

interface ServiceCategoriesManagerProps {
  categories: ServiceMainCategory[];
  onCategoryCreate?: (category: Omit<ServiceMainCategory, 'id'>) => void;
  onCategoryUpdate?: (category: ServiceMainCategory) => void;
  onCategoryDelete?: (categoryId: string) => void;
  onRefresh?: () => void;
}

export function ServiceCategoriesManager({
  categories,
  onCategoryCreate,
  onCategoryUpdate,
  onCategoryDelete,
  onRefresh
}: ServiceCategoriesManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [showDetails, setShowDetails] = useState(false);

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleCategory = (categoryId: string) => {
    if (expandedCategories.includes(categoryId)) {
      setExpandedCategories(expandedCategories.filter(id => id !== categoryId));
    } else {
      setExpandedCategories([...expandedCategories, categoryId]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Service Categories</h3>
          <p className="text-sm text-gray-500">Manage your service category hierarchy</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => onCategoryCreate?.({ name: 'New Category', description: '', subcategories: [] })}>
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {categories.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No service categories found. Import service data or create categories manually.
          </AlertDescription>
        </Alert>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {showDetails ? 'Hide Details' : 'Show Details'}
          </Button>
        </div>
        <Badge variant="secondary">{filteredCategories.length} categories</Badge>
      </div>

      {/* Categories List */}
      <div className="space-y-2">
        {filteredCategories.map((category) => (
          <Card key={category.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleCategory(category.id)}
                    className="h-6 w-6 p-0"
                  >
                    {expandedCategories.includes(category.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                  <div>
                    <CardTitle className="text-base">{category.name}</CardTitle>
                    {showDetails && category.description && (
                      <p className="text-sm text-gray-500">{category.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{category.subcategories.length} subcategories</Badge>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            {expandedCategories.includes(category.id) && (
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {category.subcategories.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No subcategories</p>
                  ) : (
                    category.subcategories.map((subcategory) => (
                      <div key={subcategory.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <span className="font-medium text-sm">{subcategory.name}</span>
                          {showDetails && subcategory.description && (
                            <p className="text-xs text-gray-500">{subcategory.description}</p>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {subcategory.jobs.length} services
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredCategories.length === 0 && searchQuery && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No categories found matching "{searchQuery}". Try adjusting your search.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Total: {categories.length} categories with {categories.reduce((total, cat) => total + cat.subcategories.length, 0)} subcategories
        </AlertDescription>
      </Alert>
    </div>
  );
}
