import { supabase } from "@/integrations/supabase/client";
import { CustomerProfile, CustomerAddress, CustomerPaymentMethod } from "@/types/phase3";

export const getCustomerProfile = async (userId: string): Promise<CustomerProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('customer_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  } catch (error) {
    console.error('Error fetching customer profile:', error);
    return null;
  }
};

export const createOrUpdateCustomerProfile = async (
  profile: Partial<CustomerProfile>
): Promise<CustomerProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('customer_profiles')
      .upsert(profile)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error upserting customer profile:', error);
    return null;
  }
};

export const getCustomerAddresses = async (userId: string): Promise<CustomerAddress[]> => {
  try {
    const { data, error } = await supabase
      .from('customer_addresses')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false });

    if (error) throw error;
    return (data || []) as CustomerAddress[];
  } catch (error) {
    console.error('Error fetching customer addresses:', error);
    return [];
  }
};

export const createCustomerAddress = async (
  address: Omit<CustomerAddress, 'id' | 'created_at' | 'updated_at'>
): Promise<CustomerAddress | null> => {
  try {
    // If this is being set as default, unset others
    if (address.is_default) {
      await supabase
        .from('customer_addresses')
        .update({ is_default: false })
        .eq('user_id', address.user_id);
    }

    const { data, error } = await supabase
      .from('customer_addresses')
      .insert(address)
      .select()
      .single();

    if (error) throw error;
    return data as CustomerAddress;
  } catch (error) {
    console.error('Error creating customer address:', error);
    return null;
  }
};

export const updateCustomerAddress = async (
  id: string,
  updates: Partial<CustomerAddress>
): Promise<CustomerAddress | null> => {
  try {
    // If this is being set as default, unset others
    if (updates.is_default && updates.user_id) {
      await supabase
        .from('customer_addresses')
        .update({ is_default: false })
        .eq('user_id', updates.user_id);
    }

    const { data, error } = await supabase
      .from('customer_addresses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as CustomerAddress;
  } catch (error) {
    console.error('Error updating customer address:', error);
    return null;
  }
};

export const deleteCustomerAddress = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('customer_addresses')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting customer address:', error);
    return false;
  }
};

export const getCustomerPaymentMethods = async (userId: string): Promise<CustomerPaymentMethod[]> => {
  try {
    const { data, error } = await supabase
      .from('customer_payment_methods')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false });

    if (error) throw error;
    return (data || []) as CustomerPaymentMethod[];
  } catch (error) {
    console.error('Error fetching customer payment methods:', error);
    return [];
  }
};

export const createCustomerPaymentMethod = async (
  paymentMethod: Omit<CustomerPaymentMethod, 'id' | 'created_at' | 'updated_at'>
): Promise<CustomerPaymentMethod | null> => {
  try {
    // If this is being set as default, unset others
    if (paymentMethod.is_default) {
      await supabase
        .from('customer_payment_methods')
        .update({ is_default: false })
        .eq('user_id', paymentMethod.user_id);
    }

    const { data, error } = await supabase
      .from('customer_payment_methods')
      .insert(paymentMethod)
      .select()
      .single();

    if (error) throw error;
    return data as CustomerPaymentMethod;
  } catch (error) {
    console.error('Error creating customer payment method:', error);
    return null;
  }
};

export const deleteCustomerPaymentMethod = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('customer_payment_methods')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting customer payment method:', error);
    return false;
  }
};