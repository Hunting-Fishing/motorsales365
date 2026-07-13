import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useShopId } from './useShopId';
import { useToast } from './use-toast';
import type { ShiftTemplate } from '@/types/shift-template';

export function useShiftTemplates() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);

  useEffect(() => {
    if (shopId) {
      fetchTemplates();
    }
  }, [shopId]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('shift_templates')
        .select('*')
        .eq('shop_id', shopId)
        .eq('is_active', true)
        .order('template_name');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error('Error fetching shift templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load shift templates',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async (template: Partial<ShiftTemplate>) => {
    try {
      const { data, error } = await supabase
        .from('shift_templates')
        .insert([{ ...template, shop_id: shopId } as any])
        .select()
        .single();

      if (error) throw error;
      await fetchTemplates();
      toast({
        title: 'Success',
        description: 'Shift template created successfully'
      });
      return data;
    } catch (error: any) {
      console.error('Error creating shift template:', error);
      toast({
        title: 'Error',
        description: 'Failed to create shift template',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const updateTemplate = async (id: string, updates: Partial<ShiftTemplate>) => {
    try {
      const { error } = await supabase
        .from('shift_templates')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      await fetchTemplates();
      toast({
        title: 'Success',
        description: 'Shift template updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating shift template:', error);
      toast({
        title: 'Error',
        description: 'Failed to update shift template',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('shift_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchTemplates();
      toast({
        title: 'Success',
        description: 'Shift template deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting shift template:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete shift template',
        variant: 'destructive'
      });
      throw error;
    }
  };

  return {
    loading,
    templates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    refetch: fetchTemplates
  };
}
