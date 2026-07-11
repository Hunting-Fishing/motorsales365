
import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAllCustomers } from '@/services/customer/customerQueryService';
import { Customer } from '@/types/customer';

/**
 * PROTECTED HOOK - Customer management functionality
 * This hook provides full customer data management
 * DO NOT replace with mock data or remove functionality
 */

interface CustomerFilters {
  search?: string;
  searchQuery?: string;
  status?: string;
  sortBy?: string;
  tags?: string[];
  vehicleType?: string;
  hasVehicles?: 'yes' | 'no' | '';
  dateRange?: {
    from: Date | null;
    to: Date | null;
  };
}

interface CustomerStats {
  total: number;
  withVehicles: number;
  fleetCustomers: number;
  recentlyAdded: number;
}

const defaultFilters: CustomerFilters = {
  search: '',
  searchQuery: '',
  status: 'all',
  sortBy: 'name',
  tags: [],
  vehicleType: '',
  hasVehicles: '',
  dateRange: {
    from: null,
    to: null,
  },
};

export function useCustomers() {
  console.log('🔄 useCustomers: Hook initialized');
  
  const [filters, setFilters] = useState<CustomerFilters>(defaultFilters);

  const {
    data: customers = [],
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      console.log('🔄 useCustomers: Fetching customers...');
      const result = await getAllCustomers();
      console.log('✅ useCustomers: Successfully fetched', result?.length || 0, 'customers');
      console.log('📊 useCustomers: Customer data sample:', result?.slice(0, 2));
      return result || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Calculate customer stats
  const customerStats: CustomerStats = useMemo(() => {
    const total = customers.length;
    const withVehicles = customers.filter(c => (c.vehicles?.length || 0) > 0).length;
    const fleetCustomers = customers.filter(c => c.is_fleet === true).length;
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentlyAdded = customers.filter(c => 
      new Date(c.created_at) >= thirtyDaysAgo
    ).length;

    return {
      total,
      withVehicles,
      fleetCustomers,
      recentlyAdded
    };
  }, [customers]);

  // Filter customers based on current filters
  const filteredCustomers = customers.filter((customer: Customer) => {
    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const customerName = `${customer.first_name} ${customer.last_name}`.toLowerCase();
      const email = customer.email?.toLowerCase() || '';
      const phone = customer.phone?.toLowerCase() || '';
      
      if (!customerName.includes(searchTerm) && 
          !email.includes(searchTerm) && 
          !phone.includes(searchTerm)) {
        return false;
      }
    }

    // Has vehicles filter - only apply if filter is set (not empty string)
    if (filters.hasVehicles !== '') {
      const hasVehicles = (customer.vehicles?.length || 0) > 0;
      if (filters.hasVehicles === 'yes' && !hasVehicles) {
        return false;
      }
      if (filters.hasVehicles === 'no' && hasVehicles) {
        return false;
      }
    }

    // Date range filter
    if (filters.dateRange?.from || filters.dateRange?.to) {
      const customerDate = new Date(customer.created_at);
      
      if (filters.dateRange?.from && customerDate < filters.dateRange.from) {
        return false;
      }
      
      if (filters.dateRange?.to && customerDate > filters.dateRange.to) {
        return false;
      }
    }

    return true;
  });

  const handleFilterChange = (newFilters: CustomerFilters) => {
    setFilters(newFilters);
  };

  const clearFilters = () => {
    setFilters(defaultFilters);
  };

  return {
    customers,
    filteredCustomers,
    customerStats,
    loading,
    error: error?.message || null,
    filters,
    handleFilterChange,
    clearFilters,
    refetch,
  };
}
