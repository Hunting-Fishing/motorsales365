
import { supabase } from '@/lib/supabase';
import { WorkOrder } from '@/types/workOrder';
import { recordWorkOrderActivity } from './workOrderActivityService';

export class WorkOrderRepository {
  async findAll(): Promise<WorkOrder[]> {
    try {
      console.log('WorkOrderRepository: Starting to fetch all work orders...');
      console.log('WorkOrderRepository: Current user:', (await supabase.auth.getUser()).data.user?.id);
      
      // Test auth first
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error('WorkOrderRepository: Auth error:', authError);
        throw new Error(`Authentication failed: ${authError.message}`);
      }
      console.log('WorkOrderRepository: Auth successful, user ID:', authData.user?.id);
      
      // Test count query first to check RLS
      console.log('WorkOrderRepository: Testing count query...');
      const { count, error: countError } = await supabase
        .from('work_orders')
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        console.error('WorkOrderRepository: Count query failed:', countError);
        console.error('WorkOrderRepository: Count error details:', JSON.stringify(countError, null, 2));
        throw new Error(`Failed to count work orders: ${countError.message}`);
      }
      console.log('WorkOrderRepository: Count query successful, found', count, 'work orders');
      
      // First, try the simple query without joins to ensure basic functionality
      const { data: basicData, error: basicError } = await supabase
        .from('work_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (basicError) {
        console.error('WorkOrderRepository: Basic query failed:', basicError);
        console.error('WorkOrderRepository: Basic error details:', JSON.stringify(basicError, null, 2));
        throw new Error(`Failed to fetch work orders: ${basicError.message}`);
      }

      console.log('WorkOrderRepository: Basic query successful, found:', basicData?.length || 0, 'work orders');

      // Fetch equipment data separately to avoid RLS join issues
      // Get user's shop_id explicitly for the equipment query
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('id', authData.user?.id)
        .single();
      
      const equipmentIds = [...new Set(
        basicData?.filter(wo => wo.equipment_id).map(wo => wo.equipment_id) || []
      )];
      
      let equipmentMap = new Map();
      if (equipmentIds.length > 0 && profile?.shop_id) {
        console.log('WorkOrderRepository: Fetching equipment data for', equipmentIds.length, 'equipment items');
        const { data: equipment, error: equipmentError } = await supabase
          .from('equipment_assets')
          .select('id, name, asset_number')
          .eq('shop_id', profile.shop_id)
          .in('id', equipmentIds);
          
        if (equipmentError) {
          console.warn('WorkOrderRepository: Failed to fetch equipment data:', equipmentError.message);
        } else {
          console.log('WorkOrderRepository: Successfully fetched', equipment?.length || 0, 'equipment items');
          equipment?.forEach(eq => {
            equipmentMap.set(eq.id, { name: eq.name, asset_number: eq.asset_number });
          });
        }
      }

      // If basic query works, try to enhance with customer and vehicle data
      try {
        const { data: enhancedData, error: enhancedError } = await supabase
          .from('work_orders')
          .select(`
            *,
            customers!work_orders_customer_id_fkey (
              id,
              first_name,
              last_name,
              email,
              phone
            ),
            vehicles!work_orders_vehicle_id_fkey (
              id,
              make,
              model,
              year,
              vin,
              license_plate
            )
          `)
          .order('created_at', { ascending: false });

        if (!enhancedError && enhancedData) {
          console.log('WorkOrderRepository: Enhanced query successful');
          // Merge equipment data into enhanced work orders
          const workOrdersWithEquipment = enhancedData.map(wo => ({
            ...wo,
            equipment_assets: wo.equipment_id ? equipmentMap.get(wo.equipment_id) : null
          }));
          return this.transformWorkOrders(workOrdersWithEquipment);
        } else {
          console.warn('WorkOrderRepository: Enhanced query failed, using basic data:', enhancedError?.message);
        }
      } catch (enhanceError) {
        console.warn('WorkOrderRepository: Enhanced query error, using basic data:', enhanceError);
      }

      // Return basic data with equipment merged if enhanced query fails
      const workOrdersWithEquipment = basicData?.map(wo => ({
        ...wo,
        equipment_assets: wo.equipment_id ? equipmentMap.get(wo.equipment_id) : null
      })) || [];
      
