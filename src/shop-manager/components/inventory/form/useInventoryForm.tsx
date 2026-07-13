
import { useState } from 'react';
import { InventoryItemExtended } from '@/types/inventory';

export function useInventoryForm() {
  const [values, setValues] = useState<Partial<InventoryItemExtended>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Get inventory status based on quantity and reorder point
  const getInventoryStatus = (item: Partial<InventoryItemExtended>): string => {
    const quantity = Number(item.quantity) || 0;
    const reorderPoint = Number(item.reorder_point) || 0;
    
    if (quantity <= 0) {
      return "Out of Stock";
    } else if (quantity <= reorderPoint) {
      return "Low Stock";
    } else {
      return "In Stock";
    }
  };
  
  return {
    values,
    setValues,
    errors,
    setErrors,
    getInventoryStatus,
  };
}
