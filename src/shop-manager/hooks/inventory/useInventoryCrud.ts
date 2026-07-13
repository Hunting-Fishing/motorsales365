
import { useState } from 'react';
import { InventoryItemExtended } from '@/types/inventory';
import { createInventoryItem, updateInventoryItem, deleteInventoryItem } from '@/services/inventory/crudService';

export function useInventoryCrud() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addItem = async (itemData: Omit<InventoryItemExtended, 'id'>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Adding new inventory item:', itemData);
      const newItem = await createInventoryItem(itemData);
      console.log('Successfully added inventory item:', newItem);
      return newItem;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add inventory item';
      console.error('Error adding inventory item:', err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateItem = async (id: string, itemData: Partial<InventoryItemExtended>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Updating inventory item:', id, itemData);
      const updatedItem = await updateInventoryItem(id, itemData);
      console.log('Successfully updated inventory item:', updatedItem);
      return updatedItem;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update inventory item';
      console.error('Error updating inventory item:', err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteItem = async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Deleting inventory item:', id);
      await deleteInventoryItem(id);
      console.log('Successfully deleted inventory item:', id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete inventory item';
      console.error('Error deleting inventory item:', err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    addItem,
    updateItem,
    deleteItem,
    isLoading,
    error
  };
}
