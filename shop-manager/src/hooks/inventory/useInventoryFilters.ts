
import { useState, useEffect, useMemo } from 'react';
import { getInventoryItems } from '@/services/inventory/crudService';
import { InventoryItemExtended } from '@/types/inventory';
import { 
  getInventoryCategories, 
  getInventorySuppliers, 
  getInventoryLocations,
  getInventoryStatuses
} from '@/services/inventory/filterService';

export function useInventoryFilters() {
  const [items, setItems] = useState<InventoryItemExtended[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItemExtended[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [supplierFilter, setSupplierFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  
  // Options derived from real database data
  const [categories, setCategories] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);

  // Load real data from database
  useEffect(() => {
    const fetchRealData = async () => {
      setLoading(true);
      try {
        console.log('Fetching real inventory data from database...');
        
        const [itemsData, categoriesData, statusesData, suppliersData, locationsData] = await Promise.all([
          getInventoryItems(),
          getInventoryCategories(),
          getInventoryStatuses(),
          getInventorySuppliers(),
          getInventoryLocations()
        ]);
        
        console.log('Real inventory data loaded:', {
          itemsCount: itemsData.length,
          categoriesCount: categoriesData.length,
          suppliersCount: suppliersData.length,
          locationsCount: locationsData.length
        });
        
        setItems(itemsData);
        setFilteredItems(itemsData);
        setCategories(categoriesData);
        setStatuses(statusesData);
        setSuppliers(suppliersData);
        setLocations(locationsData);
        setError(null);
      } catch (err) {
        console.error("Error fetching real inventory data:", err);
        setError('Failed to load inventory data from database');
      } finally {
        setLoading(false);
      }
    };

    fetchRealData();
  }, []);

  // Apply filters to real data
  useEffect(() => {
    let result = [...items];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => 
        item.name.toLowerCase().includes(query) || 
        item.sku.toLowerCase().includes(query) ||
        (item.description && item.description.toLowerCase().includes(query))
      );
    }

    // Apply category filter
    if (categoryFilter.length > 0) {
      result = result.filter(item => categoryFilter.includes(item.category || ''));
    }

    // Apply status filter
    if (statusFilter.length > 0) {
      result = result.filter(item => statusFilter.includes(item.status || ''));
    }

    // Apply supplier filter
    if (supplierFilter) {
      result = result.filter(item => item.supplier === supplierFilter);
    }

    // Apply location filter
    if (locationFilter) {
      result = result.filter(item => item.location === locationFilter);
    }

    setFilteredItems(result);
  }, [items, searchQuery, categoryFilter, statusFilter, supplierFilter, locationFilter]);

  const resetFilters = () => {
    setSearchQuery('');
    setCategoryFilter([]);
    setStatusFilter([]);
    setSupplierFilter('');
    setLocationFilter('');
  };

  const updateFilter = (filterType: string, value: any) => {
    switch (filterType) {
      case 'search':
        setSearchQuery(value);
        break;
      case 'category':
        setCategoryFilter(value);
        break;
      case 'status':
        setStatusFilter(value);
        break;
      case 'supplier':
        setSupplierFilter(value);
        break;
      case 'location':
        setLocationFilter(value);
        break;
    }
  };

  return {
    loading,
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
    filteredItems,
    filters: {
      search: searchQuery,
      category: categoryFilter,
      status: statusFilter,
      supplier: supplierFilter,
      location: locationFilter
    },
    updateFilter,
    resetFilters,
    error,
    categories,
    statuses,
    suppliers,
    locations
  };
}
