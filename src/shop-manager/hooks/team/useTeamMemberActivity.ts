
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Activity {
  id: string;
  type: 'work_order' | 'customer' | 'maintenance_request' | 'part_request';
  action: string;
  description: string;
  timestamp: string;
  flagged: boolean;
  flag_reason?: string;
  related_id?: string;
}

export function useTeamMemberActivity(memberId: string) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchActivities = async () => {
      if (!memberId) return;

      setIsLoading(true);
      setError(null);

      try {
        // Fetch work order activities
        const { data: woActivities, error: woError } = await supabase
          .from('work_order_activities')
          .select('*')
          .eq('user_id', memberId)
          .order('timestamp', { ascending: false })
          .limit(50);

        if (woError) throw woError;

        // Fetch customer activities
        const { data: custActivities, error: custError } = await supabase
          .from('customer_activities')
          .select('*')
          .eq('user_id', memberId)
          .order('timestamp', { ascending: false })
          .limit(50);

        if (custError) throw custError;

        // Combine and format activities
        const allActivities: Activity[] = [
          ...(woActivities || []).map(activity => ({
            id: activity.id,
            type: 'work_order' as const,
            action: activity.action || 'Unknown action',
            description: activity.action || 'Work order activity',
            timestamp: activity.timestamp,
            flagged: activity.flagged || false,
            flag_reason: activity.flag_reason,
            related_id: activity.work_order_id
          })),
          ...(custActivities || []).map(activity => ({
            id: activity.id,
            type: 'customer' as const,
            action: activity.action || 'Unknown action',
            description: activity.action || 'Customer activity',
            timestamp: activity.timestamp,
            flagged: activity.flagged || false,
            flag_reason: activity.flag_reason,
            related_id: activity.customer_id
          }))
        ];

        // Sort by timestamp
        allActivities.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        setActivities(allActivities);
      } catch (err) {
        console.error('Error fetching activities:', err);
        setError('Failed to load activity history');
        toast.error('Failed to load activity history');
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivities();
  }, [memberId]);

  return {
    activities,
    isLoading,
    error
  };
}
