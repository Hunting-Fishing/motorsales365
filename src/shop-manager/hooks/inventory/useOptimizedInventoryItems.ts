
import { useCallback } from 'react';
import { useInventoryData } from './useInventoryData';
import { updateInventoryItem } from '@/services/inventory/crudService';
import { InventoryItemExtended } from '@/types/inventory';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Optimized inventory items hook that uses centralized data
 * and efficient cache updates
 */
export function useOptimizedInventoryItems() {
  const { items, inventoryStats, isLoading, error, refetch } = useInventoryData();
  const queryClient = useQueryClient();

  const updateItem = useCallback(async (id: string, updates: Partial<InventoryItemExtended>): Promise<InventoryItemExtended> => {
    try {
      console.log('🔄 useOptimizedInventoryItems: Updating item', id, 'with:', updates);
      const updatedItem = await updateInventoryItem(id, updates);
      console.log('✅ useOptimizedInventoryItems: Successfully updated item:', updatedItem);
      
      // Optimistically update the cache
      queryClient.setQueryData(['inventory-items'], (oldData: InventoryItemExtended[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map(item => item.id === id ? updatedItem : item);
      });
      
      return updatedItem;
    } catch (error) {
      console.error('❌ useOptimizedInventoryItems: Error updating item:', error);
      // Invalidate cache on error to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      throw error;
    }
  }, [queryClient]);

  return {
    items,
    inventoryStats,
    loading: isLoading,
    isLoading,
    error,
    updateItem,
    refetch,
    fetchItems: refetch // Backward compatibility
  };
}
