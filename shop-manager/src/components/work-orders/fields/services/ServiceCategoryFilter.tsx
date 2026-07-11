
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ServiceMainCategory } from '@/types/service';
import { X, Filter } from 'lucide-react';

interface ServiceCategoryFilterProps {
  categories: ServiceMainCategory[];
  selectedCategoryIds: string[];
  onCategoryToggle: (categoryId: string) => void;
  onClearFilters: () => void;
}

export function ServiceCategoryFilter({
  categories,
  selectedCategoryIds,
  onCategoryToggle,
  onClearFilters
}: ServiceCategoryFilterProps) {
  const hasActiveFilters = selectedCategoryIds.length > 0;

  return (
    <div className="space-y-3 p-3 border-b bg-gray-50/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filter Categories</span>
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Quick Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => {
          const isSelected = selectedCategoryIds.includes(category.id);
          return (
            <Button
              key={category.id}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => onCategoryToggle(category.id)}
              className={`text-xs ${isSelected ? 'bg-blue-600 hover:bg-blue-700' : 'hover:bg-blue-50'}`}
            >
              {category.name}
              {isSelected && <X className="ml-1 h-3 w-3" />}
            </Button>
          );
        })}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Active:</span>
          <div className="flex flex-wrap gap-1">
            {selectedCategoryIds.map((categoryId) => {
              const category = categories.find(c => c.id === categoryId);
              return (
                <Badge
                  key={categoryId}
                  variant="secondary"
                  className="text-xs bg-blue-100 text-blue-800"
                >
                  {category?.name}
                </Badge>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
