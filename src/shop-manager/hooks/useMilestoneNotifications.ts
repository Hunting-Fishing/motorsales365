import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MilestoneNotification {
  id: string;
  shop_id: string;
  phase_id: string;
  project_id: string;
  notification_type: 'approaching_7d' | 'approaching_3d' | 'approaching_1d' | 'overdue' | 'completed';
  scheduled_for: string;
  sent: boolean;
  sent_at: string | null;
  acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  created_at: string;
  phase?: {
    phase_name: string;
    milestone_date: string;
  };
  project?: {
    project_name: string;
    project_code: string;
  };
}

interface NotificationPreferences {
  id: string;
  shop_id: string;
  user_id: string;
  email_notifications: boolean;
  in_app_notifications: boolean;
  reminder_days: number[];
  notify_on_overdue: boolean;
  notify_on_completion: boolean;
}

export interface UpcomingMilestone {
  phase_id: string;
  phase_name: string;
  project_id: string;
  project_name: string;
  project_code: string;
  milestone_date: string;
  days_until: number;
  status: 'overdue' | 'today' | 'upcoming_1d' | 'upcoming_3d' | 'upcoming_7d' | 'future';
  is_milestone: boolean;
}

export function useMilestoneNotifications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch upcoming milestones
  const { data: upcomingMilestones, isLoading: milestonesLoading } = useQuery({
    queryKey: ['upcoming-milestones'],
    queryFn: async () => {
      const { data: phases, error } = await supabase
        .from('project_phases')
        .select(`
          id,
          phase_name,
          milestone_date,
          is_milestone,
          status,
          project_id,
          project_budgets!inner (
            project_name,
            project_code,
            status
          )
        `)
        .eq('is_milestone', true)
        .not('milestone_date', 'is', null)
        .neq('status', 'completed')
        .order('milestone_date', { ascending: true });

      if (error) throw error;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return (phases || [])
        .filter((p: any) => p.project_budgets?.status !== 'completed' && p.project_budgets?.status !== 'cancelled')
        .map((phase: any) => {
          const milestoneDate = new Date(phase.milestone_date);
          milestoneDate.setHours(0, 0, 0, 0);
          const daysUntil = Math.floor((milestoneDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          let status: UpcomingMilestone['status'];
          if (daysUntil < 0) status = 'overdue';
          else if (daysUntil === 0) status = 'today';
          else if (daysUntil === 1) status = 'upcoming_1d';
          else if (daysUntil <= 3) status = 'upcoming_3d';
          else if (daysUntil <= 7) status = 'upcoming_7d';
          else status = 'future';

          return {
            phase_id: phase.id,
            phase_name: phase.phase_name,
            project_id: phase.project_id,
            project_name: phase.project_budgets.project_name,
            project_code: phase.project_budgets.project_code,
            milestone_date: phase.milestone_date,
            days_until: daysUntil,
            status,
            is_milestone: phase.is_milestone,
          } as UpcomingMilestone;
        })
        .filter((m: UpcomingMilestone) => m.days_until <= 7); // Only show milestones within 7 days
    },
  });

  // Fetch notification records
  const { data: notifications, isLoading: notificationsLoading } = useQuery({
    queryKey: ['milestone-notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_milestone_notifications')
        .select('*')
        .eq('acknowledged', false)
        .order('scheduled_for', { ascending: true });

      if (error) throw error;
      return data as MilestoneNotification[];
    },
  });

  // Fetch user preferences
  const { data: preferences, isLoading: preferencesLoading } = useQuery({
    queryKey: ['milestone-notification-preferences'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('project_notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as NotificationPreferences | null;
    },
  });

  // Acknowledge a milestone notification
  const acknowledgeMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('project_milestone_notifications')
        .update({
          acknowledged: true,
          acknowledged_by: user.id,
          acknowledged_at: new Date().toISOString(),
        })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestone-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-milestones'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Save notification preferences
  const savePreferencesMutation = useMutation({
    mutationFn: async (prefs: Partial<NotificationPreferences>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile?.shop_id) throw new Error('No shop associated');

      const { error } = await supabase
        .from('project_notification_preferences')
        .upsert({
          user_id: user.id,
          shop_id: profile.shop_id,
          ...prefs,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'shop_id,user_id',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestone-notification-preferences'] });
      toast({
        title: 'Preferences saved',
        description: 'Your notification preferences have been updated.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Get counts by status
  const overdueCount = upcomingMilestones?.filter(m => m.status === 'overdue').length || 0;
  const approachingCount = upcomingMilestones?.filter(m => m.status !== 'overdue' && m.status !== 'future').length || 0;

  return {
    upcomingMilestones: upcomingMilestones || [],
    notifications: notifications || [],
    preferences,
    isLoading: milestonesLoading || notificationsLoading || preferencesLoading,
    overdueCount,
    approachingCount,
    acknowledge: acknowledgeMutation.mutate,
    savePreferences: savePreferencesMutation.mutate,
    isSavingPreferences: savePreferencesMutation.isPending,
  };
}
