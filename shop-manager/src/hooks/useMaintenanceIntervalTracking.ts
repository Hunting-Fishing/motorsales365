import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MaintenanceInterval {
  id: string;
  equipment_id: string;
  interval_type: string;
  interval_name: string;
  interval_hours: number | null;
  last_service_hours: number | null;
  last_service_date: string | null;
  next_service_hours: number | null;
  average_daily_hours: number | null;
  predicted_next_service_date: string | null;
  parts_needed: Array<{ name: string; qty: number; unit?: string }>;
  is_active: boolean;
  shop_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateIntervalInput {
  equipment_id: string;
  interval_type: string;
  interval_name: string;
  interval_hours: number;
  last_service_hours?: number;
  last_service_date?: string;
  parts_needed?: Array<{ name: string; qty: number; unit?: string }>;
}

export interface UpdateIntervalInput {
  id: string;
  last_service_hours?: number;
  last_service_date?: string;
  interval_hours?: number;
  parts_needed?: Array<{ name: string; qty: number; unit?: string }>;
  is_active?: boolean;
}

export function useMaintenanceIntervalTracking(equipmentId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch intervals for equipment
  const { data: intervals, isLoading } = useQuery({
    queryKey: ['maintenance-intervals', equipmentId],
    queryFn: async () => {
      let query = supabase
        .from('maintenance_interval_tracking')
        .select('*')
        .eq('is_active', true)
        .order('interval_name');

      if (equipmentId) {
        query = query.eq('equipment_id', equipmentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map(item => ({
        ...item,
        parts_needed: Array.isArray(item.parts_needed) 
          ? item.parts_needed as Array<{ name: string; qty: number; unit?: string }>
          : []
      })) as MaintenanceInterval[];
    },
    enabled: true
  });

  // Create new interval
  const createInterval = useMutation({
    mutationFn: async (input: CreateIntervalInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('user_id', user.id)
        .single();

      const nextServiceHours = (input.last_service_hours || 0) + input.interval_hours;

      const { data, error } = await supabase
        .from('maintenance_interval_tracking')
        .insert({
          equipment_id: input.equipment_id,
          interval_type: input.interval_type,
          interval_name: input.interval_name,
          interval_hours: input.interval_hours,
          last_service_hours: input.last_service_hours || 0,
          last_service_date: input.last_service_date || null,
          next_service_hours: nextServiceHours,
          parts_needed: input.parts_needed || [],
          shop_id: profile?.shop_id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Maintenance Interval Created', description: 'The interval has been set up successfully.' });
      queryClient.invalidateQueries({ queryKey: ['maintenance-intervals'] });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  // Update interval (e.g., record service performed)
  const updateInterval = useMutation({
    mutationFn: async (input: UpdateIntervalInput) => {
      const updates: any = { updated_at: new Date().toISOString() };
      
      if (input.last_service_hours !== undefined) {
        updates.last_service_hours = input.last_service_hours;
        // Recalculate next service hours
        const interval = intervals?.find(i => i.id === input.id);
        if (interval?.interval_hours) {
          updates.next_service_hours = input.last_service_hours + interval.interval_hours;
        }
      }
      if (input.last_service_date !== undefined) updates.last_service_date = input.last_service_date;
      if (input.interval_hours !== undefined) updates.interval_hours = input.interval_hours;
      if (input.parts_needed !== undefined) updates.parts_needed = input.parts_needed;
      if (input.is_active !== undefined) updates.is_active = input.is_active;

      const { data, error } = await supabase
        .from('maintenance_interval_tracking')
        .update(updates)
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Interval Updated', description: 'The maintenance interval has been updated.' });
      queryClient.invalidateQueries({ queryKey: ['maintenance-intervals'] });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  // Record service performed - updates last service and recalculates countdown
  const recordService = useMutation({
    mutationFn: async ({ intervalId, serviceHours, serviceDate }: { 
      intervalId: string; 
      serviceHours: number; 
      serviceDate?: string;
    }) => {
      const interval = intervals?.find(i => i.id === intervalId);
      if (!interval) throw new Error('Interval not found');

      const nextServiceHours = serviceHours + (interval.interval_hours || 0);

      const { data, error } = await supabase
        .from('maintenance_interval_tracking')
        .update({
          last_service_hours: serviceHours,
          last_service_date: serviceDate || new Date().toISOString().split('T')[0],
          next_service_hours: nextServiceHours,
          updated_at: new Date().toISOString()
        })
        .eq('id', intervalId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Service Recorded', description: 'The maintenance countdown has been reset.' });
      queryClient.invalidateQueries({ queryKey: ['maintenance-intervals'] });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  // Calculate countdown for an interval given current hours
  const calculateCountdown = (interval: MaintenanceInterval, currentHours: number) => {
    const hoursRemaining = (interval.next_service_hours || 0) - currentHours;
    const avgDailyHours = interval.average_daily_hours || 0;
    const daysRemaining = avgDailyHours > 0 ? Math.ceil(hoursRemaining / avgDailyHours) : null;
    
    let urgency: 'green' | 'yellow' | 'red' = 'green';
    if (hoursRemaining <= 0) urgency = 'red';
    else if (hoursRemaining <= 20) urgency = 'red';
    else if (hoursRemaining <= 50) urgency = 'yellow';

    return {
      hoursRemaining: Math.max(0, hoursRemaining),
      daysRemaining,
      urgency,
      isOverdue: hoursRemaining <= 0
    };
  };

  return {
    intervals: intervals || [],
    isLoading,
    createInterval,
    updateInterval,
    recordService,
    calculateCountdown
  };
}
