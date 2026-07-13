import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export interface ActivityType {
  id: string;
  name: string;
  code: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
  shop_id: string | null;
}

export function useActivityTypes() {
  const { toast } = useToast();
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivityTypes();
  }, []);

  const fetchActivityTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_types')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setActivityTypes(data || []);
    } catch (error: any) {
      console.error('Error fetching activity types:', error);
      toast({
        title: 'Error',
        description: 'Failed to load activity types',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    activityTypes,
    loading,
    refetch: fetchActivityTypes
  };
}
