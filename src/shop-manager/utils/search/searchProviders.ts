
import { supabase } from "@/lib/supabase";
import { Customer } from "@/types/customer";
import { SearchResult } from "./types";

export const searchCustomers = async (query: string): Promise<Customer[]> => {
  if (!query || query.length < 2) return [];
  
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(10);
    
    if (error) {
      console.error('Error searching customers:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in searchCustomers:', error);
    return [];
  }
};

export const searchInventory = async (query: string): Promise<any[]> => {
  if (!query || query.length < 2) return [];
  
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .or(`name.ilike.%${query}%,sku.ilike.%${query}%,category.ilike.%${query}%`)
      .limit(10);
    
    if (error) {
      console.error('Error searching inventory:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in searchInventory:', error);
    return [];
  }
};

export const searchVehicles = async (query: string): Promise<any[]> => {
  if (!query || query.length < 2) return [];
  
  try {
    // Fix: First fetch vehicles that match the query
    const { data: vehiclesData, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('*')
      .or(`make.ilike.%${query}%,model.ilike.%${query}%,vin.ilike.%${query}%,license_plate.ilike.%${query}%`)
      .limit(10);
    
    if (vehiclesError) {
      console.error('Error searching vehicles:', vehiclesError);
      return [];
    }
    
    // Then fetch customer data separately for each vehicle
    const vehicles = await Promise.all((vehiclesData || []).map(async (vehicle) => {
      if (!vehicle.customer_id) {
        return {
          ...vehicle,
          customerName: 'Unknown Customer'
        };
      }
      
      // Get customer data
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('first_name, last_name')
        .eq('id', vehicle.customer_id)
        .single();
      
      if (customerError || !customerData) {
        return {
          ...vehicle,
          customerName: 'Unknown Customer'
        };
      }
      
      return {
        ...vehicle,
        customerName: `${customerData.first_name} ${customerData.last_name}`
      };
    }));
    
    return vehicles;
  } catch (error) {
    console.error('Error in searchVehicles:', error);
    return [];
  }
};

export const searchWorkOrders = async (query: string): Promise<any[]> => {
  if (!query || query.length < 2) return [];
  
  try {
    // Fetch work orders first
    const { data: workOrdersData, error: workOrdersError } = await supabase
      .from('work_orders')
      .select('*')
      .or(`id::text.ilike.%${query}%,description.ilike.%${query}%`)
      .limit(10);
    
    if (workOrdersError) {
      console.error('Error searching work orders:', workOrdersError);
      return [];
    }
    
    // Process each work order to add customer and vehicle info
    const workOrders = await Promise.all((workOrdersData || []).map(async (order) => {
      let customerName = 'Unknown Customer';
      let vehicleInfo = 'Unknown Vehicle';
      
      // Get customer data if we have a customer_id
      if (order.customer_id) {
        const { data: customerData } = await supabase
          .from('customers')
          .select('first_name, last_name')
          .eq('id', order.customer_id)
          .single();
          
        if (customerData) {
          customerName = `${customerData.first_name} ${customerData.last_name}`;
        }
      }
      
      // Get vehicle data if we have a vehicle_id
      if (order.vehicle_id) {
        const { data: vehicleData } = await supabase
          .from('vehicles')
          .select('year, make, model')
          .eq('id', order.vehicle_id)
          .single();
          
        if (vehicleData) {
          vehicleInfo = `${vehicleData.year} ${vehicleData.make} ${vehicleData.model}`;
        }
      }
      
      return {
        ...order,
        customerName,
        vehicleInfo
      };
    }));
    
    return workOrders;
  } catch (error) {
    console.error('Error in searchWorkOrders:', error);
    return [];
  }
};

// Add these functions that are imported in searchService.ts but were missing
export const searchInvoices = async (query: string): Promise<SearchResult[]> => {
  if (!query || query.length < 2) return [];
  
  try {
    // First fetch invoices
    const { data: invoicesData, error: invoicesError } = await supabase
      .from('invoices')
      .select('*')
      .or(`id::text.ilike.%${query}%,description.ilike.%${query}%`)
      .limit(10);
    
    if (invoicesError) {
      console.error('Error searching invoices:', invoicesError);
      return [];
    }
    
    // Map to search results format
    return (invoicesData || []).map(invoice => ({
      id: invoice.id,
      title: `Invoice #${invoice.id}`,
      subtitle: `${invoice.customer || 'Unknown'} - $${invoice.total || 0}`,
      type: 'invoice',
      url: `/invoices/${invoice.id}`,
      relevance: 1
    }));
  } catch (error) {
    console.error('Error in searchInvoices:', error);
    return [];
  }
};

export const searchEquipment = async (query: string): Promise<SearchResult[]> => {
  if (!query || query.length < 2) return [];
  
  try {
    const { data, error } = await supabase
      .from('equipment_assets')
      .select('*')
      .or(`name.ilike.%${query}%,model.ilike.%${query}%,serial_number.ilike.%${query}%`)
      .limit(10);
    
    if (error) {
      console.error('Error searching equipment:', error);
      return [];
    }
    
      return (data || []).map(equipment => ({
        id: equipment.id,
        title: equipment.name,
        subtitle: `${equipment.model || 'Unknown'} - ${equipment.equipment_type || 'Unknown'}`,
        type: 'equipment',
        url: `/equipment/${equipment.id}`,
        relevance: 1
      }));
  } catch (error) {
    console.error('Error in searchEquipment:', error);
    return [];
  }
};