      return this.transformWorkOrders(workOrdersWithEquipment);
    } catch (error) {
      console.error('WorkOrderRepository: Critical error in findAll:', error);
      throw error;
    }
  }

  async findById(id: string): Promise<WorkOrder | null> {
    try {
      console.log('WorkOrderRepository: Fetching work order by ID:', id);
      
      const { data, error } = await supabase
        .from('work_orders')
        .select(`
          *,
          customers!work_orders_customer_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone
          ),
          vehicles!work_orders_vehicle_id_fkey (
            id,
            make,
            model,
            year,
            vin,
            license_plate
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('WorkOrderRepository: Error fetching work order by ID:', error);
        throw new Error(`Failed to fetch work order: ${error.message}`);
      }

      if (!data) {
        console.log('WorkOrderRepository: No work order found with ID:', id);
        return null;
      }

      console.log('WorkOrderRepository: Successfully fetched work order:', data.id);
      return this.transformWorkOrder(data);
    } catch (error) {
      console.error('WorkOrderRepository: Error in findById:', error);
      throw error;
    }
  }

  async findByCustomerId(customerId: string): Promise<WorkOrder[]> {
    try {
      console.log('WorkOrderRepository: Fetching work orders for customer:', customerId);
      
      const { data, error } = await supabase
        .from('work_orders')
        .select(`
          *,
          customers!work_orders_customer_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone
          ),
          vehicles!work_orders_vehicle_id_fkey (
            id,
            make,
            model,
            year,
            vin,
            license_plate
          )
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('WorkOrderRepository: Error fetching work orders by customer ID:', error);
        throw new Error(`Failed to fetch work orders for customer: ${error.message}`);
      }

      console.log('WorkOrderRepository: Successfully fetched work orders for customer:', data?.length || 0);
      return this.transformWorkOrders(data || []);
    } catch (error) {
      console.error('WorkOrderRepository: Error in findByCustomerId:', error);
      throw error;
    }
  }

  async create(workOrderData: any): Promise<WorkOrder> {
    try {
      console.log('=== REPOSITORY CREATE DEBUG ===');
      console.log('1. Repository received data:', workOrderData);
      
      // Clean the data to remove any undefined values that might cause issues
      const cleanedData = Object.fromEntries(
        Object.entries(workOrderData).filter(([_, v]) => v !== undefined)
      );
      
      console.log('2. Cleaned data for insert:', cleanedData);
      
      const { data, error } = await supabase
        .from('work_orders')
        .insert([cleanedData] as any)
        .select()
        .single();

      if (error) {
        console.error('=== DATABASE INSERT ERROR ===');
        console.error('Error details:', error);
        console.error('Error code:', error.code);
        console.error('Error hint:', error.hint);
        console.error('Error details:', error.details);
        throw new Error(`Failed to create work order: ${error.message} (Code: ${error.code})`);
      }

      if (!data) {
        throw new Error('No data returned after creating work order');
      }

      console.log('3. Successfully created work order:', data.id);
      const transformed = this.transformWorkOrder(data);
      console.log('4. Transformed work order:', transformed);
      
      // Log activity for work order creation
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .or(`id.eq.${user.id},user_id.eq.${user.id}`)
            .maybeSingle();
          
          const userName = profile 
            ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'System'
            : 'System';
          
          await recordWorkOrderActivity(
            'Work order created',
            data.id,
            user.id,
            userName
          );
          console.log('5. Activity logged for work order creation');
        }
      } catch (activityError) {
        console.warn('Failed to log work order creation activity:', activityError);
      }
      
      return transformed;
    } catch (error) {
      console.error('=== REPOSITORY CREATE ERROR ===');
      console.error('Error in create method:', error);
      throw error;
    }
  }

  async update(id: string, updateData: any): Promise<WorkOrder> {
    try {
      console.log('WorkOrderRepository: Updating work order:', id, 'with data:', updateData);
      
      // Get the old work order data to detect changes
      const { data: oldData } = await supabase
        .from('work_orders')
        .select('technician_id')
        .eq('id', id)
        .single();
      
      const { data, error } = await supabase
        .from('work_orders')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('WorkOrderRepository: Error updating work order:', error);
        throw new Error(`Failed to update work order: ${error.message}`);
      }

      if (!data) {
        throw new Error(`Work order with ID ${id} not found`);
      }

      console.log('WorkOrderRepository: Successfully updated work order:', data.id);
      
      // Log activity for technician assignment
      if (updateData.technician_id && oldData?.technician_id !== updateData.technician_id) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('first_name, last_name')
              .or(`id.eq.${user.id},user_id.eq.${user.id}`)
              .maybeSingle();
            
            const userName = profile 
              ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'System'
              : 'System';
            
            // Get technician name
            const { data: techProfile } = await supabase
              .from('profiles')
              .select('first_name, last_name')
              .eq('id', updateData.technician_id)
              .single();
            
            const techName = techProfile 
              ? `${techProfile.first_name || ''} ${techProfile.last_name || ''}`.trim()
              : 'Technician';
            
            await recordWorkOrderActivity(
              `Assigned to ${techName}`,
              id,
              user.id,
              userName
            );
            console.log('Activity logged for technician assignment');
          }
        } catch (activityError) {
          console.warn('Failed to log technician assignment activity:', activityError);
        }
      }
      
      return this.transformWorkOrder(data);
    } catch (error) {
      console.error('WorkOrderRepository: Error in update:', error);
      throw error;
    }
  }

  async updateStatus(id: string, status: string, userId?: string, userName?: string): Promise<WorkOrder> {
    try {
      console.log('🔄 REPOSITORY DEBUG: updateStatus called');
      console.log('🔄 REPOSITORY DEBUG: ID:', id);
      console.log('🔄 REPOSITORY DEBUG: Status:', status);
      console.log('🔄 REPOSITORY DEBUG: UserID:', userId);
      console.log('🔄 REPOSITORY DEBUG: UserName:', userName);
      
      // Get the old status to log the change
      const { data: oldData } = await supabase
        .from('work_orders')
        .select('status')
        .eq('id', id)
        .single();
      
      const updateData: any = { 
        status,
        updated_at: new Date().toISOString()
      };
      
      console.log('🔄 REPOSITORY DEBUG: Update data:', updateData);

      console.log('🔄 REPOSITORY DEBUG: Making Supabase call...');
      const { data, error } = await supabase
        .from('work_orders')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      console.log('🔄 REPOSITORY DEBUG: Supabase response - data:', data);
      console.log('🔄 REPOSITORY DEBUG: Supabase response - error:', error);

      if (error) {
        console.error('🔄 REPOSITORY DEBUG: Supabase error details:', {
          message: error.message,
          code: error.code,
          hint: error.hint,
          details: error.details
        });
        throw new Error(`Failed to update work order status: ${error.message}`);
      }

      if (!data) {
        console.error('🔄 REPOSITORY DEBUG: No data returned from Supabase');
        throw new Error(`Work order with ID ${id} not found`);
      }

      console.log('🔄 REPOSITORY DEBUG: Successfully updated work order status');
      
      // Log activity for status change
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .or(`id.eq.${user.id},user_id.eq.${user.id}`)
            .maybeSingle();
          
          const currentUserName = profile 
            ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'System'
            : 'System';
          
          const oldStatus = oldData?.status || 'unknown';
          const action = `Status changed from ${oldStatus} to ${status}`;
          
          await recordWorkOrderActivity(
            action,
            id,
            user.id,
            currentUserName
          );
          console.log('🔄 REPOSITORY DEBUG: Activity logged for status change');
        }
      } catch (activityError) {
        console.warn('Failed to log status change activity:', activityError);
      }
      
      const transformed = this.transformWorkOrder(data);
      console.log('🔄 REPOSITORY DEBUG: Transformed result:', transformed);
      return transformed;
    } catch (error) {
      console.error('🔄 REPOSITORY DEBUG: Error in updateStatus:', error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      console.log('WorkOrderRepository: Deleting work order:', id);
      
      const { error } = await supabase
        .from('work_orders')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('WorkOrderRepository: Error deleting work order:', error);
        throw new Error(`Failed to delete work order: ${error.message}`);
      }

      console.log('WorkOrderRepository: Successfully deleted work order:', id);
    } catch (error) {
      console.error('WorkOrderRepository: Error in delete:', error);
      throw error;
    }
  }

  private transformWorkOrders(data: any[]): WorkOrder[] {
    return data.map(item => this.transformWorkOrder(item));
  }

  private transformWorkOrder(data: any): WorkOrder {
    // Handle customer data from joined table
    const customer = data.customers;
    let customerName = 'Unknown Customer';
    
    if (customer) {
      if (customer.first_name && customer.last_name) {
        customerName = `${customer.first_name} ${customer.last_name}`.trim();
      } else if (customer.first_name) {
        customerName = customer.first_name;
      } else if (customer.last_name) {
        customerName = customer.last_name;
      }
    }

    // Handle vehicle data from joined table
    const vehicle = data.vehicles;

    // Handle equipment data from joined table
    const equipment = data.equipment_assets;

    return {
      ...data,
      // Ensure customer name is available in multiple formats for compatibility
      customer_name: customerName,
      customer_first_name: customer?.first_name || null,
      customer_last_name: customer?.last_name || null,
      customer_email: customer?.email || null,
      customer_phone: customer?.phone || null,
      
      // Ensure vehicle data is available
      vehicle_make: vehicle?.make || null,
      vehicle_model: vehicle?.model || null,
      vehicle_year: vehicle?.year?.toString() || null,
      vehicle_vin: vehicle?.vin || null,
      vehicle_license_plate: vehicle?.license_plate || null,
      
      // Ensure equipment data is available
      equipment_name: equipment?.name || null,
      asset_number: equipment?.asset_number || null,
      
      // Ensure status is always available
      status: data.status || 'pending',
      
      // Convert dates to proper format
      created_at: data.created_at,
      updated_at: data.updated_at,
      
      // Clean up the nested objects to avoid confusion
      customers: undefined,
      vehicles: undefined,
      equipment_assets: undefined
    } as WorkOrder;
  }
}
