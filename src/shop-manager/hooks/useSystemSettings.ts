import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from './use-toast';
import type { SystemSetting } from '@/types/phase4';

export function useSystemSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SystemSetting[]>([]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('key', { ascending: true });

      if (error) throw error;
      setSettings(data || []);
    } catch (error: any) {
      console.error('Error fetching system settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load system settings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getSetting = (key: string): SystemSetting | undefined => {
    return settings.find(s => s.key === key);
  };

  const updateSetting = async (key: string, value: any, description?: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key,
          value,
          description,
          updated_by: userData.user.id
        }, {
          onConflict: 'key'
        });

      if (error) throw error;
      
      await fetchSettings();
      toast({
        title: 'Success',
        description: 'Setting updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating setting:', error);
      toast({
        title: 'Error',
        description: 'Failed to update setting',
        variant: 'destructive'
      });
    }
  };

  return {
    loading,
    settings,
    getSetting,
    updateSetting,
    refetch: fetchSettings
  };
}
