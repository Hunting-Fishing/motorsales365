import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Types
export interface StockMovement {
  id: string;
  part_id: string;
  movement_type: 'adjustment' | 'job_usage' | 'purchase' | 'return' | 'transfer' | 'damage' | 'count';
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  job_id?: string;
  purchase_order_id?: string;
  reason?: string;
  notes?: string;
  performed_by?: string;
  created_at: string;
  gunsmith_parts?: { name: string; part_number?: string };
  gunsmith_jobs?: { job_number: string };
}

export interface JobPart {
  id: string;
  job_id: string;
  part_id: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
  is_deducted: boolean;
  notes?: string;
  gunsmith_parts?: { name: string; part_number?: string; quantity: number };
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier?: string;
  supplier_contact?: string;
  supplier_email?: string;
  status: string;
  order_date?: string;
  expected_date?: string;
  received_date?: string;
  subtotal?: number;
  tax?: number;
  shipping?: number;
  total?: number;
  notes?: string;
  created_at: string;
}

export interface POItem {
  id: string;
  purchase_order_id: string;
  part_id?: string;
  part_name: string;
  part_number?: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost?: number;
  total_cost?: number;
}

export interface SerializedItem {
  id: string;
  part_id: string;
  serial_number: string;
  status: 'in_stock' | 'reserved' | 'sold' | 'used_in_job' | 'returned' | 'damaged';
  job_id?: string;
  customer_id?: string;
  acquisition_date?: string;
  acquisition_source?: string;
  notes?: string;
  gunsmith_parts?: { name: string };
  gunsmith_jobs?: { job_number: string };
  customers?: { first_name: string; last_name?: string };
}

// Stock Movements
export function useStockMovements(partId?: string) {
  return useQuery({
    queryKey: ['gunsmith-stock-movements', partId],
    queryFn: async () => {
      let query = (supabase as any)
        .from('gunsmith_stock_movements')
        .select('*, gunsmith_parts(name, part_number), gunsmith_jobs(job_number)')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (partId) {
        query = query.eq('part_id', partId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as StockMovement[];
    }
  });
}

export function useCreateStockMovement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (movement: {
      part_id: string;
      movement_type: string;
      quantity_change: number;
      reason?: string;
      notes?: string;
      job_id?: string;
    }) => {
      // Get current quantity
      const { data: part } = await (supabase as any)
        .from('gunsmith_parts')
        .select('quantity, shop_id')
        .eq('id', movement.part_id)
        .single();
      
      const quantityBefore = part?.quantity || 0;
      const quantityAfter = quantityBefore + movement.quantity_change;

      // Insert movement record
      const { error: moveError } = await (supabase as any)
        .from('gunsmith_stock_movements')
        .insert({
          ...movement,
          shop_id: part?.shop_id,
          quantity_before: quantityBefore,
          quantity_after: quantityAfter
        });
      if (moveError) throw moveError;

      // Update part quantity
      const { error: updateError } = await (supabase as any)
        .from('gunsmith_parts')
        .update({ quantity: quantityAfter })
        .eq('id', movement.part_id);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gunsmith-stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['gunsmith-parts'] });
      toast({ title: 'Stock updated' });
    }
  });
}

// Job Parts
export function useJobParts(jobId: string) {
  return useQuery({
    queryKey: ['gunsmith-job-parts', jobId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('gunsmith_job_parts')
        .select('*, gunsmith_parts(name, part_number, quantity, retail_price)')
        .eq('job_id', jobId);
      if (error) throw error;
      return data as JobPart[];
    },
    enabled: !!jobId
  });
}

export function useAddJobPart() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { job_id: string; part_id: string; quantity: number; unit_price?: number }) => {
      const { data: part } = await (supabase as any)
        .from('gunsmith_parts')
        .select('shop_id')
        .eq('id', data.part_id)
        .single();

      const totalPrice = data.unit_price ? data.unit_price * data.quantity : undefined;
      
      const { error } = await (supabase as any)
        .from('gunsmith_job_parts')
        .insert({
          ...data,
          shop_id: part?.shop_id,
          total_price: totalPrice
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gunsmith-job-parts'] });
      toast({ title: 'Part added to job' });
    }
  });
}

export function useDeductJobParts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (jobId: string) => {
      // Get all non-deducted parts for this job
      const { data: jobParts } = await (supabase as any)
        .from('gunsmith_job_parts')
        .select('*, gunsmith_parts(quantity, shop_id)')
        .eq('job_id', jobId)
        .eq('is_deducted', false);

      if (!jobParts?.length) return;

      for (const jp of jobParts) {
        const currentQty = jp.gunsmith_parts?.quantity || 0;
        const newQty = Math.max(0, currentQty - jp.quantity);

        // Create stock movement
        await (supabase as any)
          .from('gunsmith_stock_movements')
          .insert({
            shop_id: jp.gunsmith_parts?.shop_id,
            part_id: jp.part_id,
            movement_type: 'job_usage',
            quantity_change: -jp.quantity,
            quantity_before: currentQty,
            quantity_after: newQty,
            job_id: jobId,
            reason: 'Used in job'
          });

        // Update part quantity
        await (supabase as any)
          .from('gunsmith_parts')
          .update({ quantity: newQty })
          .eq('id', jp.part_id);

        // Mark as deducted
        await (supabase as any)
          .from('gunsmith_job_parts')
          .update({ is_deducted: true, deducted_at: new Date().toISOString() })
          .eq('id', jp.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gunsmith-job-parts'] });
      queryClient.invalidateQueries({ queryKey: ['gunsmith-parts'] });
      queryClient.invalidateQueries({ queryKey: ['gunsmith-stock-movements'] });
      toast({ title: 'Parts deducted from inventory' });
    }
  });
}

