import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  type: 'grant_deadline' | 'budget_threshold' | 'volunteer_assignment' | 'program_milestone';
  recipientId: string;
  programId?: string;
  grantId?: string;
  message: string;
  scheduledFor?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔔 Nonprofit automation function called');

    if (req.method === 'POST') {
      const { type, action } = await req.json();

      switch (action) {
        case 'check_grant_deadlines':
          return await checkGrantDeadlines(supabaseClient);
        
        case 'monitor_budget_thresholds':
          return await monitorBudgetThresholds(supabaseClient);
        
        case 'send_volunteer_notifications':
          return await sendVolunteerNotifications(supabaseClient);
        
        case 'generate_impact_reports':
          return await generateImpactReports(supabaseClient);
        
        default:
          return new Response(
            JSON.stringify({ error: 'Unknown action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
      }
    }

    return new Response(
      JSON.stringify({ message: 'Nonprofit automation service ready' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in nonprofit automation:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function checkGrantDeadlines(supabase: any) {
  console.log('📅 Checking grant deadlines...');
  
  try {
    // Get grants with deadlines in the next 30 days
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const { data: upcomingGrants, error } = await supabase
      .from('grants')
      .select(`
        *,
        programs (name, coordinator_id)
      `)
      .gte('deadline_date', new Date().toISOString())
      .lte('deadline_date', thirtyDaysFromNow.toISOString())
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching grants:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch grants' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const notifications = [];
    
    for (const grant of upcomingGrants || []) {
      const daysUntilDeadline = Math.ceil(
        (new Date(grant.deadline_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      
      // Create notification record
      const notificationData = {
        type: 'grant_deadline',
        title: `Grant Deadline Approaching: ${grant.title}`,
        message: `Grant "${grant.title}" deadline is in ${daysUntilDeadline} days (${new Date(grant.deadline_date).toLocaleDateString()})`,
        recipient_id: grant.programs?.coordinator_id,
        grant_id: grant.id,
        priority: daysUntilDeadline <= 7 ? 'high' : 'medium',
        scheduled_for: new Date().toISOString()
      };

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notificationData);

      if (notificationError) {
        console.error('Error creating notification:', notificationError);
      } else {
        notifications.push(notificationData);
        console.log(`✅ Created deadline notification for grant: ${grant.title}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Processed ${notifications.length} grant deadline notifications`,
        notifications 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in checkGrantDeadlines:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function monitorBudgetThresholds(supabase: any) {
  console.log('💰 Monitoring budget thresholds...');
  
  try {
    const { data: programs, error } = await supabase
      .from('programs')
      .select('*')
      .eq('status', 'active');

    if (error) throw error;

    const alerts = [];

    for (const program of programs || []) {
      const spentPercentage = (program.budget_spent / program.budget_allocated) * 100;
      
      // Alert at 75% and 90% thresholds
      if (spentPercentage >= 75 && spentPercentage < 90) {
        alerts.push({
          type: 'budget_threshold',
          program_id: program.id,
          message: `Program "${program.name}" has used ${spentPercentage.toFixed(1)}% of allocated budget`,
          severity: 'warning'
        });
      } else if (spentPercentage >= 90) {
        alerts.push({
          type: 'budget_threshold',
          program_id: program.id,
          message: `Program "${program.name}" has used ${spentPercentage.toFixed(1)}% of allocated budget - Critical!`,
          severity: 'critical'
        });
      }
    }

    console.log(`📊 Generated ${alerts.length} budget threshold alerts`);

    return new Response(
      JSON.stringify({ 
        message: `Generated ${alerts.length} budget alerts`,
        alerts 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in monitorBudgetThresholds:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function sendVolunteerNotifications(supabase: any) {
  console.log('👥 Sending volunteer notifications...');
  
  try {
    // Get volunteer assignments that need follow-up
    const { data: assignments, error } = await supabase
      .from('volunteer_assignments')
      .select(`
        *,
        volunteers (*),
        programs (*)
      `)
      .eq('status', 'active');

    if (error) throw error;

    const notifications = [];

    for (const assignment of assignments || []) {
      // Check if volunteer needs hour logging reminder
      const weeksSinceStart = Math.floor(
        (new Date().getTime() - new Date(assignment.start_date).getTime()) / (1000 * 60 * 60 * 24 * 7)
      );

      if (weeksSinceStart > 0 && assignment.hours_completed < assignment.hours_committed * 0.5) {
        notifications.push({
          type: 'volunteer_reminder',
          volunteer_id: assignment.volunteer_id,
          message: `Don't forget to log your volunteer hours for "${assignment.programs.name}"`,
          assignment_id: assignment.id
        });
      }
    }

    console.log(`📬 Generated ${notifications.length} volunteer notifications`);

    return new Response(
      JSON.stringify({ 
        message: `Generated ${notifications.length} volunteer notifications`,
        notifications 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sendVolunteerNotifications:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function generateImpactReports(supabase: any) {
  console.log('📈 Generating impact reports...');
  
  try {
    const { data: programs, error } = await supabase
      .from('programs')
      .select(`
        *,
        impact_measurement_data (*)
      `)
      .eq('status', 'active');

    if (error) throw error;

    const reports = [];

    for (const program of programs || []) {
      const impactData = program.impact_measurement_data || [];
      const totalImpact = impactData.reduce((sum: number, measurement: any) => 
        sum + measurement.measured_value, 0
      );

      reports.push({
        program_id: program.id,
        program_name: program.name,
        participants_served: program.current_participants,
        budget_utilization: ((program.budget_spent / program.budget_allocated) * 100).toFixed(1),
        total_impact_score: totalImpact,
        report_generated_at: new Date().toISOString()
      });
    }

    console.log(`📋 Generated ${reports.length} impact reports`);

    return new Response(
      JSON.stringify({ 
        message: `Generated impact reports for ${reports.length} programs`,
        reports 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generateImpactReports:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}