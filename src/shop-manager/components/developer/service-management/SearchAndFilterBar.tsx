
import React, { useState } from 'react';
import { Search, Filter, X, SortAsc, SortDesc, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SearchAndFilterBarProps {
  onSearch: (query: string) => void;
  onFilterChange: (filters: FilterOptions) => void;
  categories: string[];
}

export interface FilterOptions {
  categories: string[];
  priceRange: {
    min: number | null;
    max: number | null;
  };
  timeRange: {
    min: number | null;
    max: number | null;
  };
  searchIn: 'all' | 'name' | 'description' | 'category';
  sortBy: 'name' | 'price' | 'time' | 'category';
  sortOrder: 'asc' | 'desc';
}

export const SearchAndFilterBar: React.FC<SearchAndFilterBarProps> = ({
  onSearch,
  onFilterChange,
  categories = []
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({
    categories: [],
    priceRange: { min: null, max: null },
    timeRange: { min: null, max: null },
    searchIn: 'all',
    sortBy: 'name',
    sortOrder: 'asc'
  });
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    onSearch(value);
  };
  
  const handleFilterToggle = (category: string) => {
    const updatedFilters = {
      ...filters,
      categories: filters.categories.includes(category)
        ? filters.categories.filter(filter => filter !== category)
        : [...filters.categories, category]
    };
    
    setFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  const handlePriceRangeChange = (type: 'min' | 'max', value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    const updatedFilters = {
      ...filters,
      priceRange: {
        ...filters.priceRange,
        [type]: numValue
      }
    };
    setFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  const handleTimeRangeChange = (type: 'min' | 'max', value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    const updatedFilters = {
      ...filters,
      timeRange: {
        ...filters.timeRange,
        [type]: numValue
      }
    };
    setFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  const handleSortChange = (sortBy: string, sortOrder: string) => {
    const updatedFilters = {
      ...filters,
      sortBy: sortBy as FilterOptions['sortBy'],
      sortOrder: sortOrder as FilterOptions['sortOrder']
    };
    setFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  const handleSearchScopeChange = (scope: string) => {
    const updatedFilters = {
      ...filters,
      searchIn: scope as FilterOptions['searchIn']
    };
    setFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };
  
  const clearAllFilters = () => {
    const clearedFilters: FilterOptions = {
      categories: [],
      priceRange: { min: null, max: null },
      timeRange: { min: null, max: null },
      searchIn: 'all',
      sortBy: 'name',
      sortOrder: 'asc'
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };
  
  const clearSearch = () => {
    setSearchQuery('');
    onSearch('');
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.categories.length > 0) count++;
    if (filters.priceRange.min !== null || filters.priceRange.max !== null) count++;
    if (filters.timeRange.min !== null || filters.timeRange.max !== null) count++;
    if (filters.searchIn !== 'all') count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <div className="flex flex-col gap-4 mb-6">
      {/* Search and Sort Row */}
      <div className="flex items-center gap-2">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search services (try 'belt', 'oil', 'brake')..."
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <button 
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Search Scope */}
        <Select value={filters.searchIn} onValueChange={handleSearchScopeChange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Fields</SelectItem>
            <SelectItem value="name">Name Only</SelectItem>
            <SelectItem value="description">Description</SelectItem>
            <SelectItem value="category">Category</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort Options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              {filters.sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
              Sort
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {['name', 'price', 'time', 'category'].map((sortBy) => (
              <div key={sortBy} className="px-2 py-1">
                <div className="flex items-center gap-2">
                  <span className="flex-1 capitalize">{sortBy}</span>
                  <div className="flex gap-1">
                    <Button
                      variant={filters.sortBy === sortBy && filters.sortOrder === 'asc' ? 'default' : 'ghost'}
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleSortChange(sortBy, 'asc')}
                    >
                      <SortAsc className="h-3 w-3" />
                    </Button>
                    <Button
                      variant={filters.sortBy === sortBy && filters.sortOrder === 'desc' ? 'default' : 'ghost'}
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleSortChange(sortBy, 'desc')}
                    >
                      <SortDesc className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* Filter Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              <span>Filter</span>
              {activeFiltersCount > 0 && (
                <Badge className="ml-1 bg-blue-500 text-white">{activeFiltersCount}</Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Filter Options</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {/* Categories */}
            <div className="p-2">
              <h4 className="font-medium mb-2">Categories</h4>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {categories.map((category) => (
                  <DropdownMenuCheckboxItem
                    key={category}
                    checked={filters.categories.includes(category)}
                    onCheckedChange={() => handleFilterToggle(category)}
                  >
                    {category}
                  </DropdownMenuCheckboxItem>
                ))}
              </div>
            </div>

            <DropdownMenuSeparator />

            {/* Price Range */}
            <div className="p-2">
              <h4 className="font-medium mb-2">Price Range ($)</h4>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={filters.priceRange.min || ''}
                  onChange={(e) => handlePriceRangeChange('min', e.target.value)}
                  className="w-20 text-sm"
                />
                <span className="self-center">-</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={filters.priceRange.max || ''}
                  onChange={(e) => handlePriceRangeChange('max', e.target.value)}
                  className="w-20 text-sm"
                />
              </div>
            </div>

            <DropdownMenuSeparator />

            {/* Time Range */}
            <div className="p-2">
              <h4 className="font-medium mb-2">Time Range (minutes)</h4>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={filters.timeRange.min || ''}
                  onChange={(e) => handleTimeRangeChange('min', e.target.value)}
                  className="w-20 text-sm"
                />
                <span className="self-center">-</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={filters.timeRange.max || ''}
                  onChange={(e) => handleTimeRangeChange('max', e.target.value)}
                  className="w-20 text-sm"
                />
              </div>
            </div>

            {activeFiltersCount > 0 && (
              <>
                <DropdownMenuSeparator />
                <div className="p-2">
                  <Button 
                    variant="ghost" 
                    className="w-full text-sm text-gray-600" 
                    onClick={clearAllFilters}
                  >
                    Clear all filters
                  </Button>
                </div>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Active Filters Display */}
      {(filters.categories.length > 0 || activeFiltersCount > 0) && (
        <div className="flex flex-wrap gap-2">
          {filters.categories.map(filter => (
            <Badge 
              key={filter} 
              className="px-3 py-1 bg-blue-100 text-blue-800 border border-blue-300 hover:bg-blue-200"
            >
              {filter}
              <X 
                className="ml-2 h-3 w-3 cursor-pointer" 
                onClick={() => handleFilterToggle(filter)} 
              />
            </Badge>
          ))}
          
          {(filters.priceRange.min !== null || filters.priceRange.max !== null) && (
            <Badge className="px-3 py-1 bg-green-100 text-green-800 border border-green-300">
              Price: ${filters.priceRange.min || '0'} - ${filters.priceRange.max || '∞'}
              <X 
                className="ml-2 h-3 w-3 cursor-pointer" 
                onClick={() => {
                  const updatedFilters = { ...filters, priceRange: { min: null, max: null } };
                  setFilters(updatedFilters);
                  onFilterChange(updatedFilters);
                }} 
              />
            </Badge>
          )}

          {(filters.timeRange.min !== null || filters.timeRange.max !== null) && (
            <Badge className="px-3 py-1 bg-purple-100 text-purple-800 border border-purple-300">
              Time: {filters.timeRange.min || '0'} - {filters.timeRange.max || '∞'} min
              <X 
                className="ml-2 h-3 w-3 cursor-pointer" 
                onClick={() => {
                  const updatedFilters = { ...filters, timeRange: { min: null, max: null } };
                  setFilters(updatedFilters);
                  onFilterChange(updatedFilters);
                }} 
              />
            </Badge>
          )}

          {filters.searchIn !== 'all' && (
            <Badge className="px-3 py-1 bg-yellow-100 text-yellow-800 border border-yellow-300">
              Search in: {filters.searchIn}
              <X 
                className="ml-2 h-3 w-3 cursor-pointer" 
                onClick={() => handleSearchScopeChange('all')} 
              />
            </Badge>
          )}
          
          {activeFiltersCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-sm text-gray-600" 
              onClick={clearAllFilters}
            >
              Clear all
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
