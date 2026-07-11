import { supabase } from '@/lib/supabase';
import { WorkOrderPart } from '@/types/workOrderPart';

export interface PartsSearchResult {
  parts: WorkOrderPart[];
  totalCount: number;
}

export interface PartsSearchFilters {
  searchTerm?: string;
  category?: string;
  status?: string;
  workOrderId?: string;
  supplier?: string;
  priceRange?: {
    min?: number;
    max?: number;
  };
}

export async function searchParts(
  filters: PartsSearchFilters = {},
  limit: number = 50,
  offset: number = 0
): Promise<PartsSearchResult> {
  try {
    let query = supabase
      .from('work_order_parts')
      .select(`
        *,
        work_orders(id, description, customer_id),
        customers!work_orders_customer_id_fkey(first_name, last_name)
      `, { count: 'exact' });

    // Apply filters
    if (filters.searchTerm) {
      query = query.or(
        `part_name.ilike.%${filters.searchTerm}%,part_number.ilike.%${filters.searchTerm}%`
      );
    }

    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.workOrderId) {
      query = query.eq('work_order_id', filters.workOrderId);
    }

    if (filters.supplier) {
      query = query.ilike('supplier_name', `%${filters.supplier}%`);
    }

    if (filters.priceRange?.min !== undefined) {
      query = query.gte('customer_price', filters.priceRange.min);
    }

    if (filters.priceRange?.max !== undefined) {
      query = query.lte('customer_price', filters.priceRange.max);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const formattedParts: WorkOrderPart[] = (data || []).map(part => ({
      id: part.id,
      work_order_id: part.work_order_id,
      part_number: part.part_number || '',
      name: part.part_name || '',
      description: part.notes || '',
      quantity: part.quantity || 1,
      unit_price: part.customer_price || 0,
      total_price: (part.quantity || 1) * (part.customer_price || 0),
      status: part.status || 'pending',
      created_at: part.created_at,
      updated_at: part.updated_at,
      category: part.category || 'Uncategorized',
      part_type: part.part_type || 'inventory',
      supplierName: part.supplier_name || '',
      supplierCost: part.supplier_cost || 0,
      supplierSuggestedRetail: part.supplier_suggested_retail_price || 0
    }));

    return {
      parts: formattedParts,
      totalCount: count || 0
    };
  } catch (error) {
    console.error('Error searching parts:', error);
    return { parts: [], totalCount: 0 };
  }
}

export async function getPartCategories(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('work_order_parts')
      .select('category')
      .not('category', 'is', null);

    if (error) throw error;

    const categories = [...new Set(data?.map(item => item.category).filter(Boolean))] as string[];
    return categories.sort();
  } catch (error) {
    console.error('Error fetching part categories:', error);
    return ['Brakes', 'Engine', 'Transmission', 'Electrical', 'Suspension'];
  }
}

export async function getPartSuppliers(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('work_order_parts')
      .select('supplier_name')
      .not('supplier_name', 'is', null);

    if (error) throw error;

    const suppliers = [...new Set(data?.map(item => item.supplier_name).filter(Boolean))] as string[];
    return suppliers.sort();
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return [];
  }
}