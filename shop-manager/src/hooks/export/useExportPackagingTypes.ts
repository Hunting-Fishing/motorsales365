import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ExportPackagingType {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

export function useExportPackagingTypes() {
  const [types, setTypes] = useState<ExportPackagingType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTypes = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .maybeSingle();

      if (!profile?.shop_id) return;

      const { data, error } = await supabase
        .from('export_packaging_types')
        .select('id, name, description, is_active')
        .eq('shop_id', profile.shop_id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setTypes((data as ExportPackagingType[]) || []);
    } catch (err) {
      console.error('Failed to fetch packaging types:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  const addType = async (name: string, description?: string): Promise<ExportPackagingType | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('No shop found');
        return null;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .maybeSingle();

      if (!profile?.shop_id) {
        toast.error('No shop found');
        return null;
      }

      const { data, error } = await supabase
        .from('export_packaging_types')
        .insert({ shop_id: profile.shop_id, name: name.trim(), description: description || null })
        .select('id, name, description, is_active')
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('This packaging type already exists');
        } else {
          throw error;
        }
        return null;
      }

      const newType = data as ExportPackagingType;
      setTypes(prev => [...prev, newType].sort((a, b) => a.name.localeCompare(b.name)));
      toast.success(`Added "${name}"`);
      return newType;
    } catch (err) {
      console.error('Failed to add packaging type:', err);
      toast.error('Failed to add packaging type');
      return null;
    }
  };

  return { types, isLoading, addType, refetch: fetchTypes };
}
