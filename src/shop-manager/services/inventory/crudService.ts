
import { supabase } from '@/integrations/supabase/client';
import { InventoryItemExtended } from '@/types/inventory';
import { formatInventoryForApi, formatInventoryItem } from '@/utils/inventory/inventoryUtils';

export async function getInventoryItems(): Promise<InventoryItemExtended[]> {
  try {
    console.log('Fetching inventory items from database...');
    
    // Get the current user's shop_id from the profiles table
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('No authenticated user found');
      return [];
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('shop_id')
      .or(`id.eq.${user.id},user_id.eq.${user.id}`)
      .maybeSingle();

    if (profileError || !profile?.shop_id) {
      console.log('No shop_id found for user');
      return [];
    }

    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('shop_id', profile.shop_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching inventory items:', error);
      throw error;
    }

    console.log(`Successfully fetched ${data?.length || 0} inventory items for shop ${profile.shop_id}`);
    return data?.map(formatInventoryItem) || [];
  } catch (error) {
    console.error('Error in getInventoryItems:', error);
    throw error;
  }
}

export async function getInventoryItemById(id: string): Promise<InventoryItemExtended | null> {
  try {
    console.log('Fetching inventory item by ID:', id);
    
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Item not found
      }
      console.error('Error fetching inventory item:', error);
      throw error;
    }

    return data ? formatInventoryItem(data) : null;
  } catch (error) {
    console.error('Error in getInventoryItemById:', error);
    throw error;
  }
}

export async function createInventoryItem(item: Omit<InventoryItemExtended, 'id'>): Promise<InventoryItemExtended> {
  try {
    console.log('Creating inventory item:', item);
    
    // Get the current user's shop_id
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('No authenticated user found');
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('shop_id')
      .or(`id.eq.${user.id},user_id.eq.${user.id}`)
      .maybeSingle();

    if (profileError || !profile?.shop_id) {
      throw new Error('No shop_id found for user');
    }

    const apiData = {
      ...formatInventoryForApi(item),
      shop_id: profile.shop_id
    };
    
    const { data, error } = await supabase
      .from('inventory_items')
      .insert([apiData])
      .select()
      .single();

    if (error) {
      console.error('Error creating inventory item:', error);
      throw error;
    }

    console.log('Successfully created inventory item:', data);
    return formatInventoryItem(data);
  } catch (error) {
    console.error('Error in createInventoryItem:', error);
    throw error;
  }
}

export async function updateInventoryItem(id: string, updates: Partial<InventoryItemExtended>): Promise<InventoryItemExtended> {
  try {
    console.log('Updating inventory item:', id, updates);
    
    const apiData = formatInventoryForApi(updates);
    
    const { data, error } = await supabase
      .from('inventory_items')
      .update(apiData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating inventory item:', error);
      throw error;
    }

    console.log('Successfully updated inventory item:', data);
    return formatInventoryItem(data);
  } catch (error) {
    console.error('Error in updateInventoryItem:', error);
    throw error;
  }
}

export async function updateInventoryQuantity(id: string, quantity: number): Promise<InventoryItemExtended> {
  return updateInventoryItem(id, { quantity });
}

export async function deleteInventoryItem(id: string): Promise<void> {
  try {
    console.log('Deleting inventory item:', id);
    
    const { error } = await supabase
      .from('inventory_items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting inventory item:', error);
      throw error;
    }

    console.log('Successfully deleted inventory item:', id);
  } catch (error) {
    console.error('Error in deleteInventoryItem:', error);
    throw error;
  }
}

export async function clearAllInventoryItems(): Promise<void> {
  try {
    console.log('Clearing all inventory items from database...');
    
    const { error } = await supabase
      .from('inventory_items')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records (using a condition that's always true)

    if (error) {
      console.error('Error clearing all inventory items:', error);
      throw error;
    }

    console.log('Successfully cleared all inventory items');
  } catch (error) {
    console.error('Error in clearAllInventoryItems:', error);
    throw error;
  }
}
