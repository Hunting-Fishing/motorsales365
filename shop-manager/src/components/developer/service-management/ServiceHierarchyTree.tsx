
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ChevronDown, 
  ChevronRight, 
  Search, 
  Database,
  FolderOpen,
  FileText,
  Wrench
} from 'lucide-react';
import { ServiceMainCategory, ServiceSubcategory, ServiceJob } from '@/types/service';

interface ServiceHierarchyTreeProps {
  categories: ServiceMainCategory[];
}

export function ServiceHierarchyTree({ categories }: ServiceHierarchyTreeProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [expandedSubcategories, setExpandedSubcategories] = useState<string[]>([]);

  const filteredCategories = useMemo(() => {
    if (!searchQuery) {
      return categories;
    }

    const lowerQuery = searchQuery.toLowerCase();
    return categories.filter(category =>
      category.name.toLowerCase().includes(lowerQuery) ||
      category.subcategories.some(subcategory =>
        subcategory.name.toLowerCase().includes(lowerQuery) ||
        subcategory.jobs.some(job => job.name.toLowerCase().includes(lowerQuery))
      )
    );
  }, [categories, searchQuery]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const toggleSubcategory = (subcategoryId: string) => {
    setExpandedSubcategories(prev => 
      prev.includes(subcategoryId) 
        ? prev.filter(id => id !== subcategoryId)
        : [...prev, subcategoryId]
    );
  };

  const isCategoryExpanded = (categoryId: string) => {
    return expandedCategories.includes(categoryId);
  };

  const isSubcategoryExpanded = (subcategoryId: string) => {
    return expandedSubcategories.includes(subcategoryId);
  };

  const totalJobs = categories.reduce((total, category) => 
    total + category.subcategories.reduce((subTotal, subcategory) => 
      subTotal + subcategory.jobs.length, 0), 0);

  const totalSubcategories = categories.reduce((total, category) => 
    total + category.subcategories.length, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-blue-500" />
            Service Hierarchy
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary">
              {categories.length} Categories
            </Badge>
            <Badge variant="outline">
              {totalSubcategories} Subcategories
            </Badge>
            <Badge variant="outline">
              {totalJobs} Services
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-gray-500" />
          <Input
            type="search"
            placeholder="Search categories, subcategories, or services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
        </div>

        {filteredCategories.length === 0 && searchQuery && (
          <Alert>
            <AlertDescription>
              No items found matching "<strong>{searchQuery}</strong>".
            </AlertDescription>
          </Alert>
        )}

        {filteredCategories.length === 0 && !searchQuery && (
          <Alert variant="destructive">
            <AlertDescription>
              No service categories available. Please import service data using the import functionality.
            </AlertDescription>
          </Alert>
        )}

        {filteredCategories.length > 0 && (
          <div className="space-y-2">
            {filteredCategories.map(category => (
              <div key={category.id} className="border rounded-lg">
                <Button
                  variant="ghost"
                  className="w-full p-3 justify-between font-normal hover:bg-gray-50"
                  onClick={() => toggleCategory(category.id)}
                >
                  <div className="flex items-center space-x-2">
                    {isCategoryExpanded(category.id) ? (
                      <ChevronDown className="h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    )}
                    <FolderOpen className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">{category.name}</span>
                  </div>
                  <Badge variant="secondary">
                    {category.subcategories.length} subcategories
                  </Badge>
                </Button>
                
                {isCategoryExpanded(category.id) && (
                  <div className="border-t bg-gray-50/50">
                    {category.subcategories.map(subcategory => (
                      <div key={subcategory.id} className="ml-4">
                        <Button
                          variant="ghost"
                          className="w-full p-2 justify-between font-normal text-sm hover:bg-gray-100"
                          onClick={() => toggleSubcategory(subcategory.id)}
                        >
                          <div className="flex items-center space-x-2">
                            {isSubcategoryExpanded(subcategory.id) ? (
                              <ChevronDown className="h-3 w-3 shrink-0" />
                            ) : (
                              <ChevronRight className="h-3 w-3 shrink-0" />
                            )}
                            <FileText className="h-3 w-3 text-green-600" />
                            <span>{subcategory.name}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {subcategory.jobs.length} services
                          </Badge>
                        </Button>
                        
                        {isSubcategoryExpanded(subcategory.id) && (
                          <div className="ml-6 border-l-2 border-gray-200 pl-3 pb-2">
                            {subcategory.jobs.length === 0 ? (
                              <div className="text-sm text-gray-500 py-2">
                                No services in this subcategory
                              </div>
                            ) : (
                              subcategory.jobs.map(job => (
                                <div key={job.id} className="py-1 flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <Wrench className="h-3 w-3 text-gray-400" />
                                    <span className="text-sm">{job.name}</span>
                                  </div>
                                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                                    {job.estimatedTime && (
                                      <span>{job.estimatedTime}min</span>
                                    )}
                                    {job.price && (
                                      <span>${job.price}</span>
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {category.subcategories.length === 0 && (
                      <div className="p-3 text-sm text-gray-500">
                        No subcategories in this category
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
