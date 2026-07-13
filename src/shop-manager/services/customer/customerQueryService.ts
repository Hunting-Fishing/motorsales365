
import { supabase } from '@sm/integrations/supabase/client';
import { Customer } from '@sm/types/customer';

export async function getAllCustomers(): Promise<Customer[]> {
  console.log('🔄 getAllCustomers: Starting fetch from database...');
  
  try {
    // Check authentication first
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ Authentication error:', authError);
      throw new Error(`Authentication failed: ${authError.message}`);
    }

    if (!user) {
      console.warn('⚠️ No authenticated user found');
      return [];
    }

    console.log('🔄 User authenticated, proceeding with customer fetch...');

    // Fetch all customers with their vehicles data
    const { data, error } = await supabase
      .from('customers')
      .select(`
        *,
        vehicles!vehicles_customer_id_fkey (*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ getAllCustomers error:', error);
      throw error;
    }

    console.log('✅ getAllCustomers: Fetched', data?.length || 0, 'customers from database');
    console.log('📊 getAllCustomers: Sample data:', data?.slice(0, 2));
    
    return data || [];
  } catch (error) {
    console.error('❌ getAllCustomers: Exception caught:', error);
    throw error;
  }
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  console.log('🔍 getCustomerById: Fetching customer with id:', id);
  
  try {
    const { data, error } = await supabase
      .from('customers')
      .select(`
        *,
        vehicles!vehicles_customer_id_fkey (*)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('❌ getCustomerById error:', error);
      throw error;
    }

    console.log('✅ getCustomerById: Found customer:', data ? 'Yes' : 'No');
    return data;
  } catch (error) {
    console.error('❌ getCustomerById: Exception caught:', error);
    throw error;
  }
}