// Purchase Orders
export function usePurchaseOrders() {
  return useQuery({
    queryKey: ['gunsmith-purchase-orders'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('gunsmith_purchase_orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as PurchaseOrder[];
    }
  });
}

export function usePurchaseOrder(id: string) {
  return useQuery({
    queryKey: ['gunsmith-purchase-order', id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('gunsmith_purchase_orders')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as PurchaseOrder;
    },
    enabled: !!id
  });
}

export function usePOItems(poId: string) {
  return useQuery({
    queryKey: ['gunsmith-po-items', poId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('gunsmith_po_items')
        .select('*')
        .eq('purchase_order_id', poId);
      if (error) throw error;
      return data as POItem[];
    },
    enabled: !!poId
  });
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (po: Partial<PurchaseOrder> & { items?: Partial<POItem>[] }) => {
      const poNumber = `PO-${Date.now().toString(36).toUpperCase()}`;
      
      // Get shop_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .single();

      const { data: newPO, error: poError } = await (supabase as any)
        .from('gunsmith_purchase_orders')
        .insert({ ...po, po_number: poNumber, shop_id: profile?.shop_id })
        .select()
        .single();
      if (poError) throw poError;

      // Insert items if provided
      if (po.items?.length) {
        const items = po.items.map(item => ({
          ...item,
          purchase_order_id: newPO.id
        }));
        const { error: itemsError } = await (supabase as any)
          .from('gunsmith_po_items')
          .insert(items);
        if (itemsError) throw itemsError;
      }

      return newPO;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gunsmith-purchase-orders'] });
      toast({ title: 'Purchase order created' });
    }
  });
}

export function useReceivePOItems() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ poId, items }: { poId: string; items: { id: string; quantity_received: number }[] }) => {
      for (const item of items) {
        // Get item details
        const { data: poItem } = await (supabase as any)
          .from('gunsmith_po_items')
          .select('*, gunsmith_parts(quantity, shop_id)')
          .eq('id', item.id)
          .single();

        if (poItem?.part_id && item.quantity_received > 0) {
          const currentQty = poItem.gunsmith_parts?.quantity || 0;
          const newQty = currentQty + item.quantity_received;

          // Create stock movement
          await (supabase as any)
            .from('gunsmith_stock_movements')
            .insert({
              shop_id: poItem.gunsmith_parts?.shop_id,
              part_id: poItem.part_id,
              movement_type: 'purchase',
              quantity_change: item.quantity_received,
              quantity_before: currentQty,
              quantity_after: newQty,
              purchase_order_id: poId,
              reason: `Received from PO`
            });

          // Update part quantity
          await (supabase as any)
            .from('gunsmith_parts')
            .update({ quantity: newQty })
            .eq('id', poItem.part_id);
        }

        // Update PO item
        await (supabase as any)
          .from('gunsmith_po_items')
          .update({ 
            quantity_received: (poItem?.quantity_received || 0) + item.quantity_received,
            received_date: new Date().toISOString()
          })
          .eq('id', item.id);
      }

      // Update PO status
      await (supabase as any)
        .from('gunsmith_purchase_orders')
        .update({ status: 'received', received_date: new Date().toISOString() })
        .eq('id', poId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gunsmith-purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['gunsmith-po-items'] });
      queryClient.invalidateQueries({ queryKey: ['gunsmith-parts'] });
      queryClient.invalidateQueries({ queryKey: ['gunsmith-stock-movements'] });
      toast({ title: 'Items received into inventory' });
    }
  });
}

// Serialized Items
export function useSerializedItems(partId?: string) {
  return useQuery({
    queryKey: ['gunsmith-serialized-items', partId],
    queryFn: async () => {
      let query = (supabase as any)
        .from('gunsmith_serialized_items')
        .select('*, gunsmith_parts(name), gunsmith_jobs(job_number), customers(first_name, last_name)')
        .order('created_at', { ascending: false });
      
      if (partId) {
        query = query.eq('part_id', partId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as SerializedItem[];
    }
  });
}

export function useCreateSerializedItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (item: Partial<SerializedItem>) => {
      const { data: part } = await (supabase as any)
        .from('gunsmith_parts')
        .select('shop_id')
        .eq('id', item.part_id)
        .single();

      const { error } = await (supabase as any)
        .from('gunsmith_serialized_items')
        .insert({ ...item, shop_id: part?.shop_id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gunsmith-serialized-items'] });
      toast({ title: 'Serialized item added' });
    }
  });
}

export function useUpdateSerializedItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SerializedItem> & { id: string }) => {
      const { error } = await (supabase as any)
        .from('gunsmith_serialized_items')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gunsmith-serialized-items'] });
      toast({ title: 'Item updated' });
    }
  });
}

// Compatible Firearms Search
export function usePartsForFirearm(make?: string, model?: string) {
  return useQuery({
    queryKey: ['gunsmith-parts-compatible', make, model],
    queryFn: async () => {
      if (!make && !model) return [];
      
      const searchTerm = `${make || ''} ${model || ''}`.trim().toLowerCase();
      
      const { data, error } = await (supabase as any)
        .from('gunsmith_parts')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      // Filter by compatible_firearms array
      return (data || []).filter((part: any) => {
        if (!part.compatible_firearms?.length) return false;
        return part.compatible_firearms.some((f: string) => 
          f.toLowerCase().includes(searchTerm)
        );
      });
    },
    enabled: !!(make || model)
  });
}

// Low Stock Alert
export function useLowStockParts() {
  return useQuery({
    queryKey: ['gunsmith-low-stock'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('gunsmith_parts')
        .select('*')
        .order('name');
      if (error) throw error;
      return (data || []).filter((p: any) => p.quantity <= p.min_quantity);
    }
  });
}
