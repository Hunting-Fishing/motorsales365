
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";

export interface InventoryFiltersProps {
  categories: string[];
  statuses: string[];
  suppliers: string[];
  locations: string[];
  categoryFilter: string[];
  statusFilter: string[];
  supplierFilter: string;
  locationFilter: string;
  setCategoryFilter: React.Dispatch<React.SetStateAction<string[]>>;
  setStatusFilter: React.Dispatch<React.SetStateAction<string[]>>;
  setSupplierFilter: React.Dispatch<React.SetStateAction<string>>;
  setLocationFilter: React.Dispatch<React.SetStateAction<string>>;
  onReset: () => void;
}

export function InventoryFilters({
  categories,
  statuses,
  suppliers,
  locations,
  categoryFilter,
  statusFilter,
  supplierFilter,
  locationFilter,
  setCategoryFilter,
  setStatusFilter,
  setSupplierFilter,
  setLocationFilter,
  onReset
}: InventoryFiltersProps) {
  const categoryOptions = categories.map(category => ({
    value: category,
    label: category
  }));

  const statusOptions = statuses.map(status => ({
    value: status,
    label: status
  }));

  const supplierOptions = suppliers.map(supplier => ({
    value: supplier,
    label: supplier
  }));

  const locationOptions = locations.map(location => ({
    value: location,
    label: location
  }));

  const isFilterActive = categoryFilter.length > 0 || 
    statusFilter.length > 0 || 
    supplierFilter !== '' || 
    locationFilter !== '';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <MultiSelect
            options={categoryOptions}
            selected={categoryFilter}
            onChange={setCategoryFilter}
            placeholder="All categories"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <MultiSelect
            options={statusOptions}
            selected={statusFilter}
            onChange={setStatusFilter}
            placeholder="All statuses"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="supplier">Supplier</Label>
          <select
            id="supplier"
            className="w-full p-2 border rounded"
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
          >
            <option value="">All suppliers</option>
            {suppliers.map((supplier) => (
              <option key={supplier} value={supplier}>
                {supplier}
              </option>
            ))}
          </select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <select
            id="location"
            className="w-full p-2 border rounded"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
          >
            <option value="">All locations</option>
            {locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </div>
        
        {isFilterActive && (
          <Button 
            onClick={onReset}
            variant="outline" 
            className="w-full"
          >
            Reset Filters
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
