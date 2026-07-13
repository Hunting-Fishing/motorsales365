
import { useState, useEffect, useCallback } from "react";
import { WorkOrder, WorkOrderStatusType, WorkOrderInventoryItem } from "@/types/workOrder";
import { toast } from "sonner";
import { useWorkOrderService } from './useWorkOrderService';
import { useNavigate } from "react-router-dom";

export function useWorkOrderEditForm(workOrderId: string) {
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const {
    getWorkOrder,
    updateWorkOrder: updateWorkOrderService,
    deleteWorkOrder: deleteWorkOrderService,
  } = useWorkOrderService();

  useEffect(() => {
    const fetchWorkOrder = async () => {
      setLoading(true);
      setError(null);
      try {
        const fetchedWorkOrder = await getWorkOrder(workOrderId);
        setWorkOrder(fetchedWorkOrder);
      } catch (err: any) {
        setError(err.message || "Failed to load work order");
        toast.error(err.message || "Failed to load work order");
      } finally {
        setLoading(false);
      }
    };

    fetchWorkOrder();
  }, [workOrderId, getWorkOrder]);

  const handleSubmit = useCallback(
    async (values: any) => {
      try {
        if (!workOrder) {
          throw new Error("Work order not loaded");
        }

        // Normalize inventory items before submitting
        const normalizedInventoryItems = normalizeInventoryItems(values.inventoryItems || []);

        // Prepare the data for submission, including normalized inventory items
        const updateData = {
          ...values,
          inventoryItems: normalizedInventoryItems,
        };

        // Remove undefined values from updateData
        Object.keys(updateData).forEach(key => updateData[key] === undefined ? delete updateData[key] : {});

        // Call the updateWorkOrder service function
        const updatedWorkOrder = await updateWorkOrderService(workOrderId, updateData);

        if (updatedWorkOrder) {
          toast.success("Work order updated successfully");
          setWorkOrder(updatedWorkOrder);
        } else {
          throw new Error("Failed to update work order");
        }
      } catch (err: any) {
        console.error("Update failed:", err);
        setError(err.message || "Failed to update work order");
        toast.error(err.message || "Failed to update work order");
      }
    },
    [workOrderId, workOrder, updateWorkOrderService]
  );

  const handleDelete = useCallback(async () => {
    try {
      await deleteWorkOrderService(workOrderId);
      toast.success("Work order deleted successfully");
      navigate("/work-orders");
    } catch (err: any) {
      setError(err.message || "Failed to delete work order");
      toast.error(err.message || "Failed to delete work order");
    }
  }, [workOrderId, deleteWorkOrderService, navigate]);

  // Helper function to ensure inventory items have proper structure
  const normalizeInventoryItems = (items: any[]): WorkOrderInventoryItem[] => {
    return items.map(item => ({
      id: item.id || undefined, // Allow undefined for new items
      name: item.name || '', // Ensure name is always a string
      sku: item.sku || '', // Ensure sku is always a string
      category: item.category || '', // Ensure category is always a string
      quantity: typeof item.quantity === 'number' ? item.quantity : 0, // Ensure quantity is always a number
      unit_price: typeof item.unit_price === 'number' ? item.unit_price : 0, // Ensure unit_price is always a number
      total: typeof item.total === 'number' ? item.total : (item.quantity * item.unit_price) || 0, // Ensure total is always a number
      notes: item.notes,
      itemStatus: item.itemStatus,
      estimatedArrivalDate: item.estimatedArrivalDate,
      supplierName: item.supplierName,
      supplierOrderRef: item.supplierOrderRef
    }));
  };

  return {
    workOrder,
    loading,
    error,
    handleSubmit,
    handleDelete,
  };
}
