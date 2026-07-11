
import { useState, useEffect } from 'react';
import { InventoryItemExtended, ReorderSettings } from '@/types/inventory';
import { getInventoryItems } from '@/services/inventory/crudService';
import { countLowStockItems, countOutOfStockItems } from '@/utils/inventory/inventoryUtils';

export function useInventoryManager() {
  const [lowStockItems, setLowStockItems] = useState<InventoryItemExtended[]>([]);
  const [outOfStockItems, setOutOfStockItems] = useState<InventoryItemExtended[]>([]);
  const [autoReorderSettings, setAutoReorderSettings] = useState<ReorderSettings>({});
  const [loading, setLoading] = useState(true);
  
  const checkInventoryAlerts = async () => {
    setLoading(true);
    try {
      const items = await getInventoryItems();
      
      // Filter low stock and out of stock items
      const lowStock = items.filter(item => 
        item.quantity > 0 && item.quantity <= (item.reorder_point || 10)
      );
      const outOfStock = items.filter(item => item.quantity === 0);
      
      setLowStockItems(lowStock);
      setOutOfStockItems(outOfStock);
      
      // Initialize auto-reorder settings (you can load these from your database)
      const settings: ReorderSettings = {};
      items.forEach(item => {
        settings[item.id] = {
          enabled: false,
          threshold: item.reorder_point || 10,
          quantity: 50 // default reorder quantity
        };
      });
      setAutoReorderSettings(settings);
      
    } catch (error) {
      console.error("Error checking inventory alerts:", error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    checkInventoryAlerts();
  }, []);
  
  return {
    lowStockItems,
    outOfStockItems,
    autoReorderSettings,
    loading,
    checkInventoryAlerts
  };
}
