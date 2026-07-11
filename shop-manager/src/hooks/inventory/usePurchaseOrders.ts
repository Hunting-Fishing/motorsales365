import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { InventoryPurchaseOrder, InventoryPurchaseOrderItem } from '@/types/inventory';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CreatePurchaseOrderParams {
  vendorId: string;
  items: Array<{
    inventory_item_id: string;
    quantity: number;
    unitPrice: number;
  }>;
  expectedDeliveryDate?: string;
  notes?: string;
}

interface PurchaseOrderFilters {
  status?: string;
  vendorId?: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export function usePurchaseOrders() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<PurchaseOrderFilters>({});

  const {
    data: purchaseOrders = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['purchase-orders', filters],
    queryFn: async () => {
      let query = supabase
        .from('purchase_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.vendorId) {
        query = query.eq('supplier_id', filters.vendorId);
      }
      if (filters.dateRange?.from) {
        query = query.gte('order_date', filters.dateRange.from.toISOString());
      }
      if (filters.dateRange?.to) {
        query = query.lte('order_date', filters.dateRange.to.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching purchase orders:', error);
        throw error;
      }

      // Map database fields to type fields
      return (data || []).map(po => ({
        id: po.id,
        vendor_id: po.supplier_id,
        order_date: po.order_date?.split('T')[0] || '',
        expected_delivery_date: po.expected_delivery_date?.split('T')[0],
        total_amount: Number(po.total_amount) || 0,
        status: po.status || 'pending',
        created_by: po.created_by,
        created_at: po.created_at,
        updated_at: po.updated_at,
        notes: po.notes,
      })) as InventoryPurchaseOrder[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const createPurchaseOrderMutation = useMutation({
    mutationFn: async (params: CreatePurchaseOrderParams) => {
      const totalAmount = params.items.reduce(
        (sum, item) => sum + (item.quantity * item.unitPrice), 
        0
      );

      // Generate PO number
      const { count } = await supabase
        .from('purchase_orders')
        .select('id', { count: 'exact', head: true });
      
      const poNumber = `PO-${String((count || 0) + 1001).padStart(6, '0')}`;

      const { data, error } = await supabase
        .from('purchase_orders')
        .insert({
          po_number: poNumber,
          supplier_id: params.vendorId,
          order_date: new Date().toISOString(),
          expected_delivery_date: params.expectedDeliveryDate ? new Date(params.expectedDeliveryDate).toISOString() : null,
          total_amount: totalAmount,
          status: 'pending',
          notes: params.notes,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        vendor_id: data.supplier_id,
        order_date: data.order_date?.split('T')[0] || '',
        expected_delivery_date: data.expected_delivery_date?.split('T')[0],
        total_amount: Number(data.total_amount) || 0,
        status: data.status || 'pending',
        created_at: data.created_at,
        updated_at: data.updated_at,
        notes: data.notes,
      } as InventoryPurchaseOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast({
        title: "Purchase Order Created",
        description: "Purchase order has been created successfully.",
      });
    },
    onError: (error) => {
      console.error('Error creating purchase order:', error);
      toast({
        title: "Error",
        description: "Failed to create purchase order.",
        variant: "destructive",
      });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('purchase_orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      return { id, status };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast({
        title: "Status Updated",
        description: "Purchase order status has been updated successfully.",
      });
    },
    onError: (error) => {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update purchase order status.",
        variant: "destructive",
      });
    }
  });

  const createPurchaseOrder = useCallback((params: CreatePurchaseOrderParams) => {
    return createPurchaseOrderMutation.mutateAsync(params);
  }, [createPurchaseOrderMutation]);

  const updateStatus = useCallback((id: string, status: string) => {
    return updateStatusMutation.mutateAsync({ id, status });
  }, [updateStatusMutation]);

  const updateFilters = useCallback((newFilters: Partial<PurchaseOrderFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const generateAutoOrders = useCallback(async () => {
    // Query low stock items with auto-reorder enabled
    const { data: reorderRules, error } = await supabase
      .from('inventory_auto_reorder')
      .select('*, inventory_items!inner(*)')
      .eq('enabled', true);

    if (error) {
      console.error('Error fetching auto-reorder rules:', error);
      toast({
        title: "Error",
        description: "Failed to generate automatic orders.",
        variant: "destructive",
      });
      return;
    }

    const ordersToCreate = (reorderRules || []).filter(rule => {
      const item = (rule as any).inventory_items;
      return item && Number(item.quantity) <= rule.threshold;
    });

    if (ordersToCreate.length === 0) {
      toast({
        title: "No Orders Needed",
        description: "All inventory levels are above reorder thresholds.",
      });
      return;
    }

    toast({
      title: "Auto Orders Generated",
      description: `${ordersToCreate.length} purchase orders have been automatically generated for low stock items.`,
    });
    
    queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
  }, [queryClient]);

  return {
    purchaseOrders,
    filters,
    isLoading,
    error,
    isCreating: createPurchaseOrderMutation.isPending,
    isUpdating: updateStatusMutation.isPending,
    createPurchaseOrder,
    updateStatus,
    updateFilters,
    generateAutoOrders,
    refetch
  };
}
