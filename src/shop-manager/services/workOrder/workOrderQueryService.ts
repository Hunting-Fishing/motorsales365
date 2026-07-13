
import { supabase } from '@/integrations/supabase/client';
import { WorkOrder } from '@/types/workOrder';
import { mapDatabaseWorkOrder } from '@/utils/workOrders/typeMappers';

export async function getAllWorkOrders(): Promise<WorkOrder[]> {
  try {
    console.log('🔄 Fetching all work orders from database...');
    
    const { data, error } = await supabase
      .from('work_orders')
      .select(`
        *,
        customers (
          id,
          first_name,
          last_name,
          email,
          phone
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching work orders:', error);
      throw error;
    }

    console.log(`✅ Successfully fetched ${data?.length || 0} work orders`);
    
    return data?.map(mapDatabaseWorkOrder) || [];
  } catch (error) {
    console.error('❌ Error in getAllWorkOrders:', error);
    throw error;
  }
}

export async function getWorkOrderById(id: string): Promise<WorkOrder | null> {
  try {
    console.log('🔄 Fetching work order by ID:', id);
    
    const { data, error } = await supabase
      .from('work_orders')
      .select(`
        *,
        customers (
          id,
          first_name,
          last_name,
          email,
          phone,
          address,
          city,
          state,
          postal_code
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('⚠️ Work order not found:', id);
        return null;
      }
      console.error('❌ Error fetching work order:', error);
      throw error;
    }

    console.log('✅ Successfully fetched work order:', data?.id);
    return mapDatabaseWorkOrder(data);
  } catch (error) {
    console.error('❌ Error in getWorkOrderById:', error);
    throw error;
  }
}

export async function getWorkOrdersByCustomerId(customerId: string): Promise<WorkOrder[]> {
  try {
    console.log('🔄 Fetching work orders for customer:', customerId);
    
    const { data, error } = await supabase
      .from('work_orders')
      .select(`
        *,
        customers (
          id,
          first_name,
          last_name,
          email,
          phone
        )
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching customer work orders:', error);
      throw error;
    }

    console.log(`✅ Successfully fetched ${data?.length || 0} work orders for customer`);
    return data?.map(mapDatabaseWorkOrder) || [];
  } catch (error) {
    console.error('❌ Error in getWorkOrdersByCustomerId:', error);
    throw error;
  }
}

export async function getWorkOrdersByStatus(status: string): Promise<WorkOrder[]> {
  try {
    console.log('🔄 Fetching work orders by status:', status);
    
    const { data, error } = await supabase
      .from('work_orders')
      .select(`
        *,
        customers (
          id,
          first_name,
          last_name,
          email,  
          phone
        )
      `)
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching work orders by status:', error);
      throw error;
    }

    console.log(`✅ Successfully fetched ${data?.length || 0} work orders with status: ${status}`);
    return data?.map(mapDatabaseWorkOrder) || [];
  } catch (error) {
    console.error('❌ Error in getWorkOrdersByStatus:', error);
    throw error;
  }
}

export async function getUniqueTechnicians(): Promise<string[]> {
  try {
    console.log('🔄 Fetching unique technicians...');
    
    const { data, error } = await supabase
      .from('work_orders')
      .select('technician_id')
      .not('technician_id', 'is', null);

    if (error) {
      console.error('❌ Error fetching technicians:', error);
      throw error;
    }

    const uniqueTechnicians = [...new Set(data?.map(item => item.technician_id).filter(Boolean) || [])];
    console.log(`✅ Successfully fetched ${uniqueTechnicians.length} unique technicians`);
    
    return uniqueTechnicians;
  } catch (error) {
    console.error('❌ Error in getUniqueTechnicians:', error);
    return [];
  }
}

export async function getWorkOrderTimeEntries(workOrderId: string) {
  try {
    console.log('🔄 Fetching time entries for work order:', workOrderId);
    
    const { data, error } = await supabase
      .from('work_order_time_entries')
      .select('*')
      .eq('work_order_id', workOrderId)
      .order('start_time', { ascending: false });

    if (error) {
      console.error('❌ Error fetching time entries:', error);
      throw error;
    }

    console.log(`✅ Successfully fetched ${data?.length || 0} time entries`);
    return data || [];
  } catch (error) {
    console.error('❌ Error in getWorkOrderTimeEntries:', error);
    return [];
  }
}
