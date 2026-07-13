import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Filter } from 'lucide-react';

export interface FilterState {
  categories: string[];
  manufacturers: string[];
  priceRange: [number, number];
  minRating: number;
  sortBy: string;
  showFeatured: boolean;
  showBestSellers: boolean;
  freeShipping: boolean;
}

interface ProductFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  categories: string[];
  manufacturers: string[];
  isOpen?: boolean;
  onToggle?: () => void;
}

const ProductFilters: React.FC<ProductFiltersProps> = ({
  filters,
  onFiltersChange,
  categories,
  manufacturers,
  isOpen = true
}) => {
  const updateFilter = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleArrayFilter = (key: 'categories' | 'manufacturers', value: string) => {
    const currentArray = filters[key];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    updateFilter(key, newArray);
  };

  const clearFilters = () => {
    onFiltersChange({
      categories: [],
      manufacturers: [],
      priceRange: [0, 1000],
      minRating: 0,
      sortBy: 'name',
      showFeatured: false,
      showBestSellers: false,
      freeShipping: false
    });
  };

  const hasActiveFilters = 
    filters.categories.length > 0 ||
    filters.manufacturers.length > 0 ||
    filters.priceRange[0] > 0 ||
    filters.priceRange[1] < 1000 ||
    filters.minRating > 0 ||
    filters.showFeatured ||
    filters.showBestSellers ||
    filters.freeShipping;

  if (!isOpen) return null;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          {hasActiveFilters && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearFilters}
              className="text-destructive hover:text-destructive"
            >
              <X className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sort By */}
        <div>
          <label className="text-sm font-medium mb-2 block">Sort By</label>
          <Select value={filters.sortBy} onValueChange={(value) => updateFilter('sortBy', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="rating">Rating</SelectItem>
              <SelectItem value="popularity">Popularity</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Price Range */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            Price Range: ${filters.priceRange[0]} - ${filters.priceRange[1]}
          </label>
          <Slider
            value={filters.priceRange}
            onValueChange={(value) => updateFilter('priceRange', value as [number, number])}
            max={1000}
            min={0}
            step={10}
            className="mt-2"
          />
        </div>

        <Separator />

        {/* Rating */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            Minimum Rating: {filters.minRating} stars
          </label>
          <Slider
            value={[filters.minRating]}
            onValueChange={([value]) => updateFilter('minRating', value)}
            max={5}
            min={0}
            step={0.5}
            className="mt-2"
          />
        </div>

        <Separator />

        {/* Categories */}
        <div>
          <label className="text-sm font-medium mb-2 block">Categories</label>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {categories.map((category) => (
              <div key={category} className="flex items-center space-x-2">
                <Checkbox
                  id={`category-${category}`}
                  checked={filters.categories.includes(category)}
                  onCheckedChange={() => toggleArrayFilter('categories', category)}
                />
                <label 
                  htmlFor={`category-${category}`}
                  className="text-sm cursor-pointer"
                >
                  {category}
                </label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Manufacturers */}
        <div>
          <label className="text-sm font-medium mb-2 block">Manufacturers</label>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {manufacturers.map((manufacturer) => (
              <div key={manufacturer} className="flex items-center space-x-2">
                <Checkbox
                  id={`manufacturer-${manufacturer}`}
                  checked={filters.manufacturers.includes(manufacturer)}
                  onCheckedChange={() => toggleArrayFilter('manufacturers', manufacturer)}
                />
                <label 
                  htmlFor={`manufacturer-${manufacturer}`}
                  className="text-sm cursor-pointer"
                >
                  {manufacturer}
                </label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Special Filters */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Special Offers</label>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="featured"
              checked={filters.showFeatured}
              onCheckedChange={(checked) => updateFilter('showFeatured', !!checked)}
            />
            <label htmlFor="featured" className="text-sm cursor-pointer">
              Featured Products
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="bestsellers"
              checked={filters.showBestSellers}
              onCheckedChange={(checked) => updateFilter('showBestSellers', !!checked)}
            />
            <label htmlFor="bestsellers" className="text-sm cursor-pointer">
              Best Sellers
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="freeshipping"
              checked={filters.freeShipping}
              onCheckedChange={(checked) => updateFilter('freeShipping', !!checked)}
            />
            <label htmlFor="freeshipping" className="text-sm cursor-pointer">
              Free Shipping
            </label>
          </div>
        </div>

        {/* Active Filters */}
        {hasActiveFilters && (
          <>
            <Separator />
            <div>
              <label className="text-sm font-medium mb-2 block">Active Filters</label>
              <div className="flex flex-wrap gap-1">
                {filters.categories.map((category) => (
                  <Badge key={category} variant="secondary" className="text-xs">
                    {category}
                    <button
                      className="ml-1 hover:text-destructive"
                      onClick={() => toggleArrayFilter('categories', category)}
                    >
                      ×
                    </button>
                  </Badge>
                ))}
                {filters.manufacturers.map((manufacturer) => (
                  <Badge key={manufacturer} variant="secondary" className="text-xs">
                    {manufacturer}
                    <button
                      className="ml-1 hover:text-destructive"
                      onClick={() => toggleArrayFilter('manufacturers', manufacturer)}
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductFilters;