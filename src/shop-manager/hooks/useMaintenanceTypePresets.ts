import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MaintenanceTypePreset {
  id: string;
  shop_id: string | null;
  name: string;
  description: string | null;
  is_system_default: boolean;
  is_active: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export function useMaintenanceTypePresets() {
  const [presets, setPresets] = useState<MaintenanceTypePreset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchPresets = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('maintenance_type_presets')
        .select('*')
        .eq('is_active', true)
        .order('usage_count', { ascending: false });

      if (error) throw error;
      setPresets(data || []);
    } catch (error) {
      console.error('Error fetching maintenance type presets:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPresets();
  }, [fetchPresets]);

  const addPreset = async (name: string, description?: string): Promise<MaintenanceTypePreset | null> => {
    try {
      // Get current user's shop_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to add presets",
          variant: "destructive"
        });
        return null;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('id', user.id)
        .single();

      if (!profile?.shop_id) {
        toast({
          title: "Error",
          description: "Shop not found",
          variant: "destructive"
        });
        return null;
      }

      // Check if preset already exists
      const existingPreset = presets.find(
        p => p.name.toLowerCase() === name.toLowerCase()
      );

      if (existingPreset) {
        toast({
          title: "Info",
          description: `"${name}" already exists`,
        });
        return existingPreset;
      }

      const { data, error } = await supabase
        .from('maintenance_type_presets')
        .insert({
          shop_id: profile.shop_id,
          name: name.trim(),
          description: description || null,
          is_system_default: false,
          is_active: true,
          usage_count: 1
        })
        .select()
        .single();

      if (error) throw error;

      setPresets(prev => [data, ...prev]);
      toast({
        title: "Success",
        description: `Added "${name}" as a new type`,
      });

      return data;
    } catch (error: any) {
      console.error('Error adding preset:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add preset",
        variant: "destructive"
      });
      return null;
    }
  };

  const incrementUsage = async (presetId: string): Promise<void> => {
    try {
      const preset = presets.find(p => p.id === presetId);
      if (!preset) return;

      await supabase
        .from('maintenance_type_presets')
        .update({ usage_count: (preset.usage_count || 0) + 1 })
        .eq('id', presetId);

      setPresets(prev =>
        prev.map(p =>
          p.id === presetId ? { ...p, usage_count: (p.usage_count || 0) + 1 } : p
        )
      );
    } catch (error) {
      console.error('Error incrementing usage:', error);
    }
  };

  const getSuggestions = useCallback((query: string): MaintenanceTypePreset[] => {
    if (!query.trim()) {
      return presets.slice(0, 15);
    }

    const lowerQuery = query.toLowerCase().trim();
    
    return presets
      .filter(p => 
        p.name.toLowerCase().includes(lowerQuery) ||
        (p.description && p.description.toLowerCase().includes(lowerQuery))
      )
      .sort((a, b) => {
        // Prioritize exact matches
        const aExact = a.name.toLowerCase() === lowerQuery;
        const bExact = b.name.toLowerCase() === lowerQuery;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        
        // Then by starts with
        const aStarts = a.name.toLowerCase().startsWith(lowerQuery);
        const bStarts = b.name.toLowerCase().startsWith(lowerQuery);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        
        // Then by usage count
        return (b.usage_count || 0) - (a.usage_count || 0);
      })
      .slice(0, 10);
  }, [presets]);

  return {
    presets,
    isLoading,
    addPreset,
    incrementUsage,
    getSuggestions,
    refetch: fetchPresets
  };
}
