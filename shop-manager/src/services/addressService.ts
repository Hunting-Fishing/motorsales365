import { supabase } from '@/integrations/supabase/client';

export interface CustomerAddress {
  id: string;
  user_id: string;
  address_type: string;
  full_name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAddressRequest {
  address_type: 'shipping' | 'billing' | 'both';
  full_name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country?: string;
  phone?: string;
  is_default?: boolean;
}

export const addressService = {
  async getAddresses(): Promise<CustomerAddress[]> {
    const { data, error } = await supabase
      .from('customer_addresses')
      .select('*')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getAddress(id: string): Promise<CustomerAddress | null> {
    const { data, error } = await supabase
      .from('customer_addresses')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async createAddress(address: CreateAddressRequest): Promise<CustomerAddress> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('User not authenticated');

    // If this is being set as default, unset other defaults
    if (address.is_default) {
      await supabase
        .from('customer_addresses')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .eq('address_type', address.address_type);
    }

    const { data, error } = await supabase
      .from('customer_addresses')
      .insert({
        ...address,
        user_id: user.id,
        country: address.country || 'US',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateAddress(id: string, updates: Partial<CreateAddressRequest>): Promise<CustomerAddress> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('User not authenticated');

    // If this is being set as default, unset other defaults
    if (updates.is_default && updates.address_type) {
      await supabase
        .from('customer_addresses')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .eq('address_type', updates.address_type);
    }

    const { data, error } = await supabase
      .from('customer_addresses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteAddress(id: string): Promise<void> {
    const { error } = await supabase
      .from('customer_addresses')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getDefaultAddress(type: 'shipping' | 'billing'): Promise<CustomerAddress | null> {
    const { data, error } = await supabase
      .from('customer_addresses')
      .select('*')
      .or(`address_type.eq.${type},address_type.eq.both`)
      .eq('is_default', true)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async setDefaultAddress(id: string): Promise<void> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('User not authenticated');

    // Get the address to know its type
    const address = await this.getAddress(id);
    if (!address) throw new Error('Address not found');

    // Unset other defaults of the same type
    await supabase
      .from('customer_addresses')
      .update({ is_default: false })
      .eq('user_id', user.id)
      .eq('address_type', address.address_type);

    // Set this one as default
    await supabase
      .from('customer_addresses')
      .update({ is_default: true })
      .eq('id', id);
  }
};