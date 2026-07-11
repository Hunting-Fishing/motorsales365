import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { toast } from 'sonner';

export interface PowerWashingSettingsData {
  // General
  business_name?: string;
  business_phone?: string;
  license_number?: string;
  service_types?: {
    house_washing: boolean;
    driveway_cleaning: boolean;
    deck_patio: boolean;
    roof_cleaning: boolean;
    gutter_cleaning: boolean;
  };
  
  // Service Areas
  primary_zip_codes?: string;
  service_radius?: number;
  travel_fee?: number;
  zone_based_pricing?: boolean;
  
  // Scheduling
  default_duration?: string;
  minimum_lead_time?: number;
  default_start_time?: string;
  default_end_time?: string;
  weather_based_scheduling?: boolean;
  weekend_jobs?: boolean;
  
  // Billing
  labor_rate?: number;
  tax_rate?: number;
  minimum_charge?: number;
  environmental_fee?: number;
  auto_generate_invoices?: boolean;
  water_hookup_credit?: boolean;
  
  // Chemicals
  default_bleach_ratio?: number;
  default_surfactant_ratio?: number;
  low_stock_threshold?: number;
  require_sds?: boolean;
  track_chemical_usage?: boolean;
  
  // Notifications
  appointment_reminders?: boolean;
  on_my_way_notifications?: boolean;
  job_complete_notifications?: boolean;
  new_quote_alerts?: boolean;
  weather_warnings?: boolean;
  low_chemical_alerts?: boolean;
}

interface SettingsRow {
  id: string;
  shop_id: string;
  settings: PowerWashingSettingsData;
  created_at: string;
  updated_at: string;
}

const SUPABASE_URL = 'https://oudkbrnvommbvtuispla.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91ZGticm52b21tYnZ0dWlzcGxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI5MTgzODgsImV4cCI6MjA1ODQ5NDM4OH0.Hyo-lkI96GBLt-zp5zZLvCL1bSEWTomIIrzvKRO4LF4';

const defaultSettings: PowerWashingSettingsData = {
  // General
  business_name: '',
  business_phone: '',
  license_number: '',
  service_types: {
    house_washing: true,
    driveway_cleaning: true,
    deck_patio: true,
    roof_cleaning: true,
    gutter_cleaning: false,
  },
  
  // Service Areas
  primary_zip_codes: '',
  service_radius: 25,
  travel_fee: 2.50,
  zone_based_pricing: false,
  
  // Scheduling
  default_duration: '2',
  minimum_lead_time: 24,
  default_start_time: '08:00',
  default_end_time: '17:00',
  weather_based_scheduling: true,
  weekend_jobs: true,
  
  // Billing
  labor_rate: 75,
  tax_rate: 8.25,
  minimum_charge: 150,
  environmental_fee: 25,
  auto_generate_invoices: true,
  water_hookup_credit: false,
  
  // Chemicals
  default_bleach_ratio: 3,
  default_surfactant_ratio: 2,
  low_stock_threshold: 20,
  require_sds: true,
  track_chemical_usage: true,
  
  // Notifications
  appointment_reminders: true,
  on_my_way_notifications: true,
  job_complete_notifications: true,
  new_quote_alerts: true,
  weather_warnings: true,
  low_chemical_alerts: true,
};

async function getAuthHeaders(): Promise<Record<string, string>> {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  
  return {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': token ? `Bearer ${token}` : `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };
}

export function usePowerWashingSettings() {
  const { shopId } = useShopId();
  const queryClient = useQueryClient();

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['power-washing-settings', shopId],
    queryFn: async (): Promise<PowerWashingSettingsData> => {
      if (!shopId) return defaultSettings;
      
      try {
        const headers = await getAuthHeaders();
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/power_washing_settings?shop_id=eq.${shopId}&select=*`,
          { headers }
        );
        
        if (!response.ok) {
          console.warn('Power washing settings table may not exist yet');
          return defaultSettings;
        }
        
        const rows = await response.json() as SettingsRow[];
        if (!rows || rows.length === 0) {
          return defaultSettings;
        }
        
        const storedSettings = rows[0].settings;
        return { ...defaultSettings, ...storedSettings };
      } catch (err) {
        console.warn('Error fetching power washing settings:', err);
        return defaultSettings;
      }
    },
    enabled: !!shopId,
  });

  const saveMutation = useMutation({
    mutationFn: async (newSettings: PowerWashingSettingsData) => {
      if (!shopId) throw new Error('No shop ID');
      
      const headers = await getAuthHeaders();
      
      // Check if settings exist
      const checkResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/power_washing_settings?shop_id=eq.${shopId}&select=id`,
        { headers }
      );
      
      const existingRows = await checkResponse.json() as { id: string }[];
      const exists = existingRows && existingRows.length > 0;
      
      if (exists) {
        // Update existing
        const updateResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/power_washing_settings?shop_id=eq.${shopId}`,
          {
            method: 'PATCH',
            headers: {
              ...headers,
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({ 
              settings: newSettings,
              updated_at: new Date().toISOString()
            }),
          }
        );
        
        if (!updateResponse.ok) {
          throw new Error('Failed to update settings');
        }
      } else {
        // Insert new
        const insertResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/power_washing_settings`,
          {
            method: 'POST',
            headers: {
              ...headers,
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({ 
              shop_id: shopId,
              settings: newSettings 
            }),
          }
        );
        
        if (!insertResponse.ok) {
          throw new Error('Failed to insert settings');
        }
      }
      
      return newSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-washing-settings', shopId] });
      toast.success('Settings saved successfully');
    },
    onError: (err) => {
      console.error('Error saving settings:', err);
      toast.error('Failed to save settings');
    },
  });

  return {
    settings: settings || defaultSettings,
    isLoading,
    error,
    saveSettings: saveMutation.mutate,
    isSaving: saveMutation.isPending,
  };
}
