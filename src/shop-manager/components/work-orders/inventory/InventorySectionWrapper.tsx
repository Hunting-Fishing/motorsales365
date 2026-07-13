
import React, { useEffect } from "react";
import { FormField, FormItem, FormLabel } from "@/components/ui/form";
import { UseFormReturn } from "react-hook-form";
import { WorkOrderInventoryField } from "./WorkOrderInventoryField";
import { useInventoryManager } from "@/hooks/inventory/useInventoryManager";
import { toast } from "@/hooks/use-toast";
import { WorkOrderFormSchemaValues } from "@/schemas/workOrderSchema";

interface InventorySectionWrapperProps {
  form: UseFormReturn<WorkOrderFormSchemaValues>;
}

export const InventorySectionWrapper: React.FC<InventorySectionWrapperProps> = ({
  form
}) => {
  // Use the inventory manager hook to access inventory management features
  const { checkInventoryAlerts, lowStockItems, outOfStockItems } = useInventoryManager();
  
  // Check for inventory alerts when this component mounts
  useEffect(() => {
    // This ensures inventory is checked when items are being added to work orders
    checkInventoryAlerts();
    
    // Display a notification if there are inventory alerts
    if (lowStockItems.length > 0 || outOfStockItems.length > 0) {
      toast({
        title: "Inventory Alerts",
        description: `${lowStockItems.length} items low on stock, ${outOfStockItems.length} items out of stock.`,
        variant: "warning",
        duration: 8000
      });
    }
  }, [checkInventoryAlerts, lowStockItems, outOfStockItems]);
  
  return <WorkOrderInventoryField form={form as any} />;
};
