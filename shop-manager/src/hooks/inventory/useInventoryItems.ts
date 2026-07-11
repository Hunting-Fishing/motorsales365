
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getInventoryItems, updateInventoryItem } from '@/services/inventoryService';
import { InventoryItemExtended } from '@/types/inventory';

export function useInventoryItems() {
  const {
    data: items = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['inventory-items'],
    queryFn: async () => {
      console.log('🔄 useInventoryItems: Fetching inventory items...');
      const result = await getInventoryItems();
      console.log('✅ useInventoryItems: Successfully fetched', result?.length || 0, 'items');
      return result || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const updateItem = async (id: string, updates: Partial<InventoryItemExtended>): Promise<InventoryItemExtended> => {
    try {
      console.log('🔄 useInventoryItems: Updating item', id, 'with:', updates);
      const updatedItem = await updateInventoryItem(id, updates);
      console.log('✅ useInventoryItems: Successfully updated item:', updatedItem);
      
      // Refetch to ensure we have the latest data
      refetch();
      
      return updatedItem;
    } catch (error) {
      console.error('❌ useInventoryItems: Error updating item:', error);
      throw error;
    }
  };

  const fetchItems = async () => {
    await refetch();
  };

  return {
    items,
    loading: isLoading, // Keep both for backward compatibility
    isLoading,
    error: error?.message || null,
    updateItem,
    refetch,
    fetchItems
  };
}
