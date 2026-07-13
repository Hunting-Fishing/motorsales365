
import { useState, useEffect } from 'react';
import { InventoryItemExtended } from '@sm/types/inventory';
import { getInventoryItems } from '@sm/services/inventory/crudService';
import { countLowStockItems, countOutOfStockItems } from '@sm/utils/inventory/inventoryUtils';

export function useInventoryAlerts() {
  const [lowStockCount, setLowStockCount] = useState(0);
  const [outOfStockCount, setOutOfStockCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [inventoryItems, setInventoryItems] = useState<InventoryItemExtended[]>([]);
  
  useEffect(() => {
    const fetchInventoryAlerts = async () => {
      setLoading(true);
      try {
        const items = await getInventoryItems();
        
        setInventoryItems(items);
        setLowStockCount(countLowStockItems(items));
        setOutOfStockCount(countOutOfStockItems(items));
      } catch (error) {
        console.error("Error fetching inventory alerts:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchInventoryAlerts();
  }, []);
  
  return {
    lowStockCount,
    outOfStockCount,
    loading,
    inventoryItems
  };
}
