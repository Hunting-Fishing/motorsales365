
import { useState } from "react";
import { useInventoryItems } from "@/hooks/inventory/useInventoryItems";
import { InventoryItemExtended } from "@/types/inventory";
import { useInventoryVendors } from "@/hooks/inventory/useInventoryVendors";
import { useInventoryOrders } from "@/hooks/inventory/useInventoryOrders";
import { toast } from "@/hooks/use-toast";

export const useCreateOrderDialog = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItemExtended | null>(null);
  const { items, isLoading, fetchItems } = useInventoryItems();
  const { vendors } = useInventoryVendors();
  const { createOrder } = useInventoryOrders();

  const openDialog = (item?: InventoryItemExtended) => {
    if (item) {
      setSelectedItem(item);
    } else {
      setSelectedItem(null);
    }
    
    // Load fresh inventory data when opening dialog
    fetchItems();
    setIsOpen(true);
  };

  const closeDialog = () => {
    setIsOpen(false);
    setSelectedItem(null);
  };

  const handleCreateOrder = async (orderData: any) => {
    try {
      await createOrder(orderData);
      toast({
        title: "Success",
        description: "Order created successfully",
        variant: "default",
      });
      closeDialog();
      return true;
    } catch (error) {
      console.error("Failed to create order:", error);
      toast({
        title: "Error",
        description: "Failed to create order. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    isOpen,
    selectedItem,
    inventoryItems: items,
    vendors,
    isLoading,
    openDialog,
    closeDialog,
    handleCreateOrder
  };
};
