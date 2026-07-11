import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type InventoryCategory = 'chemicals' | 'parts' | 'safety_gear' | 'accessories';
export type TransactionType = 'received' | 'used' | 'adjusted' | 'transferred';

export interface InventoryItem {
  id: string;
  shop_id: string;
  name: string;
  sku: string | null;
  description: string | null;
  category: InventoryCategory;
  subcategory: string | null;
  quantity: number;
  unit_of_measure: string;
  reorder_point: number;
  reorder_quantity: number;
  unit_cost: number;
  vendor_id: string | null;
  vendor_sku: string | null;
  location: string | null;
  expiration_date: string | null;
  sds_url: string | null;
  dilution_ratio: string | null;
  sh_percentage: number | null;
  compatible_equipment: string[] | null;
  notes: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryVendor {
  id: string;
  shop_id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  account_number: string | null;
  notes: string | null;
  is_preferred: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryTransaction {
  id: string;
  inventory_item_id: string;
  transaction_type: TransactionType;
  quantity_change: number;
  job_id: string | null;
  notes: string | null;
  performed_by: string | null;
  created_at: string;
}

export interface CreateInventoryItemInput {
  name: string;
  sku?: string;
  description?: string;
  category: InventoryCategory;
  subcategory?: string;
  quantity?: number;
  unit_of_measure?: string;
  reorder_point?: number;
  reorder_quantity?: number;
  unit_cost?: number;
  vendor_id?: string;
  vendor_sku?: string;
  location?: string;
  expiration_date?: string;
  sds_url?: string;
  dilution_ratio?: string;
  compatible_equipment?: string[];
  notes?: string;
  image_url?: string;
}

export interface CreateTransactionInput {
  inventory_item_id: string;
  transaction_type: TransactionType;
  quantity_change: number;
  job_id?: string;
  notes?: string;
}

// Fetch all inventory items
export function usePowerWashingInventory(category?: InventoryCategory) {
  return useQuery({
    queryKey: ['power-washing-inventory', category],
    queryFn: async () => {
      let query = supabase
        .from('power_washing_inventory')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as InventoryItem[];
    },
  });
}

// Fetch low stock items
export function useLowStockItems() {
  return useQuery({
    queryKey: ['power-washing-inventory-low-stock'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('power_washing_inventory')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      
      // Filter items where quantity <= reorder_point
      return (data as InventoryItem[]).filter(
        item => item.reorder_point > 0 && item.quantity <= item.reorder_point
      );
    },
  });
}

// Fetch inventory vendors
export function useInventoryVendors() {
  return useQuery({
    queryKey: ['power-washing-inventory-vendors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('power_washing_inventory_vendors')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data as InventoryVendor[];
    },
  });
}

// Fetch transactions for an item
export function useInventoryTransactions(itemId: string) {
  return useQuery({
    queryKey: ['power-washing-inventory-transactions', itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('power_washing_inventory_transactions')
        .select('*')
        .eq('inventory_item_id', itemId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as InventoryTransaction[];
    },
    enabled: !!itemId,
  });
}

// Create inventory item
export function useCreateInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateInventoryItemInput) => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .maybeSingle();

      if (!profile?.shop_id) throw new Error('No shop found for user');

      const { data, error } = await supabase
        .from('power_washing_inventory')
        .insert({
          ...input,
          shop_id: profile.shop_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-washing-inventory'] });
      toast.success('Item added to inventory');
    },
    onError: (error) => {
      toast.error('Failed to add item: ' + error.message);
    },
  });
}

// Update inventory item
export function useUpdateInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<InventoryItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('power_washing_inventory')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-washing-inventory'] });
      toast.success('Item updated');
    },
    onError: (error) => {
      toast.error('Failed to update item: ' + error.message);
    },
  });
}

// Delete (deactivate) inventory item
export function useDeleteInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('power_washing_inventory')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-washing-inventory'] });
      toast.success('Item removed from inventory');
    },
    onError: (error) => {
      toast.error('Failed to remove item: ' + error.message);
    },
  });
}

// Create inventory transaction
export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTransactionInput) => {
      const { data: user } = await supabase.auth.getUser();
      
      // Insert transaction
      const { data: transaction, error: txError } = await supabase
        .from('power_washing_inventory_transactions')
        .insert({
          ...input,
          performed_by: user.user?.id,
        })
        .select()
        .single();

      if (txError) throw txError;

      // Update inventory quantity
      const { data: item, error: fetchError } = await supabase
        .from('power_washing_inventory')
        .select('quantity')
        .eq('id', input.inventory_item_id)
        .single();

      if (fetchError) throw fetchError;

      const newQuantity = Number(item.quantity) + Number(input.quantity_change);

      const { error: updateError } = await supabase
        .from('power_washing_inventory')
        .update({ quantity: Math.max(0, newQuantity) })
        .eq('id', input.inventory_item_id);

      if (updateError) throw updateError;

      return transaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-washing-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['power-washing-inventory-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['power-washing-inventory-low-stock'] });
      toast.success('Transaction recorded');
    },
    onError: (error) => {
      toast.error('Failed to record transaction: ' + error.message);
    },
  });
}

// Create vendor
export function useCreateVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Omit<InventoryVendor, 'id' | 'shop_id' | 'created_at' | 'updated_at'>) => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .maybeSingle();

      if (!profile?.shop_id) throw new Error('No shop found for user');

      const { data, error } = await supabase
        .from('power_washing_inventory_vendors')
        .insert({
          ...input,
          shop_id: profile.shop_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-washing-inventory-vendors'] });
      toast.success('Vendor added');
    },
    onError: (error) => {
      toast.error('Failed to add vendor: ' + error.message);
    },
  });
}

// Get inventory stats
export function useInventoryStats() {
  return useQuery({
    queryKey: ['power-washing-inventory-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('power_washing_inventory')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      const items = data as InventoryItem[];
      const lowStockCount = items.filter(
        item => item.reorder_point > 0 && item.quantity <= item.reorder_point
      ).length;
      const totalValue = items.reduce(
        (sum, item) => sum + (Number(item.quantity) * Number(item.unit_cost)),
        0
      );
      const categoryCount = {
        chemicals: items.filter(i => i.category === 'chemicals').length,
        parts: items.filter(i => i.category === 'parts').length,
        safety_gear: items.filter(i => i.category === 'safety_gear').length,
        accessories: items.filter(i => i.category === 'accessories').length,
      };

      return {
        totalItems: items.length,
        lowStockCount,
        totalValue,
        categoryCount,
      };
    },
  });
}
