import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SettingsState {
  appearance: any;
  branding: any;
  security: any;
  loading: boolean;
  shopId: string | null;
}

/**
 * Real-time settings synchronization hook
 * Provides centralized settings state with automatic updates across all tabs
 */
export function useSettingsSync() {
  const [settings, setSettings] = useState<SettingsState>({
    appearance: null,
    branding: null,
    security: null,
    loading: true,
    shopId: null
  });
  const { toast } = useToast();

  // Load initial settings
  useEffect(() => {
    loadAllSettings();
    setupRealtimeSubscriptions();
  }, []);

  const loadAllSettings = async () => {
    try {
      // Get current user's shop ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .maybeSingle();

      if (!profile?.shop_id) return;

      const shopId = profile.shop_id;
      setSettings(prev => ({ ...prev, shopId }));

      // Load all settings in parallel
      const [appearanceData, brandingData, securityData] = await Promise.all([
        supabase.from('appearance_settings').select('*').eq('shop_id', shopId).single(),
        supabase.from('branding_settings').select('*').eq('shop_id', shopId).single(),
        supabase.from('security_settings').select('*').eq('shop_id', shopId).single()
      ]);

      setSettings(prev => ({
        ...prev,
        appearance: appearanceData.data,
        branding: brandingData.data,
        security: securityData.data,
        loading: false
      }));

      // Apply appearance settings to CSS immediately
      if (appearanceData.data) {
        applyAppearanceSettings(appearanceData.data);
      }
      if (brandingData.data) {
        applyBrandingSettings(brandingData.data);
      }

    } catch (error) {
      console.error('Error loading settings:', error);
      setSettings(prev => ({ ...prev, loading: false }));
    }
  };

  const setupRealtimeSubscriptions = () => {
    // Subscribe to appearance settings changes
    const appearanceChannel = supabase
      .channel('appearance-settings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appearance_settings'
        },
        (payload) => {
          console.log('Appearance settings changed:', payload);
          if (payload.new && (payload.new as any)?.shop_id === settings.shopId) {
            setSettings(prev => ({ ...prev, appearance: payload.new }));
            applyAppearanceSettings(payload.new);
          }
        }
      )
      .subscribe();

    // Subscribe to branding settings changes  
    const brandingChannel = supabase
      .channel('branding-settings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public', 
          table: 'branding_settings'
        },
        (payload) => {
          console.log('Branding settings changed:', payload);
          if (payload.new && (payload.new as any)?.shop_id === settings.shopId) {
            setSettings(prev => ({ ...prev, branding: payload.new }));
            applyBrandingSettings(payload.new);
          }
        }
      )
      .subscribe();

    // Subscribe to security settings changes
    const securityChannel = supabase
      .channel('security-settings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'security_settings'
        },
        (payload) => {
          console.log('Security settings changed:', payload);
          if (payload.new && (payload.new as any)?.shop_id === settings.shopId) {
            setSettings(prev => ({ ...prev, security: payload.new }));
          }
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(appearanceChannel);
      supabase.removeChannel(brandingChannel);
      supabase.removeChannel(securityChannel);
    };
  };

  const applyAppearanceSettings = (appearanceSettings: any) => {
    if (!appearanceSettings) return;
    
    const root = document.documentElement;
    root.style.setProperty('--primary', appearanceSettings.primary_color);
    root.style.setProperty('--secondary', appearanceSettings.secondary_color);
    root.style.setProperty('--accent', appearanceSettings.accent_color);
    
    // Apply theme mode
    if (appearanceSettings.theme_mode === 'dark') {
      root.classList.add('dark');
    } else if (appearanceSettings.theme_mode === 'light') {
      root.classList.remove('dark');
    } else if (appearanceSettings.theme_mode === 'auto') {
      // Apply system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  };

  const applyBrandingSettings = (brandingSettings: any) => {
    if (!brandingSettings) return;
    
    const root = document.documentElement;
    if (brandingSettings.primary_color) {
      root.style.setProperty('--brand-primary', brandingSettings.primary_color);
    }
    if (brandingSettings.secondary_color) {
      root.style.setProperty('--brand-secondary', brandingSettings.secondary_color);
    }
    if (brandingSettings.accent_color) {
      root.style.setProperty('--brand-accent', brandingSettings.accent_color);
    }
  };

  const updateSettings = async (category: 'appearance' | 'branding' | 'security', updates: any) => {
    if (!settings.shopId) {
      toast({
        title: "Error",
        description: "Shop ID not found",
        variant: "destructive"
      });
      return false;
    }

    try {
      let error;
      
      if (category === 'appearance') {
        const result = await supabase
          .from('appearance_settings')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('shop_id', settings.shopId);
        error = result.error;
      } else if (category === 'branding') {
        const result = await supabase
          .from('branding_settings')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('shop_id', settings.shopId);
        error = result.error;
      } else if (category === 'security') {
        const result = await supabase
          .from('security_settings')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('shop_id', settings.shopId);
        error = result.error;
      }

      if (error) {
        throw error;
      }

      toast({
        title: "Settings updated",
        description: `${category} settings have been saved successfully`
      });

      return true;
    } catch (error) {
      console.error(`Error updating ${category} settings:`, error);
      toast({
        title: "Error",
        description: `Failed to update ${category} settings`,
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    settings,
    updateSettings,
    refreshSettings: loadAllSettings,
    isLoading: settings.loading
  };
}