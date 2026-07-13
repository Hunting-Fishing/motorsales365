import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EXPANDED_INVENTORY_CATEGORIES, getSubcategories } from '@/constants/expandedInventoryCategories';

interface HierarchicalCategorySelectProps {
  value?: string;
  subcategoryValue?: string;
  onMainCategoryChange: (value: string) => void;
  onSubcategoryChange: (value: string) => void;
  error?: string;
}

export function HierarchicalCategorySelect({
  value,
  subcategoryValue,
  onMainCategoryChange,
  onSubcategoryChange,
  error
}: HierarchicalCategorySelectProps) {
  const [availableSubcategories, setAvailableSubcategories] = useState<string[]>([]);

  useEffect(() => {
    if (value) {
      const subcats = getSubcategories(value);
      setAvailableSubcategories(subcats);
    } else {
      setAvailableSubcategories([]);
    }
  }, [value]);

  const mainCategories = Object.values(EXPANDED_INVENTORY_CATEGORIES);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="main-category">
          Main Category <span className="text-destructive">*</span>
        </Label>
        <Select value={value} onValueChange={onMainCategoryChange}>
          <SelectTrigger 
            id="main-category"
            className={`w-full bg-background ${error ? 'border-destructive' : ''}`}
          >
            <SelectValue placeholder="Select main category" />
          </SelectTrigger>
          <SelectContent className="bg-background max-h-[300px] overflow-y-auto z-50">
            {mainCategories.map((category) => (
              <SelectItem key={category.value} value={category.label}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      {availableSubcategories.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="subcategory">Subcategory</Label>
          <Select value={subcategoryValue} onValueChange={onSubcategoryChange}>
            <SelectTrigger 
              id="subcategory"
              className="w-full bg-background"
            >
              <SelectValue placeholder="Select subcategory (optional)" />
            </SelectTrigger>
            <SelectContent className="bg-background max-h-[300px] overflow-y-auto z-50">
              {availableSubcategories.map((subcat) => (
                <SelectItem key={subcat} value={subcat}>
                  {subcat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
