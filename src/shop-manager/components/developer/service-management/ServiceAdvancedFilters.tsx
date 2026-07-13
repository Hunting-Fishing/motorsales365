
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { ServiceMainCategory } from '@/types/service';
import { Filter, X, RotateCcw } from 'lucide-react';

interface ServiceAdvancedFiltersProps {
  categories: ServiceMainCategory[];
  onApplyFilters?: (filters: any) => void;
  onClearFilters?: () => void;
}

export function ServiceAdvancedFilters({
  categories,
  onApplyFilters,
  onClearFilters
}: ServiceAdvancedFiltersProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [hasEstimatedTime, setHasEstimatedTime] = useState(false);
  const [hasPrice, setHasPrice] = useState(false);

  const handleApply = () => {
    const filters = {
      searchQuery,
      selectedCategories,
      priceRange,
      hasEstimatedTime,
      hasPrice
    };
    onApplyFilters?.(filters);
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          Advanced Filters
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onClearFilters}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {/* Search Filter */}
          <div className="space-y-2">
            <Label htmlFor="search">Search Services</Label>
            <Input
              id="search"
              placeholder="Search by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Category Filter */}
          <div className="space-y-2">
            <Label>Categories</Label>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Badge
                  key={category.id}
                  variant={selectedCategories.includes(category.id) ? "default" : "outline"}
                  onClick={() => {
                    if (selectedCategories.includes(category.id)) {
                      setSelectedCategories(selectedCategories.filter((id) => id !== category.id));
                    } else {
                      setSelectedCategories([...selectedCategories, category.id]);
                    }
                  }}
                  className="cursor-pointer"
                >
                  {category.name}
                  {selectedCategories.includes(category.id) && <X className="ml-1 h-3 w-3" />}
                </Badge>
              ))}
            </div>
          </div>

          {/* Price Range Filter */}
          <div className="space-y-2">
            <Label>Price Range (${priceRange[0]} - ${priceRange[1]})</Label>
            <Slider
              defaultValue={priceRange}
              max={2000}
              step={10}
              onValueChange={(value) => setPriceRange(value as [number, number])}
            />
          </div>

          {/* Checkbox Filters */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="time"
              checked={hasEstimatedTime}
              onCheckedChange={(checked) => setHasEstimatedTime(!!checked)}
            />
            <Label htmlFor="time">Has Estimated Time</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="price"
              checked={hasPrice}
              onCheckedChange={(checked) => setHasPrice(!!checked)}
            />
            <Label htmlFor="price">Has Price</Label>
          </div>

          {/* Apply Button */}
          <Button onClick={handleApply}>Apply Filters</Button>
        </div>
      </CardContent>
    </Card>
  );
}
