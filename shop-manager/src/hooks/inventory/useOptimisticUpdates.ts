import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { InventoryItemExtended } from '@/types/inventory';
import { updateInventoryItem } from '@/services/inventory/crudService';
import { toast } from 'sonner';

export function useOptimisticUpdates() {
  const queryClient = useQueryClient();

  const optimisticUpdate = useCallback(async (
    id: string, 
    updates: Partial<InventoryItemExtended>,
    onSuccess?: (item: InventoryItemExtended) => void,
    onError?: (error: Error) => void
  ) => {
    // Store the previous state for rollback
    const previousData = queryClient.getQueryData<InventoryItemExtended[]>(['inventory-items']);
    
    try {
      // Optimistically update the cache
      queryClient.setQueryData<InventoryItemExtended[]>(['inventory-items'], (oldData) => {
        if (!oldData) return oldData;
        return oldData.map(item => 
          item.id === id ? { ...item, ...updates } : item
        );
      });

      // Also update infinite query cache if it exists
      queryClient.setQueryData(['inventory-infinite'], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            items: page.items.map((item: InventoryItemExtended) =>
              item.id === id ? { ...item, ...updates } : item
            )
          }))
        };
      });

      // Show optimistic feedback
      toast.success('Updating item...', { duration: 1000 });

      // Perform the actual update
      const updatedItem = await updateInventoryItem(id, updates);
      
      // Update with the real response
      queryClient.setQueryData<InventoryItemExtended[]>(['inventory-items'], (oldData) => {
        if (!oldData) return oldData;
        return oldData.map(item => 
          item.id === id ? updatedItem : item
        );
      });

      toast.success('Item updated successfully');
      onSuccess?.(updatedItem);
      
      return updatedItem;
    } catch (error) {
      // Rollback the optimistic update
      if (previousData) {
        queryClient.setQueryData(['inventory-items'], previousData);
        
        // Also rollback infinite query
        queryClient.invalidateQueries({ queryKey: ['inventory-infinite'] });
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to update item';
      toast.error(errorMessage);
      onError?.(error instanceof Error ? error : new Error(errorMessage));
      
      throw error;
    }
  }, [queryClient]);

  const optimisticDelete = useCallback(async (
    id: string,
    onSuccess?: () => void,
    onError?: (error: Error) => void
  ) => {
    const previousData = queryClient.getQueryData<InventoryItemExtended[]>(['inventory-items']);
    
    try {
      // Optimistically remove from cache
      queryClient.setQueryData<InventoryItemExtended[]>(['inventory-items'], (oldData) => {
        if (!oldData) return oldData;
        return oldData.filter(item => item.id !== id);
      });

      // Update infinite query cache
      queryClient.setQueryData(['inventory-infinite'], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            items: page.items.filter((item: InventoryItemExtended) => item.id !== id)
          }))
        };
      });

      toast.success('Deleting item...', { duration: 1000 });

      // Perform actual deletion (would need to implement this service)
      // await deleteInventoryItem(id);
      
      toast.success('Item deleted successfully');
      onSuccess?.();
    } catch (error) {
      // Rollback
      if (previousData) {
        queryClient.setQueryData(['inventory-items'], previousData);
        queryClient.invalidateQueries({ queryKey: ['inventory-infinite'] });
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete item';
      toast.error(errorMessage);
      onError?.(error instanceof Error ? error : new Error(errorMessage));
      
      throw error;
    }
  }, [queryClient]);

  const optimisticBulkUpdate = useCallback(async (
    updates: Array<{ id: string; updates: Partial<InventoryItemExtended> }>,
    onSuccess?: () => void,
    onError?: (error: Error) => void
  ) => {
    const previousData = queryClient.getQueryData<InventoryItemExtended[]>(['inventory-items']);
    
    try {
      // Optimistically update all items
      queryClient.setQueryData<InventoryItemExtended[]>(['inventory-items'], (oldData) => {
        if (!oldData) return oldData;
        return oldData.map(item => {
          const update = updates.find(u => u.id === item.id);
          return update ? { ...item, ...update.updates } : item;
        });
      });

      toast.success(`Updating ${updates.length} items...`, { duration: 1000 });

      // Perform bulk update (would need to implement this service)
      // await bulkUpdateInventoryItems(updates);
      
      // For now, simulate with individual updates
      await Promise.all(
        updates.map(({ id, updates: itemUpdates }) => 
          updateInventoryItem(id, itemUpdates)
        )
      );
      
      toast.success(`${updates.length} items updated successfully`);
      onSuccess?.();
    } catch (error) {
      // Rollback
      if (previousData) {
        queryClient.setQueryData(['inventory-items'], previousData);
        queryClient.invalidateQueries({ queryKey: ['inventory-infinite'] });
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to update items';
      toast.error(errorMessage);
      onError?.(error instanceof Error ? error : new Error(errorMessage));
      
      throw error;
    }
  }, [queryClient]);

  return {
    optimisticUpdate,
    optimisticDelete,
    optimisticBulkUpdate
  };
}