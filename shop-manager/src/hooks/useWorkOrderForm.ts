
import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { WorkOrderFormValues, WorkOrderInventoryItem } from "@/types/workOrder";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useShopId } from "@/hooks/useShopId";

// Re-export for other components using export type
export type { WorkOrderFormValues } from "@/types/workOrder";

export const useWorkOrderForm = (initialData: Partial<WorkOrderFormValues> = {}) => {
  const { toast } = useToast();
  const { shopId } = useShopId();
  const [inventoryItems, setInventoryItems] = useState<WorkOrderInventoryItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Set default values with proper type handling
  const defaultValues: Partial<WorkOrderFormValues> = {
    description: initialData.description || "",
    customer: initialData.customer || "",
    status: initialData.status || "pending",
    priority: initialData.priority || "medium",
    dueDate: initialData.dueDate || "",
    technician: initialData.technician || "",
    location: initialData.location || "",
    notes: initialData.notes || "",
    vehicleMake: initialData.vehicleMake || "",
    vehicleModel: initialData.vehicleModel || "",
    vehicleYear: initialData.vehicleYear || "",
    licensePlate: initialData.licensePlate || "",
    vin: initialData.vin || ""
  };

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    control,
    formState: { errors },
    reset
  } = useForm<WorkOrderFormValues>({
    defaultValues,
    mode: "onBlur"
  });

  const onSubmit = useCallback(async (data: WorkOrderFormValues) => {
    setIsSubmitting(true);
    try {
      // Generate work order number
      const workOrderNumber = `WO-${Date.now().toString().slice(-8)}`;
      
      // Insert work order into database
      const { error } = await supabase
        .from('work_orders')
        .insert({
          work_order_number: workOrderNumber,
          description: data.description,
          customer_id: data.customer || null,
          status: data.status || 'pending',
          priority: data.priority || 'medium',
          start_time: data.dueDate ? new Date(data.dueDate).toISOString() : null,
          assigned_technician_id: data.technician || null,
          notes: data.notes,
          shop_id: shopId,
        });

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Work order created successfully!",
      });
      
      reset(defaultValues);
    } catch (error) {
      console.error('Failed to create work order:', error);
      toast({
        title: "Error",
        description: "Failed to create work order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [toast, reset, defaultValues, shopId]);

  // Fix validateWorkOrder function
  const validateWorkOrder = (values: Partial<WorkOrderFormValues>) => {
    const errors: Record<string, string> = {};
    
    if (!values.description) {
      errors.description = "Description is required";
    }
    
    if (!values.customer) {
      errors.customer = "Customer is required";
    }
    
    if (!values.dueDate) {
      errors.dueDate = "Due date is required";
    }
    
    return errors;
  };

  const handleAddItem = (item: WorkOrderInventoryItem) => {
    setInventoryItems([...inventoryItems, item]);
  };

  const handleRemoveItem = (itemId: string) => {
    setInventoryItems(inventoryItems.filter((item) => item.id !== itemId));
  };

  const handleUpdateItem = (itemId: string, updatedItem: WorkOrderInventoryItem) => {
    setInventoryItems(
      inventoryItems.map((item) => (item.id === itemId ? updatedItem : item))
    );
  };

  return {
    register,
    handleSubmit,
    setValue,
    getValues,
    control,
    errors,
    onSubmit,
    isSubmitting,
    validateWorkOrder,
    inventoryItems,
    setInventoryItems,
    handleAddItem,
    handleRemoveItem,
    handleUpdateItem
  };
};

export default useWorkOrderForm;
