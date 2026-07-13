
import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface InventoryFilterProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  categoryFilter: string[];
  setCategoryFilter: (categories: string[]) => void;
  statusFilter: string[];
  setStatusFilter: (statuses: string[]) => void;
  supplierFilter: string;
  setSupplierFilter: (supplier: string) => void;
}

export const InventoryFilter: React.FC<InventoryFilterProps> = ({
  searchQuery,
  setSearchQuery,
  categoryFilter,
  setCategoryFilter,
  statusFilter,
  setStatusFilter,
  supplierFilter,
  setSupplierFilter
}) => {
  const handleCategoryChange = (category: string) => {
    if (categoryFilter.includes(category)) {
      setCategoryFilter(categoryFilter.filter(c => c !== category));
    } else {
      setCategoryFilter([...categoryFilter, category]);
    }
  };

  const handleStatusChange = (status: string) => {
    if (statusFilter.includes(status)) {
      setStatusFilter(statusFilter.filter(s => s !== status));
    } else {
      setStatusFilter([...statusFilter, status]);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setCategoryFilter([]);
    setStatusFilter([]);
    setSupplierFilter('');
  };

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex flex-col space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search-inventory">Search</Label>
              <Input
                id="search-inventory"
                placeholder="Search by name, SKU, or description"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Supplier</Label>
              <Input
                placeholder="Filter by supplier"
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={handleClearFilters} 
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <Label className="mb-2 block">Categories</Label>
              <div className="flex flex-wrap gap-2">
                {['Parts', 'Tools', 'Consumables', 'Accessories', 'Other'].map(category => (
                  <div key={category} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`category-${category}`}
                      checked={categoryFilter.includes(category)}
                      onCheckedChange={() => handleCategoryChange(category)}
                    />
                    <Label htmlFor={`category-${category}`} className="text-sm font-normal">
                      {category}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Status</Label>
              <div className="flex flex-wrap gap-2">
                {['In Stock', 'Low Stock', 'Out of Stock', 'Discontinued', 'On Order'].map(status => (
                  <div key={status} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`status-${status}`}
                      checked={statusFilter.includes(status)}
                      onCheckedChange={() => handleStatusChange(status)}
                    />
                    <Label htmlFor={`status-${status}`} className="text-sm font-normal">
                      {status}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
