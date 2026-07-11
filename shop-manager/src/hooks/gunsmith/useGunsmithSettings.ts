import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface GunsmithSettings {
  id: string;
  shop_id: string;
  business_name: string | null;
  ffl_number: string | null;
  tax_rate: number;
  default_labor_rate: number;
  work_hours_start: string;
  work_hours_end: string;
  appointment_duration_minutes: number;
  require_deposit: boolean;
  deposit_percentage: number;
  auto_generate_invoice: boolean;
  compliance_reminder_days: number;
  created_at: string;
  updated_at: string;
}

const defaultSettings: Partial<GunsmithSettings> = {
  business_name: '',
  ffl_number: '',
  tax_rate: 0,
  default_labor_rate: 75,
  work_hours_start: '08:00',
  work_hours_end: '17:00',
  appointment_duration_minutes: 30,
  require_deposit: false,
  deposit_percentage: 50,
  auto_generate_invoice: true,
  compliance_reminder_days: 30,
};

export function useGunsmithSettings() {
  return useQuery({
    queryKey: ['gunsmith-settings'],
    queryFn: async () => {
      const { data: shop } = await supabase
        .from('shops')
        .select('id')
        .limit(1)
        .single();
      
      if (!shop) return defaultSettings as GunsmithSettings;
      
      const { data, error } = await (supabase as any)
        .from('gunsmith_settings')
        .select('*')
        .eq('shop_id', shop.id)
        .maybeSingle();
      
      if (error) throw error;
      
      // Return settings or defaults
      return (data || { ...defaultSettings, shop_id: shop.id }) as GunsmithSettings;
    },
  });
}

export function useUpdateGunsmithSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (settings: Partial<GunsmithSettings>) => {
      const { data: shop } = await supabase
        .from('shops')
        .select('id')
        .limit(1)
        .single();
      
      if (!shop) throw new Error('No shop found');
      
      // Try to update first
      const { data: existing } = await (supabase as any)
        .from('gunsmith_settings')
        .select('id')
        .eq('shop_id', shop.id)
        .maybeSingle();
      
      if (existing) {
        const { error } = await (supabase as any)
          .from('gunsmith_settings')
          .update(settings)
          .eq('shop_id', shop.id);
        
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('gunsmith_settings')
          .insert({
            ...defaultSettings,
            ...settings,
            shop_id: shop.id,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gunsmith-settings'] });
      toast.success('Settings saved successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to save settings: ${error.message}`);
    },
  });
}
