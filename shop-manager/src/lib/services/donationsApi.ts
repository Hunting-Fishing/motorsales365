import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type Donation = Database['public']['Tables']['donations']['Row'];
type CreateDonation = Database['public']['Tables']['donations']['Insert'];
type UpdateDonation = Database['public']['Tables']['donations']['Update'];

export const donationsApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('donations')
      .select('*')
      .order('donation_date', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('donations')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async create(donation: CreateDonation) {
    const { data, error } = await supabase
      .from('donations')
      .insert(donation)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: UpdateDonation) {
    const { data, error } = await supabase
      .from('donations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('donations')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async getStats() {
    const { data, error } = await supabase
      .from('donations')
      .select('amount');
    
    if (error) {
      // Return default stats if table is empty or has errors
      return {
        totalDonations: 0,
        donationCount: 0,
        averageDonation: 0
      };
    }
    
    const totalDonations = data?.reduce((sum, donation) => sum + Number(donation.amount || 0), 0) || 0;
    const donationCount = data?.length || 0;
    const averageDonation = donationCount > 0 ? totalDonations / donationCount : 0;
    
    return {
      totalDonations,
      donationCount,
      averageDonation
    };
  }
};