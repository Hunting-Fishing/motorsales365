
import { supabase } from '@/integrations/supabase/client';
import { Customer, CustomerCreate } from '@/types/customer';

export async function getAllCustomers(): Promise<Customer[]> {
  console.log('Fetching all customers...');
  
  try {
    const { data: customers, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching customers:', error);
      throw new Error(`Failed to fetch customers: ${error.message}`);
    }

    console.log('Customers fetched successfully:', customers?.length);
    return customers || [];

  } catch (error) {
    console.error('Exception in getAllCustomers:', error);
    throw error;
  }
}

export async function getCustomerById(customerId: string): Promise<Customer | null> {
  console.log('Fetching customer by ID:', customerId);
  
  try {
    const { data: customer, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (error) {
      console.error('Error fetching customer:', error);
      throw new Error(`Failed to fetch customer: ${error.message}`);
    }

    console.log('Customer fetched successfully:', customer);
    return customer;

  } catch (error) {
    console.error('Exception in getCustomerById:', error);
    throw error;
  }
}

export async function createCustomer(customerData: CustomerCreate): Promise<Customer> {
  console.log('Creating customer:', customerData);
  
  try {
    const { data: customer, error } = await supabase
      .from('customers')
      .insert(customerData)
      .select()
      .single();

    if (error) {
      console.error('Error creating customer:', error);
      throw new Error(`Failed to create customer: ${error.message}`);
    }

    console.log('Customer created successfully:', customer);
    return customer;

  } catch (error) {
    console.error('Exception in createCustomer:', error);
    throw error;
  }
}

export async function updateCustomer(customerId: string, updates: Partial<Customer>): Promise<Customer> {
  console.log('Updating customer:', customerId, updates);
  
  try {
    const { data: customer, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', customerId)
      .select()
      .single();

    if (error) {
      console.error('Error updating customer:', error);
      throw new Error(`Failed to update customer: ${error.message}`);
    }

    console.log('Customer updated successfully:', customer);
    return customer;

  } catch (error) {
    console.error('Exception in updateCustomer:', error);
    throw error;
  }
}

export async function deleteCustomer(customerId: string): Promise<boolean> {
  console.log('Deleting customer:', customerId);
  
  try {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', customerId);

    if (error) {
      console.error('Error deleting customer:', error);
      throw new Error(`Failed to delete customer: ${error.message}`);
    }

    console.log('Customer deleted successfully');
    return true;

  } catch (error) {
    console.error('Exception in deleteCustomer:', error);
    throw error;
  }
}

export async function searchCustomers(searchTerm: string): Promise<Customer[]> {
  console.log('Searching customers:', searchTerm);
  
  try {
    const { data: customers, error } = await supabase
      .from('customers')
      .select('*')
      .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error searching customers:', error);
      throw new Error(`Failed to search customers: ${error.message}`);
    }

    console.log('Customer search completed:', customers?.length);
    return customers || [];

  } catch (error) {
    console.error('Exception in searchCustomers:', error);
    throw error;
  }
}

export async function getCustomerVehicles(customerId: string) {
  console.log('Fetching vehicles for customer:', customerId);
  
  try {
    // Use the correct table name 'vehicles' instead of 'customer_vehicles'
    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching customer vehicles:', error);
      throw new Error(`Failed to fetch customer vehicles: ${error.message}`);
    }

    console.log('Customer vehicles fetched successfully:', vehicles?.length);
    return vehicles || [];

  } catch (error) {
    console.error('Exception in getCustomerVehicles:', error);
    throw error;
  }
}
