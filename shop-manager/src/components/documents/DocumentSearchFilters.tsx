
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { useDocumentCategories } from '@/hooks/useDocumentCategories';
import { DocumentSearchParams } from '@/types/document';

interface DocumentSearchFiltersProps {
  onFilterChange: (filters: Partial<DocumentSearchParams>) => void;
  currentFilters: DocumentSearchParams;
}

export function DocumentSearchFilters({ onFilterChange, currentFilters }: DocumentSearchFiltersProps) {
  const { categories } = useDocumentCategories();

  const handleCategoryChange = (value: string) => {
    onFilterChange({ category_id: value === 'all' ? undefined : value });
  };

  const handleTypeChange = (value: string) => {
    onFilterChange({ document_type: value === 'all' ? undefined : value as any });
  };

  const clearAllFilters = () => {
    onFilterChange({
      category_id: undefined,
      document_type: undefined,
      tags: undefined
    });
  };

  const hasActiveFilters = currentFilters.category_id || currentFilters.document_type || (currentFilters.tags && currentFilters.tags.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <Select
            value={currentFilters.category_id || 'all'}
            onValueChange={handleCategoryChange}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={currentFilters.document_type || 'all'}
            onValueChange={handleTypeChange}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="pdf">PDF Documents</SelectItem>
              <SelectItem value="image">Images</SelectItem>
              <SelectItem value="weblink">Web Links</SelectItem>
              <SelectItem value="internal_link">Internal Links</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={clearAllFilters} className="whitespace-nowrap">
            <X className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        )}
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground font-medium">Active:</span>
          {currentFilters.category_id && (
            <Badge variant="secondary" className="gap-1">
              {categories.find(c => c.id === currentFilters.category_id)?.name}
              <X 
                className="h-3 w-3 cursor-pointer hover:text-destructive" 
                onClick={() => onFilterChange({ category_id: undefined })}
              />
            </Badge>
          )}
          {currentFilters.document_type && (
            <Badge variant="secondary" className="gap-1">
              {currentFilters.document_type.charAt(0).toUpperCase() + currentFilters.document_type.slice(1)}
              <X 
                className="h-3 w-3 cursor-pointer hover:text-destructive" 
                onClick={() => onFilterChange({ document_type: undefined })}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
