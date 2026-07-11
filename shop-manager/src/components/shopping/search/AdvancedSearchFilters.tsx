import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Filter, X, Search, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface AdvancedSearchState {
  query: string;
  category: string[];
  manufacturer: string[];
  priceRange: [number, number];
  rating: number;
  features: string[];
  inStock: boolean;
  onSale: boolean;
  freeShipping: boolean;
  sortBy: string;
}

interface AdvancedSearchFiltersProps {
  filters: AdvancedSearchState;
  onFiltersChange: (filters: AdvancedSearchState) => void;
  categories: string[];
  manufacturers: string[];
  onSearch: () => void;
}

const AdvancedSearchFilters: React.FC<AdvancedSearchFiltersProps> = ({
  filters,
  onFiltersChange,
  categories,
  manufacturers,
  onSearch
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const features = [
    'Wireless',
    'Bluetooth',
    'LED Light',
    'Digital Display',
    'Magnetic Base',
    'Ergonomic Design',
    'Compact Size',
    'Heavy Duty',
    'Professional Grade',
    'Lifetime Warranty'
  ];

  const sortOptions = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' },
    { value: 'rating', label: 'Customer Rating' },
    { value: 'newest', label: 'Newest First' },
    { value: 'bestselling', label: 'Best Selling' }
  ];

  const updateFilters = (updates: Partial<AdvancedSearchState>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const toggleArrayValue = (array: string[], value: string) => {
    return array.includes(value)
      ? array.filter(item => item !== value)
      : [...array, value];
  };

  const resetFilters = () => {
    onFiltersChange({
      query: '',
      category: [],
      manufacturer: [],
      priceRange: [0, 2000],
      rating: 0,
      features: [],
      inStock: false,
      onSale: false,
      freeShipping: false,
      sortBy: 'relevance'
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.category.length > 0) count++;
    if (filters.manufacturer.length > 0) count++;
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 2000) count++;
    if (filters.rating > 0) count++;
    if (filters.features.length > 0) count++;
    if (filters.inStock) count++;
    if (filters.onSale) count++;
    if (filters.freeShipping) count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="relative">
          <Filter className="h-4 w-4 mr-2" />
          Advanced Search
          {activeFilterCount > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Advanced Search & Filters
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search Query */}
          <div className="space-y-2">
            <Label htmlFor="search-query">Search Keywords</Label>
            <Input
              id="search-query"
              placeholder="Enter search terms..."
              value={filters.query}
              onChange={(e) => updateFilters({ query: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Categories */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-48 overflow-y-auto">
                {categories.map((category) => (
                  <div key={category} className="flex items-center space-x-2">
                    <Checkbox
                      id={`category-${category}`}
                      checked={filters.category.includes(category)}
                      onCheckedChange={() =>
                        updateFilters({
                          category: toggleArrayValue(filters.category, category)
                        })
                      }
                    />
                    <Label
                      htmlFor={`category-${category}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {category}
                    </Label>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Manufacturers */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Manufacturers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-48 overflow-y-auto">
                {manufacturers.map((manufacturer) => (
                  <div key={manufacturer} className="flex items-center space-x-2">
                    <Checkbox
                      id={`manufacturer-${manufacturer}`}
                      checked={filters.manufacturer.includes(manufacturer)}
                      onCheckedChange={() =>
                        updateFilters({
                          manufacturer: toggleArrayValue(filters.manufacturer, manufacturer)
                        })
                      }
                    />
                    <Label
                      htmlFor={`manufacturer-${manufacturer}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {manufacturer}
                    </Label>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Price Range */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Price Range</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Slider
                value={filters.priceRange}
                onValueChange={(value) => updateFilters({ priceRange: value as [number, number] })}
                max={2000}
                step={50}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>${filters.priceRange[0]}</span>
                <span>${filters.priceRange[1]}</span>
              </div>
            </CardContent>
          </Card>

          {/* Rating */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Minimum Rating</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {[0, 1, 2, 3, 4, 5].map((rating) => (
                  <Button
                    key={rating}
                    variant={filters.rating === rating ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateFilters({ rating })}
                  >
                    {rating === 0 ? 'Any' : `${rating}+ ⭐`}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Features */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {features.map((feature) => (
                  <div key={feature} className="flex items-center space-x-2">
                    <Checkbox
                      id={`feature-${feature}`}
                      checked={filters.features.includes(feature)}
                      onCheckedChange={() =>
                        updateFilters({
                          features: toggleArrayValue(filters.features, feature)
                        })
                      }
                    />
                    <Label
                      htmlFor={`feature-${feature}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {feature}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Additional Options */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Additional Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="in-stock"
                  checked={filters.inStock}
                  onCheckedChange={(checked) => updateFilters({ inStock: !!checked })}
                />
                <Label htmlFor="in-stock" className="cursor-pointer">
                  In Stock Only
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="on-sale"
                  checked={filters.onSale}
                  onCheckedChange={(checked) => updateFilters({ onSale: !!checked })}
                />
                <Label htmlFor="on-sale" className="cursor-pointer">
                  On Sale
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="free-shipping"
                  checked={filters.freeShipping}
                  onCheckedChange={(checked) => updateFilters({ freeShipping: !!checked })}
                />
                <Label htmlFor="free-shipping" className="cursor-pointer">
                  Free Shipping
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Sort Options */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Sort Results By</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {sortOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={filters.sortBy === option.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateFilters({ sortBy: option.value })}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Active Filters */}
          {activeFilterCount > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Active Filters ({activeFilterCount})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {filters.category.map((cat) => (
                    <Badge key={cat} variant="secondary" className="cursor-pointer">
                      {cat}
                      <X
                        className="h-3 w-3 ml-1"
                        onClick={() =>
                          updateFilters({
                            category: filters.category.filter(c => c !== cat)
                          })
                        }
                      />
                    </Badge>
                  ))}
                  {filters.manufacturer.map((mfg) => (
                    <Badge key={mfg} variant="secondary" className="cursor-pointer">
                      {mfg}
                      <X
                        className="h-3 w-3 ml-1"
                        onClick={() =>
                          updateFilters({
                            manufacturer: filters.manufacturer.filter(m => m !== mfg)
                          })
                        }
                      />
                    </Badge>
                  ))}
                  {filters.features.map((feature) => (
                    <Badge key={feature} variant="secondary" className="cursor-pointer">
                      {feature}
                      <X
                        className="h-3 w-3 ml-1"
                        onClick={() =>
                          updateFilters({
                            features: filters.features.filter(f => f !== feature)
                          })
                        }
                      />
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Action Buttons */}
          <div className="flex gap-4 justify-end">
            <Button variant="outline" onClick={resetFilters}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset All
            </Button>
            <Button onClick={() => { onSearch(); setIsOpen(false); }}>
              <Search className="h-4 w-4 mr-2" />
              Search ({activeFilterCount} filters)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdvancedSearchFilters;