
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Filter } from "lucide-react";
import { InvoiceFilters, InvoiceFiltersDropdownProps } from "@/types/invoice";

export function InvoiceFiltersDropdown({ 
  filters, 
  onFilterChange, 
  onResetFilters,
  onApplyFilters 
}: InvoiceFiltersDropdownProps) {
  const [localFilters, setLocalFilters] = useState<InvoiceFilters>(filters);

  const handleApply = () => {
    onFilterChange(localFilters);
    if (onApplyFilters) {
      onApplyFilters(localFilters);
    }
  };

  const handleReset = () => {
    const resetFilters: InvoiceFilters = {
      status: 'all',
      dateRange: 'all',
      search: '',
      customer: 'all'
    };
    setLocalFilters(resetFilters);
    onFilterChange(resetFilters);
    if (onResetFilters) {
      onResetFilters();
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 p-4">
        <div className="space-y-4">
          <div className="flex justify-between">
            <Button onClick={handleReset} variant="ghost" size="sm">
              Reset
            </Button>
            <Button onClick={handleApply} size="sm">
              Apply
            </Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
