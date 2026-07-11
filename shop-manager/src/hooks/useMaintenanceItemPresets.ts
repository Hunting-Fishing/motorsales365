import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MaintenanceItemPreset {
  id: string;
  name: string;
  category: string;
  description: string | null;
  is_system_default: boolean;
  usage_count: number;
}

export function useMaintenanceItemPresets() {
  const [presets, setPresets] = useState<MaintenanceItemPreset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchPresets = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('maintenance_item_presets')
        .select('id, name, category, description, is_system_default, usage_count')
        .eq('is_active', true)
        .order('usage_count', { ascending: false });

      if (error) throw error;
      setPresets(data || []);
    } catch (err) {
      console.error('Error fetching maintenance item presets:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPresets();
  }, [fetchPresets]);

  const addPreset = useCallback(async (name: string, category: string = 'custom') => {
    try {
      // Get user's shop_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .maybeSingle();

      if (!profile?.shop_id) throw new Error('No shop found');

      // Check for duplicates
      const existingPreset = presets.find(
        p => p.name.toLowerCase() === name.toLowerCase()
      );

      if (existingPreset) {
        toast({
          title: "Already exists",
          description: `"${name}" is already in the list`,
          variant: "default"
        });
        return existingPreset;
      }

      const { data, error } = await supabase
        .from('maintenance_item_presets')
        .insert({
          name,
          category,
          shop_id: profile.shop_id,
          is_system_default: false
        })
        .select()
        .single();

      if (error) throw error;

      setPresets(prev => [data, ...prev]);
      toast({
        title: "Added",
        description: `"${name}" added to presets`
      });

      return data;
    } catch (err) {
      console.error('Error adding preset:', err);
      toast({
        title: "Error",
        description: "Failed to add preset",
        variant: "destructive"
      });
      return null;
    }
  }, [presets, toast]);

  const incrementUsage = useCallback(async (presetId: string) => {
    try {
      await supabase
        .from('maintenance_item_presets')
        .update({ usage_count: presets.find(p => p.id === presetId)?.usage_count ?? 0 + 1 })
        .eq('id', presetId);
    } catch (err) {
      console.error('Error incrementing usage:', err);
    }
  }, [presets]);

  // Calculate similarity score between query and preset name
  const calculateSimilarity = useCallback((query: string, presetName: string): number => {
    const q = query.toLowerCase().trim();
    const name = presetName.toLowerCase();

    if (!q) return 0;
    if (name === q) return 100;
    if (name.startsWith(q)) return 90;
    if (name.includes(q)) return 70;

    // Check word matches
    const queryWords = q.split(/\s+/);
    const nameWords = name.split(/\s+/);
    
    let matchedWords = 0;
    for (const qWord of queryWords) {
      if (qWord.length < 2) continue;
      for (const nWord of nameWords) {
        if (nWord.includes(qWord) || qWord.includes(nWord)) {
          matchedWords++;
          break;
        }
      }
    }

    if (matchedWords > 0) {
      return Math.min(60, matchedWords * 30);
    }

    // Levenshtein-like partial matching for typos
    let matches = 0;
    for (let i = 0; i < Math.min(q.length, name.length); i++) {
      if (q[i] === name[i]) matches++;
    }
    
    return Math.round((matches / Math.max(q.length, name.length)) * 40);
  }, []);

  const getSuggestions = useCallback((query: string, limit: number = 8) => {
    if (!query.trim()) {
      // Return top used presets when no query
      return presets.slice(0, limit).map(p => ({
        ...p,
        similarity: 0
      }));
    }

    const scored = presets.map(preset => ({
      ...preset,
      similarity: calculateSimilarity(query, preset.name)
    }));

    return scored
      .filter(p => p.similarity > 10)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }, [presets, calculateSimilarity]);

  return {
    presets,
    isLoading,
    addPreset,
    incrementUsage,
    getSuggestions,
    refetch: fetchPresets
  };
}
