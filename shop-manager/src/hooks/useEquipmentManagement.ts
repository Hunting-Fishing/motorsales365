import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Equipment } from '@/types/equipment';
import { useToast } from '@/hooks/use-toast';

export function useEquipmentManagement() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const createEquipment = useCallback(async (equipmentData: any) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('equipment_assets')
        .insert([equipmentData])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Equipment added successfully',
      });

      return data;
    } catch (error) {
      console.error('Error creating equipment:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add equipment',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const updateEquipment = useCallback(async (id: string, updates: any) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('equipment_assets')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Equipment updated successfully',
      });

      return data;
    } catch (error) {
      console.error('Error updating equipment:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update equipment',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const deleteEquipment = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('equipment_assets')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Equipment deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting equipment:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete equipment',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return {
    loading,
    createEquipment,
    updateEquipment,
    deleteEquipment,
  };
}
