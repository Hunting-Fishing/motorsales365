import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { 
  Search, 
  Filter, 
  X, 
  RotateCcw, 
  Save,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Package,
  AlertTriangle
} from 'lucide-react';

interface AdvancedFilter {
  searchTerm: string;
  categories: string[];
  priceRange: [number, number];
  quantityRange: [number, number];
  stockStatus: string[];
  conditions: {
    isLowStock: boolean;
    isOutOfStock: boolean;
    isOverStock: boolean;
    hasReorderPoint: boolean;
    isDiscontinued: boolean;
  };
  dateRange?: {
    start?: string;
    end?: string;
  };
  supplier?: string;
  location?: string;
  tags?: string[];
  sortBy?: string;
}

const defaultFilter: AdvancedFilter = {
  searchTerm: '',
  categories: [],
  priceRange: [0, 1000],
  quantityRange: [0, 100],
  stockStatus: [],
  conditions: {
    isLowStock: false,
    isOutOfStock: false,
    isOverStock: false,
    hasReorderPoint: false,
    isDiscontinued: false,
  },
  dateRange: {
    start: '',
    end: ''
  },
  supplier: '',
  location: '',
  tags: [],
  sortBy: 'name_asc',
};

const stockStatusOptions = [
  { value: 'in_stock', label: 'In Stock', color: 'bg-green-500' },
  { value: 'low_stock', label: 'Low Stock', color: 'bg-yellow-500' },
  { value: 'out_of_stock', label: 'Out of Stock', color: 'bg-red-500' },
  { value: 'overstocked', label: 'Overstocked', color: 'bg-blue-500' },
];

interface AdvancedSearchFilterProps {
  onFilterChange: (filter: AdvancedFilter) => void;
  availableCategories: string[];
}

