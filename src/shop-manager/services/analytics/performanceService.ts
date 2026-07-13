import { supabase } from '@/integrations/supabase/client';

export interface PerformanceMetric {
  label: string;
  value: number;
  target: number;
}

export async function getPerformanceMetrics(): Promise<PerformanceMetric[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: profile } = await supabase
      .from('profiles')
      .select('shop_id')
      .or(`id.eq.${user.id},user_id.eq.${user.id}`)
      .maybeSingle();

    if (!profile?.shop_id) {
      return getDefaultMetrics();
    }

    // Get all work orders for the shop
    const { data: workOrders, error } = await supabase
      .from('work_orders')
      .select('status, created_at, start_time, end_time')
      .eq('shop_id', profile.shop_id);

    if (error || !workOrders || workOrders.length === 0) {
      return getDefaultMetrics();
    }

    const totalOrders = workOrders.length;
    const completedOrders = workOrders.filter(wo => wo.status === 'completed');
    
    // Calculate completion rate as customer satisfaction proxy
    const completionRate = Math.round((completedOrders.length / totalOrders) * 100);

    // Calculate on-time completion (within 7 days from start)
    const onTimeOrders = completedOrders.filter(wo => {
      if (!wo.end_time || !wo.created_at) return false;
      const daysDiff = (new Date(wo.end_time).getTime() - new Date(wo.created_at).getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 7;
    });
    const onTimeRate = completedOrders.length > 0 
      ? Math.round((onTimeOrders.length / completedOrders.length) * 100) 
      : 0;

    // First-time fix rate (proxy: completed orders ratio)
    const firstTimeFixRate = totalOrders > 0
      ? Math.round((completedOrders.length / totalOrders) * 100)
      : 0;

    // Equipment utilization - based on in-progress orders
    const activeOrders = workOrders.filter(wo => 
      wo.status === 'in_progress' || wo.status === 'scheduled' || wo.status === 'pending'
    );
    const equipmentUtilization = totalOrders > 0
      ? Math.round((activeOrders.length / Math.max(totalOrders * 0.3, 1)) * 100)
      : 0;

    return [
      { label: 'Customer Satisfaction', value: Math.min(completionRate, 100), target: 90 },
      { label: 'On-Time Completion', value: onTimeRate, target: 85 },
      { label: 'First-Time Fix Rate', value: firstTimeFixRate, target: 95 },
      { label: 'Equipment Utilization', value: Math.min(equipmentUtilization, 100), target: 80 },
    ];
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    return getDefaultMetrics();
  }
}

function getDefaultMetrics(): PerformanceMetric[] {
  return [
    { label: 'Customer Satisfaction', value: 0, target: 90 },
    { label: 'On-Time Completion', value: 0, target: 85 },
    { label: 'First-Time Fix Rate', value: 0, target: 95 },
    { label: 'Equipment Utilization', value: 0, target: 80 },
  ];
}
