
import { supabase } from '@/integrations/supabase/client';

export interface Bay {
  id: string;
  bay_name: string;
  bay_location: string | null;
  hourly_rate: number;
  daily_rate: number | null;
  weekly_rate: number | null;
  monthly_rate: number | null;
  is_active: boolean;
  shop_id: string;
  created_at: string;
  updated_at: string;
  display_order: number;
  // Legacy fields for backward compatibility
  name?: string;  
  description?: string | null;
  bay_number?: number;
  bay_type?: string;
  features?: string[] | null;
}

export interface RateSettings {
  id?: string;
  daily_hours: number;
  daily_discount_percent: number;
  weekly_multiplier: number;
  monthly_multiplier: number;
  hourly_base_rate: number;
}

export interface RateHistory {
  id: string;
  bay_id: string;
  hourly_rate: number;
  daily_rate: number | null;
  weekly_rate: number | null;
  monthly_rate: number | null;
  changed_by?: string;
  changed_at: string;
  created_at?: string;
  user_email?: string;
}

/**
 * Create a new DIY bay
 */
export const createBay = async (bayData: Partial<Bay>, shopId: string): Promise<Bay> => {
  const { data, error } = await supabase
    .from('diy_bay_rates')
    .insert({
      shop_id: shopId,
      bay_name: bayData.bay_name || 'New Bay',
      bay_location: bayData.bay_location || null,
      hourly_rate: bayData.hourly_rate || 0,
      daily_rate: bayData.daily_rate || null,
      weekly_rate: bayData.weekly_rate || null,
      monthly_rate: bayData.monthly_rate || null,
      is_active: bayData.is_active ?? true,
      display_order: bayData.display_order || 0
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating bay:', error);
    throw new Error(`Failed to create bay: ${error.message}`);
  }

  return data as Bay;
};

/**
 * Update an existing DIY bay
 */
export const updateBay = async (bay: Bay): Promise<void> => {
  // First, get the current rates to save to history
  const { data: currentBay } = await supabase
    .from('diy_bay_rates')
    .select('hourly_rate, daily_rate, weekly_rate, monthly_rate')
    .eq('id', bay.id)
    .single();

  // Update the bay
  const { error } = await supabase
    .from('diy_bay_rates')
    .update({
      bay_name: bay.bay_name,
      bay_location: bay.bay_location,
      hourly_rate: bay.hourly_rate,
      daily_rate: bay.daily_rate,
      weekly_rate: bay.weekly_rate,
      monthly_rate: bay.monthly_rate,
      is_active: bay.is_active,
      display_order: bay.display_order,
      updated_at: new Date().toISOString()
    })
    .eq('id', bay.id);

  if (error) {
    console.error('Error updating bay:', error);
    throw new Error(`Failed to update bay: ${error.message}`);
  }

  // If rates changed, save to history
  if (currentBay && (
    currentBay.hourly_rate !== bay.hourly_rate ||
    currentBay.daily_rate !== bay.daily_rate ||
    currentBay.weekly_rate !== bay.weekly_rate ||
    currentBay.monthly_rate !== bay.monthly_rate
  )) {
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase
      .from('diy_bay_rate_history')
      .insert({
        bay_id: bay.id,
        hourly_rate: bay.hourly_rate,
        daily_rate: bay.daily_rate,
        weekly_rate: bay.weekly_rate,
        monthly_rate: bay.monthly_rate,
        changed_by: user?.id || null,
        changed_at: new Date().toISOString()
      });
  }
};

/**
 * Delete a DIY bay
 */
export const deleteBay = async (bayId: string): Promise<void> => {
  const { error } = await supabase
    .from('diy_bay_rates')
    .delete()
    .eq('id', bayId);

  if (error) {
    console.error('Error deleting bay:', error);
    throw new Error(`Failed to delete bay: ${error.message}`);
  }
};

/**
 * Fetch rate history for a bay
 */
export const fetchRateHistory = async (bayId: string): Promise<RateHistory[]> => {
  const { data, error } = await supabase
    .from('diy_bay_rate_history')
    .select(`
      id,
      bay_id,
      hourly_rate,
      daily_rate,
      weekly_rate,
      monthly_rate,
      changed_by,
      changed_at
    `)
    .eq('bay_id', bayId)
    .order('changed_at', { ascending: false });

  if (error) {
    console.error('Error fetching rate history:', error);
    throw new Error(`Failed to fetch rate history: ${error.message}`);
  }

  return (data || []) as RateHistory[];
};

/**
 * Fetch all bays for a shop
 */
export const fetchBays = async (shopId: string): Promise<Bay[]> => {
  const { data, error } = await supabase
    .from('diy_bay_rates')
    .select('*')
    .eq('shop_id', shopId)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching bays:', error);
    throw new Error(`Failed to fetch bays: ${error.message}`);
  }

  return (data || []) as Bay[];
};

/**
 * Calculate rates based on hourly rate and settings
 */
export const calculateRates = (hourlyRate: number, settings: RateSettings): { daily: number; weekly: number; monthly: number } => {
  const dailyHours = settings.daily_hours;
  const discountPercent = settings.daily_discount_percent;
  
  const baseDaily = hourlyRate * dailyHours;
  const discount = baseDaily * (discountPercent / 100);
  const daily = baseDaily - discount;
  
  const weeklyMultiplier = settings.weekly_multiplier;
  const monthlyMultiplier = settings.monthly_multiplier;
  
  const weekly = hourlyRate * weeklyMultiplier;
  const monthly = hourlyRate * monthlyMultiplier;
  
  return {
    daily,
    weekly,
    monthly
  };
};
