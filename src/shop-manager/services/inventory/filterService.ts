
import { supabase } from '@/integrations/supabase/client';
import { InventoryItemExtended } from '@/types/inventory';
import { formatInventoryItem } from '@/utils/inventory/inventoryUtils';

export async function filterInventoryItems(filters: any): Promise<InventoryItemExtended[]> {
  try {
    console.log('Filtering inventory items with filters:', filters);
    
    let query = supabase
      .from('inventory_items')
      .select('*');

    // Apply filters
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    if (filters.category && filters.category.length > 0) {
      query = query.in('category', filters.category);
    }

    if (filters.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }

    if (filters.supplier) {
      query = query.eq('supplier', filters.supplier);
    }

    if (filters.location) {
      query = query.eq('location', filters.location);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error filtering inventory items:', error);
      throw error;
    }

    console.log(`Successfully filtered ${data?.length || 0} inventory items`);
    // Format each item to ensure it matches InventoryItemExtended type
    return data?.map(formatInventoryItem) || [];
  } catch (error) {
    console.error('Error in filterInventoryItems:', error);
    throw error;
  }
}

export async function getInventoryCategories(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('category')
      .not('category', 'is', null);

    if (error) throw error;

    const categories = [...new Set(data?.map(item => item.category).filter(Boolean) || [])];
    return categories.sort();
  } catch (error) {
    console.error('Error fetching inventory categories:', error);
    return [];
  }
}

export async function getInventorySuppliers(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('supplier')
      .not('supplier', 'is', null);

    if (error) throw error;

    const suppliers = [...new Set(data?.map(item => item.supplier).filter(Boolean) || [])];
    return suppliers.sort();
  } catch (error) {
    console.error('Error fetching inventory suppliers:', error);
    return [];
  }
}

export async function getInventoryLocations(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('location')
      .not('location', 'is', null);

    if (error) throw error;

    const locations = [...new Set(data?.map(item => item.location).filter(Boolean) || [])];
    return locations.sort();
  } catch (error) {
    console.error('Error fetching inventory locations:', error);
    return [];
  }
}

export async function getInventoryStatuses(): Promise<string[]> {
  return ['active', 'inactive', 'in stock', 'low stock', 'out of stock', 'discontinued'];
}
