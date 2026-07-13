
import { supabase } from "@/integrations/supabase/client";

export interface InventoryTransaction {
  id: string;
  inventory_item_id: string;
  transaction_type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reference_id?: string;
  reference_type?: string;
  notes?: string;
  created_at: string;
  performed_by?: string;
}

/**
 * Record an inventory transaction
 */
export const recordInventoryTransaction = async (transaction: Omit<InventoryTransaction, 'id' | 'created_at'>): Promise<InventoryTransaction | null> => {
  try {
    const { data, error } = await supabase
      .from('inventory_transactions')
      .insert(transaction)
      .select()
      .single();
      
    if (error) throw error;
    
    // Type cast the response to ensure proper typing
    return data ? {
      id: data.id,
      inventory_item_id: data.inventory_item_id,
      transaction_type: data.transaction_type as 'in' | 'out' | 'adjustment',
      quantity: data.quantity,
      reference_id: data.reference_id,
      reference_type: data.reference_type,
      notes: data.notes,
      created_at: data.created_at,
      performed_by: data.performed_by
    } : null;
  } catch (error) {
    console.error('Error recording inventory transaction:', error);
    return null;
  }
};

/**
 * Get transactions for a specific item
 */
export const getItemTransactions = async (itemId: string): Promise<InventoryTransaction[]> => {
  try {
    const { data, error } = await supabase
      .from('inventory_transactions')
      .select('*')
      .eq('inventory_item_id', itemId)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    // Type cast the response to ensure proper typing
    return data?.map(item => ({
      id: item.id,
      inventory_item_id: item.inventory_item_id,
      transaction_type: item.transaction_type as 'in' | 'out' | 'adjustment',
      quantity: item.quantity,
      reference_id: item.reference_id,
      reference_type: item.reference_type,
      notes: item.notes,
      created_at: item.created_at,
      performed_by: item.performed_by
    })) || [];
  } catch (error) {
    console.error('Error fetching item transactions:', error);
    return [];
  }
};

/**
 * Get all inventory transactions
 */
export const getInventoryTransactions = async (): Promise<InventoryTransaction[]> => {
  try {
    const { data, error } = await supabase
      .from('inventory_transactions')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    // Type cast the response to ensure proper typing
    return data?.map(item => ({
      id: item.id,
      inventory_item_id: item.inventory_item_id,
      transaction_type: item.transaction_type as 'in' | 'out' | 'adjustment',
      quantity: item.quantity,
      reference_id: item.reference_id,
      reference_type: item.reference_type,
      notes: item.notes,
      created_at: item.created_at,
      performed_by: item.performed_by
    })) || [];
  } catch (error) {
    console.error('Error fetching inventory transactions:', error);
    return [];
  }
};

/**
 * Alias for getItemTransactions for backward compatibility
 */
export const getTransactionsForItem = getItemTransactions;

/**
 * Create inventory transaction (alias for recordInventoryTransaction)
 */
export const createInventoryTransaction = recordInventoryTransaction;