export function AdvancedSearchFilter({ 
  onFilterChange, 
  availableCategories
}: AdvancedSearchFilterProps) {
  const [filter, setFilter] = useState<AdvancedFilter>(defaultFilter);

  const updateFilter = (updates: Partial<AdvancedFilter>) => {
    const newFilter = { ...filter, ...updates };
    setFilter(newFilter);
    onFilterChange(newFilter);
  };

  const updateConditions = (conditionUpdates: Partial<AdvancedFilter['conditions']>) => {
    updateFilter({
      conditions: { ...filter.conditions, ...conditionUpdates }
    });
  };

  const resetFilter = () => {
    setFilter(defaultFilter);
    onFilterChange(defaultFilter);
  };

  const toggleArrayValue = (array: string[], value: string) => {
    return array.includes(value)
      ? array.filter(item => item !== value)
      : [...array, value];
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Advanced Search & Filters
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={resetFilter}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button variant="outline" size="sm">
              <Save className="h-4 w-4 mr-2" />
              Save Filter
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="conditions">Conditions</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6">
            {/* Search Term */}
            <div className="space-y-2">
              <Label>Search Term</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, SKU, description..."
                  value={filter.searchTerm}
                  onChange={(e) => updateFilter({ searchTerm: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Categories */}
            <div className="space-y-2">
              <Label>Categories</Label>
              <div className="flex flex-wrap gap-2 p-3 border rounded-md min-h-[3rem]">
                {availableCategories.map(category => (
                  <Badge
                    key={category}
                    variant={filter.categories.includes(category) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => updateFilter({
                      categories: toggleArrayValue(filter.categories, category)
                    })}
                  >
                    {category}
                    {filter.categories.includes(category) && (
                      <X className="h-3 w-3 ml-1" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Stock Status */}
            <div className="space-y-2">
              <Label>Stock Status</Label>
              <div className="flex flex-wrap gap-2">
                {stockStatusOptions.map(status => (
                  <Badge
                    key={status.value}
                    variant={filter.stockStatus.includes(status.value) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => updateFilter({
                      stockStatus: toggleArrayValue(filter.stockStatus, status.value)
                    })}
                  >
                    <div className={`w-2 h-2 rounded-full ${status.color} mr-2`} />
                    {status.label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div className="space-y-2">
              <Label>Price Range: ${filter.priceRange[0]} - ${filter.priceRange[1]}</Label>
              <Slider
                value={filter.priceRange}
                onValueChange={(value) => updateFilter({ priceRange: value as [number, number] })}
                max={10000}
                step={50}
                className="w-full"
              />
            </div>

            {/* Quantity Range */}
            <div className="space-y-2">
              <Label>Quantity Range: {filter.quantityRange[0]} - {filter.quantityRange[1]}</Label>
              <Slider
                value={filter.quantityRange}
                onValueChange={(value) => updateFilter({ quantityRange: value as [number, number] })}
                max={1000}
                step={5}
                className="w-full"
              />
            </div>
          </TabsContent>

          <TabsContent value="conditions" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-yellow-500" />
                  <Label>Low Stock Items</Label>
                </div>
                <Switch
                  checked={filter.conditions.isLowStock}
                  onCheckedChange={(checked) => updateConditions({ isLowStock: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex items-center gap-2">
                  <X className="h-4 w-4 text-red-500" />
                  <Label>Out of Stock</Label>
                </div>
                <Switch
                  checked={filter.conditions.isOutOfStock}
                  onCheckedChange={(checked) => updateConditions({ isOutOfStock: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  <Label>Overstocked</Label>
                </div>
                <Switch
                  checked={filter.conditions.isOverStock}
                  onCheckedChange={(checked) => updateConditions({ isOverStock: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <Label>Has Reorder Point</Label>
                </div>
                <Switch
                  checked={filter.conditions.hasReorderPoint}
                  onCheckedChange={(checked) => updateConditions({ hasReorderPoint: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-gray-500" />
                  <Label>Discontinued</Label>
                </div>
                <Switch
                  checked={filter.conditions.isDiscontinued}
                  onCheckedChange={(checked) => updateConditions({ isDiscontinued: checked })}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            {/* Date Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Created After</Label>
                <Input
                  type="date"
                  value={filter.dateRange?.start || ''}
                  onChange={(e) => updateFilter({
                    dateRange: { ...filter.dateRange, start: e.target.value }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Created Before</Label>
                <Input
                  type="date"
                  value={filter.dateRange?.end || ''}
                  onChange={(e) => updateFilter({
                    dateRange: { ...filter.dateRange, end: e.target.value }
                  })}
                />
              </div>
            </div>

            {/* Supplier Filter */}
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Input
                placeholder="Filter by supplier name..."
                value={filter.supplier || ''}
                onChange={(e) => updateFilter({ supplier: e.target.value })}
              />
            </div>

            {/* Location Filter */}
            <div className="space-y-2">
              <Label>Storage Location</Label>
              <Input
                placeholder="Filter by storage location..."
                value={filter.location || ''}
                onChange={(e) => updateFilter({ location: e.target.value })}
              />
            </div>

            {/* Tags Filter */}
            <div className="space-y-2">
              <Label>Tags</Label>
              <Input
                placeholder="Enter tags separated by commas..."
                value={filter.tags?.join(', ') || ''}
                onChange={(e) => updateFilter({ 
                  tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                })}
              />
            </div>

            {/* Sorting Options */}
            <div className="space-y-2">
              <Label>Sort By</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'name_asc', label: 'Name (A-Z)' },
                  { value: 'name_desc', label: 'Name (Z-A)' },
                  { value: 'price_asc', label: 'Price (Low-High)' },
                  { value: 'price_desc', label: 'Price (High-Low)' },
                  { value: 'quantity_asc', label: 'Quantity (Low-High)' },
                  { value: 'quantity_desc', label: 'Quantity (High-Low)' },
                  { value: 'date_asc', label: 'Oldest First' },
                  { value: 'date_desc', label: 'Newest First' }
                ].map(option => (
                  <Badge
                    key={option.value}
                    variant={filter.sortBy === option.value ? "default" : "outline"}
                    className="cursor-pointer justify-center py-2"
                    onClick={() => updateFilter({ sortBy: option.value })}
                  >
                    {option.label}
                  </Badge>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}