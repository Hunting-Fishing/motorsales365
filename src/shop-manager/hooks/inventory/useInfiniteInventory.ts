import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { getInventoryItems } from '@/services/inventory/crudService';
import { InventoryItemExtended } from '@/types/inventory';

interface InfiniteInventoryParams {
  pageSize?: number;
  filters?: Record<string, any>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface InventoryPage {
  items: InventoryItemExtended[];
  nextCursor?: string;
  hasMore: boolean;
  totalCount: number;
}

export function useInfiniteInventory({
  pageSize = 50,
  filters = {},
  sortBy = 'created_at',
  sortOrder = 'desc'
}: InfiniteInventoryParams = {}) {
  
  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
    refetch
  } = useInfiniteQuery({
    queryKey: ['inventory-infinite', pageSize, filters, sortBy, sortOrder],
    queryFn: async ({ pageParam = 0 }) => {
      console.log('🔄 useInfiniteInventory: Fetching page', pageParam);
      
      // For now, simulate pagination by fetching all items and slicing
      // In a real implementation, this would use proper pagination in the API
      const allItems = await getInventoryItems();
      
      // Apply filters
      let filteredItems = allItems || [];
      
      // Apply search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredItems = filteredItems.filter(item => 
          item.name.toLowerCase().includes(searchTerm) ||
          item.sku.toLowerCase().includes(searchTerm) ||
          (item.description && item.description.toLowerCase().includes(searchTerm))
        );
      }
      
      // Apply other filters
      Object.entries(filters).forEach(([key, value]) => {
        if (key !== 'search' && value) {
          if (Array.isArray(value) && value.length > 0) {
            filteredItems = filteredItems.filter(item => 
              value.includes((item as any)[key])
            );
          } else if (typeof value === 'string') {
            filteredItems = filteredItems.filter(item => 
              (item as any)[key] === value
            );
          }
        }
      });
      
      // Apply sorting
      filteredItems.sort((a, b) => {
        const aVal = (a as any)[sortBy];
        const bVal = (b as any)[sortBy];
        
        if (sortOrder === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });
      
      const startIndex = pageParam * pageSize;
      const endIndex = startIndex + pageSize;
      const pageItems = filteredItems.slice(startIndex, endIndex);
      const hasMore = endIndex < filteredItems.length;
      
      console.log('✅ useInfiniteInventory: Fetched page', pageParam, 'with', pageItems.length, 'items');
      
      return {
        items: pageItems,
        nextCursor: hasMore ? (pageParam + 1).toString() : undefined,
        hasMore,
        totalCount: filteredItems.length
      } as InventoryPage;
    },
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? parseInt(lastPage.nextCursor || '0') : undefined;
    },
    initialPageParam: 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Flatten all pages into a single array
  const allItems = useMemo(() => {
    return data?.pages.flatMap(page => page.items) || [];
  }, [data]);

  // Get total count from the first page
  const totalCount = useMemo(() => {
    return data?.pages[0]?.totalCount || 0;
  }, [data]);

  return {
    items: allItems,
    totalCount,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
    refetch
  };
}