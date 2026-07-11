
import { useState, useMemo, useCallback } from 'react';
import { InventoryItemExtended } from '@/types/inventory';
import { useInventoryData } from './useInventoryData';

interface FilterState {
  search: string;
  category: string[];
  status: string[];
  supplier: string;
  location: string;
}

/**
 * Optimized inventory filtering hook that uses memoization
 * and the centralized data source to prevent duplicate API calls
 */
export function useOptimizedInventoryFilters() {
  const { items, filterOptions, isLoading, error, refetch } = useInventoryData();
  
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    category: [],
    status: [],
    supplier: '',
    location: ''
  });

  // Memoized filtered items to prevent unnecessary recalculations
  const filteredItems = useMemo(() => {
    if (!items.length) return [];

    let result = [...items];

    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      result = result.filter(item => 
        item.name.toLowerCase().includes(searchTerm) ||
        item.sku.toLowerCase().includes(searchTerm) ||
        (item.description && item.description.toLowerCase().includes(searchTerm)) ||
        (item.partNumber && item.partNumber.toLowerCase().includes(searchTerm))
      );
    }

    // Apply category filter
    if (filters.category.length > 0) {
      result = result.filter(item => filters.category.includes(item.category || ''));
    }

    // Apply status filter
    if (filters.status.length > 0) {
      result = result.filter(item => filters.status.includes(item.status || ''));
    }

    // Apply supplier filter
    if (filters.supplier) {
      result = result.filter(item => item.supplier === filters.supplier);
    }

    // Apply location filter
    if (filters.location) {
      result = result.filter(item => item.location === filters.location);
    }

    return result;
  }, [items, filters]);

  // Optimized filter update functions
  const updateSearch = useCallback((search: string) => {
    setFilters(prev => ({ ...prev, search }));
  }, []);

  const updateCategory = useCallback((category: string[]) => {
    setFilters(prev => ({ ...prev, category }));
  }, []);

  const updateStatus = useCallback((status: string[]) => {
    setFilters(prev => ({ ...prev, status }));
  }, []);

  const updateSupplier = useCallback((supplier: string) => {
    setFilters(prev => ({ ...prev, supplier }));
  }, []);

  const updateLocation = useCallback((location: string) => {
    setFilters(prev => ({ ...prev, location }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      search: '',
      category: [],
      status: [],
      supplier: '',
      location: ''
    });
  }, []);

  const updateFilter = useCallback((filterType: string, value: any) => {
    switch (filterType) {
      case 'search':
        updateSearch(value);
        break;
      case 'category':
        updateCategory(value);
        break;
      case 'status':
        updateStatus(value);
        break;
      case 'supplier':
        updateSupplier(value);
        break;
      case 'location':
        updateLocation(value);
        break;
    }
  }, [updateSearch, updateCategory, updateStatus, updateSupplier, updateLocation]);

  return {
    // Data
    filteredItems,
    filters,
    filterOptions,
    
    // Loading/Error states
    loading: isLoading,
    error,
    
    // Filter actions
    updateSearch,
    updateCategory,
    updateStatus,
    updateSupplier,
    updateLocation,
    updateFilter,
    resetFilters,
    
    // Refetch
    refetch
  };
}
