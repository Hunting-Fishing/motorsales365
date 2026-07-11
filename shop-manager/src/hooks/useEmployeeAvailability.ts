import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useShopId } from './useShopId';
import { useToast } from './use-toast';
import type { EmployeeAvailability } from '@/types/employee-availability';

export function useEmployeeAvailability(employeeId?: string) {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [availability, setAvailability] = useState<EmployeeAvailability[]>([]);

  useEffect(() => {
    if (shopId) {
      fetchAvailability();
    }
  }, [shopId, employeeId]);

  const fetchAvailability = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('employee_availability')
        .select('*')
        .eq('shop_id', shopId)
        .order('day_of_week');

      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAvailability(data || []);
    } catch (error: any) {
      console.error('Error fetching availability:', error);
      toast({
        title: 'Error',
        description: 'Failed to load availability',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const createAvailability = async (data: Partial<EmployeeAvailability>) => {
    try {
      const { data: result, error } = await supabase
        .from('employee_availability')
        .insert([{ 
          ...data,
          employee_id: data.employee_id || '',
          day_of_week: data.day_of_week ?? 0,
          available_start: data.available_start || '09:00',
          available_end: data.available_end || '17:00',
          shop_id: shopId 
        }])
        .select()
        .single();

      if (error) throw error;
      await fetchAvailability();
      toast({
        title: 'Success',
        description: 'Availability added successfully'
      });
      return result;
    } catch (error: any) {
      console.error('Error creating availability:', error);
      toast({
        title: 'Error',
        description: 'Failed to add availability',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const updateAvailability = async (id: string, updates: Partial<EmployeeAvailability>) => {
    try {
      const { error } = await supabase
        .from('employee_availability')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      await fetchAvailability();
      toast({
        title: 'Success',
        description: 'Availability updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating availability:', error);
      toast({
        title: 'Error',
        description: 'Failed to update availability',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const deleteAvailability = async (id: string) => {
    try {
      const { error } = await supabase
        .from('employee_availability')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchAvailability();
      toast({
        title: 'Success',
        description: 'Availability deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting availability:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete availability',
        variant: 'destructive'
      });
      throw error;
    }
  };

  return {
    loading,
    availability,
    createAvailability,
    updateAvailability,
    deleteAvailability,
    refetch: fetchAvailability
  };
}
