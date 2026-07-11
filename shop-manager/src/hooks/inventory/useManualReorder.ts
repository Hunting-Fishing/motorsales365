
import { useState } from "react";
import { toast } from "sonner";
import { InventoryItemExtended } from "@/types/inventory";
import { supabase } from "@/integrations/supabase/client";

export function useManualReorder() {
  const [isReordering, setIsReordering] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItemExtended | null>(null);
  const [quantity, setQuantity] = useState(0);

  const selectItemForReorder = (item: InventoryItemExtended, defaultQuantity?: number) => {
    setSelectedItem(item);
    setQuantity(defaultQuantity || item.reorder_point || 10);
  };

  const clearSelection = () => {
    setSelectedItem(null);
    setQuantity(0);
  };

  const handleQuantityChange = (newQuantity: number) => {
    setQuantity(Math.max(1, newQuantity));
  };

  const reorderItem = async (itemId?: string, orderQuantity?: number) => {
    const itemToOrder = selectedItem;
    const quantityToOrder = orderQuantity || quantity;
    
    if (!itemToOrder && !itemId) return;
    
    setIsReordering(true);
    try {
      const { error } = await supabase.from('inventory_orders').insert({
        item_id: itemId || itemToOrder?.id,
        quantity_ordered: quantityToOrder,
        supplier: itemToOrder?.supplier || '',
        expected_arrival: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
        status: 'ordered'
      });

      if (error) throw error;
      
      toast("Reorder submitted successfully", {
        description: `Ordered ${quantityToOrder} units of ${itemToOrder?.name || 'selected item'}`
      });
      
      clearSelection();
      return true;
    } catch (err) {
      console.error("Error submitting reorder:", err);
      toast("Failed to submit reorder", {
        description: "Please try again later"
      });
      return false;
    } finally {
      setIsReordering(false);
    }
  };

  return {
    isReordering,
    selectedItem,
    quantity,
    selectItemForReorder,
    clearSelection,
    handleQuantityChange,
    reorderItem
  };
}
