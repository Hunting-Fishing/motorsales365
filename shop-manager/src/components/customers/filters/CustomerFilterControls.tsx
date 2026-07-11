
import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, X, Sliders } from 'lucide-react';
import { DateRange } from 'react-day-picker';

export interface CustomerFilters {
  search?: string;
  searchQuery?: string;
  status?: string;
  sortBy?: string;
  tags?: string[];
  vehicleType?: string;
  hasVehicles?: string;
  dateRange?: DateRange;
}

interface CustomerFilterControlsProps {
  filters: CustomerFilters;
  onFilterChange: (filters: CustomerFilters) => void;
}

export const CustomerFilterControls = ({ 
  filters, 
  onFilterChange 
}: CustomerFilterControlsProps) => {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filters, search: e.target.value });
  };

  const clearFilters = () => {
    onFilterChange({
      search: '',
      searchQuery: '',
      status: 'all',
      sortBy: 'name',
      tags: [],
      vehicleType: '',
      hasVehicles: '',
      dateRange: undefined
    });
  };

  const hasActiveFilters = filters.search && filters.search.length > 0;

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search customers by name, email, phone, or company..."
            value={filters.search || ''}
            onChange={handleSearchChange}
            className="pl-10 pr-4 h-11 bg-white border-slate-200 focus:border-blue-300 focus:ring-blue-100 rounded-lg shadow-sm"
          />
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            className="h-11 px-4 border-slate-200 hover:bg-slate-50 rounded-lg"
          >
            <Sliders className="h-4 w-4 mr-2" />
            More Filters
          </Button>
          
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-11 px-4 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
            >
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-slate-600 font-medium">Active filters:</span>
          {filters.search && (
            <Badge 
              variant="secondary" 
              className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1"
            >
              Search: "{filters.search}"
              <button
                onClick={() => onFilterChange({ ...filters, search: '' })}
                className="ml-2 hover:text-blue-900"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};
