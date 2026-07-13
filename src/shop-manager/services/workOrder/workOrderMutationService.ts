
import { supabase } from '@/integrations/supabase/client';
import { WorkOrderFormSchemaValues } from '@/schemas/workOrderSchema';

export async function createWorkOrder(formData: WorkOrderFormSchemaValues) {
  console.log('Creating work order with data:', formData);
  
  try {
    // Get current user's shop_id
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('shop_id')
      .or(`id.eq.${user.id},user_id.eq.${user.id}`)
      .maybeSingle();
    
    if (!profile?.shop_id) throw new Error('User shop not found');
    
    // Map form data to work_orders table structure (only include fields that exist in the table)
    const workOrderInsert = {
      customer_id: formData.customerId || null,
      vehicle_id: formData.vehicleId || null,
      technician_id: formData.technicianId || null,
      description: formData.description,
      status: formData.status,
      service_type: formData.priority, // Using priority as service_type since that exists in the table
      shop_id: profile.shop_id,
      created_by: user.id,
    };

    console.log('Prepared work order insert:', workOrderInsert);

    const { data: workOrder, error } = await supabase
      .from('work_orders')
      .insert(workOrderInsert)
      .select('*')
      .single();

    if (error) {
      console.error('Error creating work order:', error);
      throw new Error(`Failed to create work order: ${error.message}`);
    }

    console.log('Work order created successfully:', workOrder);
    return workOrder;

  } catch (error) {
    console.error('Exception in createWorkOrder:', error);
    throw error;
  }
}

export async function updateWorkOrder(workOrderId: string, workOrderData: Partial<WorkOrderFormSchemaValues>) {
  console.log('Updating work order:', workOrderId, 'with data:', workOrderData);
  
  try {
    const workOrderUpdate = {
      description: workOrderData.description,
      status: workOrderData.status,
      customer_id: workOrderData.customerId || null,
      vehicle_id: workOrderData.vehicleId || null,
      technician_id: workOrderData.technicianId || null,
      customer_name: workOrderData.customer,
      customer_email: workOrderData.customerEmail || null,
      customer_phone: workOrderData.customerPhone || null,
      customer_address: workOrderData.customerAddress || null,
      vehicle_make: workOrderData.vehicleMake || null,
      vehicle_model: workOrderData.vehicleModel || null,
      vehicle_year: workOrderData.vehicleYear || null,
      vehicle_license_plate: workOrderData.licensePlate || null,
      vehicle_vin: workOrderData.vin || null,
      notes: workOrderData.notes || null,
      due_date: workOrderData.dueDate ? new Date(workOrderData.dueDate).toISOString() : null,
      priority: workOrderData.priority,
      location: workOrderData.location || null,
      updated_at: new Date().toISOString(),
    };

    const { data: workOrder, error } = await supabase
      .from('work_orders')
      .update(workOrderUpdate)
      .eq('id', workOrderId)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating work order:', error);
      throw new Error(`Failed to update work order: ${error.message}`);
    }

    console.log('Work order updated successfully:', workOrder);
    return workOrder;

  } catch (error) {
    console.error('Exception in updateWorkOrder:', error);
    throw error;
  }
}

export async function updateWorkOrderStatus(workOrderId: string, status: string) {
  console.log('updateWorkOrderStatus called:', { workOrderId, status });
  
  try {
    // First, validate that the work order exists
    const { data: existingWorkOrder, error: fetchError } = await supabase
      .from('work_orders')
      .select('id, status')
      .eq('id', workOrderId)
      .single();

    if (fetchError) {
      console.error('Error fetching work order for status update:', fetchError);
      throw new Error(`Work order not found: ${fetchError.message}`);
    }

    console.log('Current work order status:', existingWorkOrder);

    // Update the status
    const updateData = { 
      status,
      updated_at: new Date().toISOString()
    };

    console.log('Updating with data:', updateData);

    const { data: workOrder, error } = await supabase
      .from('work_orders')
      .update(updateData)
      .eq('id', workOrderId)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating work order status:', error);
      throw new Error(`Failed to update work order status: ${error.message}`);
    }

    if (!workOrder) {
      throw new Error('No work order returned after status update');
    }

    console.log('Work order status updated successfully:', {
      workOrderId,
      oldStatus: existingWorkOrder.status,
      newStatus: workOrder.status,
      fullWorkOrder: workOrder
    });

    return workOrder;

  } catch (error) {
    console.error('Exception in updateWorkOrderStatus:', error);
    throw error;
  }
}

export async function deleteWorkOrder(workOrderId: string) {
  console.log('Deleting work order:', workOrderId);
  
  try {
    const { error } = await supabase
      .from('work_orders')
      .delete()
      .eq('id', workOrderId);

    if (error) {
      console.error('Error deleting work order:', error);
      throw new Error(`Failed to delete work order: ${error.message}`);
    }

    console.log('Work order deleted successfully');
    return true;

  } catch (error) {
    console.error('Exception in deleteWorkOrder:', error);
    throw error;
  }
}
