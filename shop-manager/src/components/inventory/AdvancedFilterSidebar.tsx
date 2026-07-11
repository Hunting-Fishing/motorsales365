import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  X, 
  ChevronDown, 
  Search, 
  Filter,
  RotateCcw,
  Package,
  Building,
  MapPin,
  Tag
} from 'lucide-react';
import { useInventoryView } from '@/contexts/InventoryViewContext';
import { useOptimizedInventoryFilters } from '@/hooks/inventory/useOptimizedInventoryFilters';

export function AdvancedFilterSidebar() {
  const { isFilterSidebarOpen, toggleFilterSidebar } = useInventoryView();
  const {
    filters,
    filterOptions,
    updateSearch,
    updateCategory,
    updateStatus,
    updateSupplier,
    updateLocation,
    resetFilters
  } = useOptimizedInventoryFilters();

  const activeFiltersCount = [
    filters.search && 1,
    filters.category.length,
    filters.status.length,
    filters.supplier && 1,
    filters.location && 1
  ].filter(Boolean).reduce((sum, count) => sum + (count || 0), 0);

  if (!isFilterSidebarOpen) return null;

  const handleCategoryChange = (category: string, checked: boolean) => {
    const newCategories = checked
      ? [...filters.category, category]
      : filters.category.filter(c => c !== category);
    updateCategory(newCategories);
  };

  const handleStatusChange = (status: string, checked: boolean) => {
    const newStatuses = checked
      ? [...filters.status, status]
      : filters.status.filter(s => s !== status);
    updateStatus(newStatuses);
  };

  return (
    <div className="w-80 border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="p-6 h-full overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Filters</h2>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFilterSidebar}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={resetFilters}
            disabled={activeFiltersCount === 0}
            className="flex-1"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>

        <div className="space-y-6">
          {/* Search */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center">
                <Search className="h-4 w-4 mr-2" />
                Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="Search items, SKU, description..."
                value={filters.search}
                onChange={(e) => updateSearch(e.target.value)}
                className="w-full"
              />
            </CardContent>
          </Card>

          {/* Categories */}
          <Collapsible defaultOpen>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <div className="flex items-center">
                      <Tag className="h-4 w-4 mr-2" />
                      Categories
                      {filters.category.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {filters.category.length}
                        </Badge>
                      )}
                    </div>
                    <ChevronDown className="h-4 w-4" />
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-3">
                  {filterOptions.categories.map((category) => (
                    <div key={category} className="flex items-center space-x-2">
                      <Checkbox
                        id={`category-${category}`}
                        checked={filters.category.includes(category)}
                        onCheckedChange={(checked) => 
                          handleCategoryChange(category, checked as boolean)
                        }
                      />
                      <Label
                        htmlFor={`category-${category}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {category}
                      </Label>
                    </div>
                  ))}
                  {filterOptions.categories.length === 0 && (
                    <p className="text-sm text-muted-foreground">No categories available</p>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Status */}
          <Collapsible defaultOpen>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <div className="flex items-center">
                      <Package className="h-4 w-4 mr-2" />
                      Status
                      {filters.status.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {filters.status.length}
                        </Badge>
                      )}
                    </div>
                    <ChevronDown className="h-4 w-4" />
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-3">
                  {filterOptions.statuses.map((status) => (
                    <div key={status} className="flex items-center space-x-2">
                      <Checkbox
                        id={`status-${status}`}
                        checked={filters.status.includes(status)}
                        onCheckedChange={(checked) => 
                          handleStatusChange(status, checked as boolean)
                        }
                      />
                      <Label
                        htmlFor={`status-${status}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {status}
                      </Label>
                    </div>
                  ))}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Supplier */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center">
                <Building className="h-4 w-4 mr-2" />
                Supplier
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={filters.supplier} onValueChange={updateSupplier}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Suppliers</SelectItem>
                  {filterOptions.suppliers.map((supplier) => (
                    <SelectItem key={supplier} value={supplier}>
                      {supplier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center">
                <MapPin className="h-4 w-4 mr-2" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={filters.location} onValueChange={updateLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Locations</SelectItem>
                  {filterOptions.locations.map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}