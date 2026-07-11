import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Phase {
  id: string;
  phase_name: string;
  milestone_date: string;
  notification_enabled: boolean;
  reminder_days: number[];
  project_id: string;
  status: string;
  project_budgets: {
    id: string;
    project_name: string;
    project_code: string;
    shop_id: string;
    status: string;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting milestone notification processing...');

    // Fetch all phases with milestones that haven't been completed
    const { data: phases, error: phasesError } = await supabase
      .from('project_phases')
      .select(`
        id,
        phase_name,
        milestone_date,
        notification_enabled,
        reminder_days,
        project_id,
        status,
        project_budgets!inner (
          id,
          project_name,
          project_code,
          shop_id,
          status
        )
      `)
      .eq('is_milestone', true)
      .eq('notification_enabled', true)
      .not('milestone_date', 'is', null)
      .neq('status', 'completed');

    if (phasesError) {
      console.error('Error fetching phases:', phasesError);
      throw phasesError;
    }

    console.log(`Found ${phases?.length || 0} milestone phases to process`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const notificationsCreated: string[] = [];
    const inAppNotificationsCreated: string[] = [];

    for (const phase of (phases as Phase[]) || []) {
      // Skip if project is completed or cancelled
      if (phase.project_budgets.status === 'completed' || phase.project_budgets.status === 'cancelled') {
        continue;
      }

      const milestoneDate = new Date(phase.milestone_date);
      milestoneDate.setHours(0, 0, 0, 0);
      const daysUntil = Math.floor((milestoneDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      const reminderDays = phase.reminder_days || [7, 3, 1];

      // Determine notification type
      let notificationType: string | null = null;
      if (daysUntil < 0) {
        notificationType = 'overdue';
      } else if (reminderDays.includes(daysUntil)) {
        if (daysUntil === 7) notificationType = 'approaching_7d';
        else if (daysUntil === 3) notificationType = 'approaching_3d';
        else if (daysUntil === 1) notificationType = 'approaching_1d';
      }

      if (!notificationType) continue;

      // Check if notification already exists for this phase and type
      const { data: existing } = await supabase
        .from('project_milestone_notifications')
        .select('id')
        .eq('phase_id', phase.id)
        .eq('notification_type', notificationType)
        .maybeSingle();

      if (existing) {
        console.log(`Notification already exists for phase ${phase.id} with type ${notificationType}`);
        continue;
      }

      // Create milestone notification record
      const { error: insertError } = await supabase
        .from('project_milestone_notifications')
        .insert({
          shop_id: phase.project_budgets.shop_id,
          phase_id: phase.id,
          project_id: phase.project_id,
          notification_type: notificationType,
          scheduled_for: new Date().toISOString(),
          sent: true,
          sent_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error(`Error creating notification for phase ${phase.id}:`, insertError);
        continue;
      }

      notificationsCreated.push(phase.id);

      // Create in-app notification
      const notificationTitle = notificationType === 'overdue'
        ? `Milestone Overdue: ${phase.phase_name}`
        : `Milestone Approaching: ${phase.phase_name}`;

      const notificationMessage = notificationType === 'overdue'
        ? `The milestone "${phase.phase_name}" for project ${phase.project_budgets.project_code} is overdue by ${Math.abs(daysUntil)} day(s).`
        : `The milestone "${phase.phase_name}" for project ${phase.project_budgets.project_code} is due in ${daysUntil} day(s).`;

      // Get users in this shop to notify
      const { data: shopUsers } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('shop_id', phase.project_budgets.shop_id);

      for (const user of shopUsers || []) {
        if (!user.user_id) continue;

        // Check user preferences
        const { data: prefs } = await supabase
          .from('project_notification_preferences')
          .select('in_app_notifications, notify_on_overdue, reminder_days')
          .eq('user_id', user.user_id)
          .maybeSingle();

        // Skip if user has disabled in-app notifications
        if (prefs && !prefs.in_app_notifications) continue;
        if (prefs && notificationType === 'overdue' && !prefs.notify_on_overdue) continue;

        // Create in-app notification
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: user.user_id,
            title: notificationTitle,
            message: notificationMessage,
            type: notificationType === 'overdue' ? 'warning' : 'info',
            category: 'system',
            link: `/projects?id=${phase.project_id}`,
            priority: notificationType === 'overdue' ? 'high' : 'medium',
          });

        if (notifError) {
          console.error(`Error creating in-app notification for user ${user.user_id}:`, notifError);
        } else {
          inAppNotificationsCreated.push(user.user_id);
        }
      }

      console.log(`Created notification for phase ${phase.id}: ${notificationType}`);
    }

    console.log(`Processing complete. Created ${notificationsCreated.length} milestone notifications and ${inAppNotificationsCreated.length} in-app notifications.`);

    return new Response(
      JSON.stringify({
        success: true,
        milestonesProcessed: phases?.length || 0,
        notificationsCreated: notificationsCreated.length,
        inAppNotificationsCreated: inAppNotificationsCreated.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error processing milestone notifications:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
