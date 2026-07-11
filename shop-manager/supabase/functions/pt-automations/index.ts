import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, shopId, clientId, triggeredBy } = await req.json();

    // Action: run_all_checks — scans for all trigger conditions and creates notifications
    if (action === 'run_all_checks') {
      if (!shopId) throw new Error('shopId required');

      const results: Record<string, number> = {};

      // 1. No check-in for 7 days
      const { data: activeClients } = await supabase.from('pt_clients')
        .select('id, first_name, last_name, shop_id')
        .eq('shop_id', shopId).eq('membership_status', 'active');

      let noCheckinCount = 0;
      for (const client of (activeClients || [])) {
        const { data: lastCI } = await supabase.from('pt_check_ins')
          .select('check_in_date').eq('client_id', client.id)
          .order('check_in_date', { ascending: false }).limit(1);
        
        const lastDate = lastCI?.[0]?.check_in_date;
        const daysSince = lastDate 
          ? Math.floor((Date.now() - new Date(lastDate).getTime()) / 86400000)
          : 999;

        if (daysSince >= 7) {
          // Check if we already sent this notification recently (within 3 days)
          const { data: existing } = await supabase.from('pt_notifications')
            .select('id').eq('client_id', client.id).eq('trigger_type', 'no_checkin_7d')
            .gte('created_at', new Date(Date.now() - 3 * 86400000).toISOString()).limit(1);

          if (!existing?.length) {
            await supabase.from('pt_notifications').insert({
              shop_id: shopId, client_id: client.id, trigger_type: 'no_checkin_7d',
              title: 'Check-In Reminder',
              message: `Hi ${client.first_name}, we haven't heard from you in ${daysSince} days! Please submit your weekly check-in so we can track your progress.`,
              channel: 'in_app',
            });
            noCheckinCount++;
          }
        }
      }
      results.no_checkin_7d = noCheckinCount;

      // 2. Package low balance (≤2 sessions remaining)
      const { data: lowPkgs } = await supabase.from('pt_client_packages')
        .select('*, pt_clients(id, first_name, last_name), pt_packages(name)')
        .eq('shop_id', shopId).eq('status', 'active')
        .lte('remaining_sessions', 2);

      let pkgLowCount = 0;
      for (const pkg of (lowPkgs || [])) {
        const { data: existing } = await supabase.from('pt_notifications')
          .select('id').eq('client_id', pkg.pt_clients?.id).eq('trigger_type', 'package_low')
          .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()).limit(1);

        if (!existing?.length && pkg.pt_clients?.id) {
          await supabase.from('pt_notifications').insert({
            shop_id: shopId, client_id: pkg.pt_clients.id, trigger_type: 'package_low',
            title: 'Package Running Low',
            message: `Hi ${pkg.pt_clients.first_name}, you have ${pkg.remaining_sessions} session(s) left on your ${pkg.pt_packages?.name || 'training'} package. Renew now to keep your momentum going!`,
            channel: 'in_app',
          });
          pkgLowCount++;
        }
      }
      results.package_low = pkgLowCount;

      // 3. Missed appointments (no_show in last 2 days, not already notified)
      const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
      const { data: missed } = await supabase.from('pt_sessions')
        .select('*, pt_clients(id, first_name, last_name)')
        .eq('shop_id', shopId).eq('status', 'no_show')
        .gte('session_date', twoDaysAgo);

      let missedCount = 0;
      for (const session of (missed || [])) {
        if (!session.pt_clients?.id) continue;
        const { data: existing } = await supabase.from('pt_notifications')
          .select('id').eq('client_id', session.pt_clients.id).eq('trigger_type', 'missed_appointment')
          .gte('created_at', twoDaysAgo).limit(1);

        if (!existing?.length) {
          await supabase.from('pt_notifications').insert({
            shop_id: shopId, client_id: session.pt_clients.id, trigger_type: 'missed_appointment',
            title: 'We Missed You!',
            message: `Hi ${session.pt_clients.first_name}, we noticed you missed your recent session. Would you like to reschedule? Consistency is key to reaching your goals!`,
            channel: 'in_app',
          });
          missedCount++;
        }
      }
      results.missed_appointment = missedCount;

      // 4. Inactive clients (no session or check-in in 14+ days)
      let inactiveCount = 0;
      for (const client of (activeClients || [])) {
        const { data: lastSession } = await supabase.from('pt_sessions')
          .select('session_date').eq('client_id', client.id).eq('status', 'completed')
          .order('session_date', { ascending: false }).limit(1);
        const { data: lastCI } = await supabase.from('pt_check_ins')
          .select('check_in_date').eq('client_id', client.id)
          .order('check_in_date', { ascending: false }).limit(1);

        const lastActivity = Math.max(
          lastSession?.[0]?.session_date ? new Date(lastSession[0].session_date).getTime() : 0,
          lastCI?.[0]?.check_in_date ? new Date(lastCI[0].check_in_date).getTime() : 0,
        );
        const daysSinceActivity = lastActivity ? Math.floor((Date.now() - lastActivity) / 86400000) : 999;

        if (daysSinceActivity >= 14) {
          const { data: existing } = await supabase.from('pt_notifications')
            .select('id').eq('client_id', client.id).eq('trigger_type', 'inactive_client')
            .gte('created_at', new Date(Date.now() - 14 * 86400000).toISOString()).limit(1);

          if (!existing?.length) {
            await supabase.from('pt_notifications').insert({
              shop_id: shopId, client_id: client.id, trigger_type: 'inactive_client',
              title: 'We Miss You!',
              message: `Hi ${client.first_name}, it's been a while since your last visit. We'd love to help you get back on track — check out our latest offers!`,
              channel: 'in_app',
            });
            inactiveCount++;
          }
        }
      }
      results.inactive_client = inactiveCount;

      return new Response(JSON.stringify({ success: true, notifications_created: results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Action: trigger_event — fires a specific automation for a specific event
    if (action === 'trigger_event') {
      const { triggerType, data: eventData } = await req.json();

      if (triggerType === 'new_client' && eventData?.clientId) {
        const { data: client } = await supabase.from('pt_clients')
          .select('id, first_name, last_name, shop_id').eq('id', eventData.clientId).single();
        if (client) {
          await supabase.from('pt_notifications').insert({
            shop_id: client.shop_id, client_id: client.id, trigger_type: 'new_client',
            title: 'Welcome! 🎉',
            message: `Welcome ${client.first_name}! We're excited to help you reach your fitness goals. Start by completing your profile and booking your first session.`,
            channel: 'in_app',
          });
        }
      }

      if (triggerType === 'workout_assigned' && eventData?.clientId) {
        const { data: client } = await supabase.from('pt_clients')
          .select('id, first_name, shop_id').eq('id', eventData.clientId).single();
        if (client) {
          await supabase.from('pt_notifications').insert({
            shop_id: client.shop_id, client_id: client.id, trigger_type: 'workout_assigned',
            title: 'New Workout Program! 💪',
            message: `Hey ${client.first_name}, your trainer just assigned you a new workout program. Check it out in your portal!`,
            channel: 'in_app',
          });
        }
      }

      if (triggerType === 'milestone' && eventData?.clientId) {
        const { data: client } = await supabase.from('pt_clients')
          .select('id, first_name, shop_id').eq('id', eventData.clientId).single();
        if (client) {
          await supabase.from('pt_notifications').insert({
            shop_id: client.shop_id, client_id: client.id, trigger_type: 'milestone',
            title: `Milestone Reached! 🏆`,
            message: eventData.message || `Congratulations ${client.first_name}! You've reached an amazing milestone. Keep pushing!`,
            channel: 'in_app',
          });
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    console.error('PT Automations error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
