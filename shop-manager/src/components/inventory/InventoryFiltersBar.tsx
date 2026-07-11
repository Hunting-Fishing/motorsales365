
import React from "react";
import { Search, Filter, Download, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface InventoryFiltersBarProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  categoryFilter: string[];
  setCategoryFilter: (value: string[]) => void;
  statusFilter: string[];
  setStatusFilter: (value: string[]) => void;
  supplierFilter: string;
  setSupplierFilter: (value: string) => void;
  locationFilter: string;
  setLocationFilter: (value: string) => void;
  categories: string[];
  statuses: string[];
  suppliers: string[];
  locations: string[];
  handleExport: () => void;
  handleImport: () => void;
}

export function InventoryFiltersBar({
  searchQuery,
  setSearchQuery,
  categoryFilter,
  setCategoryFilter,
  statusFilter,
  setStatusFilter,
  supplierFilter,
  setSupplierFilter,
  locationFilter,
  setLocationFilter,
  categories,
  statuses,
  suppliers,
  locations,
  handleExport,
  handleImport
}: InventoryFiltersBarProps) {
  const handleCategoryToggle = (category: string) => {
    if (categoryFilter.includes(category)) {
      setCategoryFilter(categoryFilter.filter((c) => c !== category));
    } else {
      setCategoryFilter([...categoryFilter, category]);
    }
  };

  const handleStatusToggle = (status: string) => {
    if (statusFilter.includes(status)) {
      setStatusFilter(statusFilter.filter((s) => s !== status));
    } else {
      setStatusFilter([...statusFilter, status]);
    }
  };

  const handleClearAllFilters = () => {
    setSearchQuery("");
    setCategoryFilter([]);
    setStatusFilter([]);
    setSupplierFilter("all");
    setLocationFilter("all");
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search by name, SKU, or Part #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto rounded-full">
              Category {categoryFilter.length > 0 && `(${categoryFilter.length})`}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {categories.map((category) => (
              <DropdownMenuCheckboxItem
                key={category}
                checked={categoryFilter.includes(category)}
                onCheckedChange={() => handleCategoryToggle(category)}
              >
                {category}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto rounded-full">
              Status {statusFilter.length > 0 && `(${statusFilter.length})`}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {statuses.map((status) => (
              <DropdownMenuCheckboxItem
                key={status}
                checked={statusFilter.includes(status)}
                onCheckedChange={() => handleStatusToggle(status)}
              >
                {status}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Select
          value={supplierFilter}
          onValueChange={setSupplierFilter}
        >
          <SelectTrigger className="w-full sm:w-[180px] rounded-full">
            <SelectValue placeholder="All Suppliers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Suppliers</SelectItem>
            {suppliers.map((supplier) => (
              <SelectItem key={supplier} value={supplier}>
                {supplier}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select
          value={locationFilter}
          onValueChange={setLocationFilter}
        >
          <SelectTrigger className="w-full sm:w-[180px] rounded-full">
            <SelectValue placeholder="All Locations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {locations.map((location) => (
              <SelectItem key={location} value={location}>
                {location}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex justify-between">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleClearAllFilters}
          className="text-sm text-gray-500"
        >
          Clear filters
        </Button>
        
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExport}
            className="flex items-center gap-1 rounded-full"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleImport}
            className="flex items-center gap-1 rounded-full"
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
        </div>
      </div>
    </div>
  );
}
