import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.36.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SequenceProcessingRequest {
  action: 'process' | 'process_enrollment' | 'health_check';
  sequenceId?: string;
  enrollmentId?: string;
  customerId?: string;
  force?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { action, sequenceId, enrollmentId, customerId, force = false }: SequenceProcessingRequest = await req.json();

    console.log(`Processing email sequences: ${action}`, { sequenceId, enrollmentId, customerId, force });

    // For health checks, just return status
    if (action === 'health_check') {
      return new Response(
        JSON.stringify({
          healthy: true,
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Check if processing is enabled (unless force = true)
    if (!force) {
      const { data: settings } = await supabase
        .from('email_system_settings')
        .select('value')
        .eq('key', 'processing_schedule')
        .maybeSingle();

      const isEnabled = settings?.value?.enabled === true;
      
      if (!isEnabled) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Email sequence processing is disabled in system settings",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }
    }

    // Process a single enrollment if requested
    if (action === 'process_enrollment' && enrollmentId) {
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('email_sequence_enrollments')
        .select('*, sequence:sequence_id(*), current_step:current_step_id(*)')
        .eq('id', enrollmentId)
        .single();
        
      if (enrollmentError || !enrollment) {
        throw new Error(`Enrollment not found: ${enrollmentError?.message}`);
      }
      
      console.log(`Processing enrollment: ${enrollment.id} for sequence: ${enrollment.sequence_id}`);
      
      // Process the enrollment (this would typically send emails, update status, etc.)
      // This is a placeholder for the actual processing logic
      
      return new Response(
        JSON.stringify({
          success: true,
          message: `Processed enrollment ${enrollmentId}`,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Process sequences
    let sequencesToProcess = [];
    
    if (sequenceId) {
      const { data } = await supabase
        .from('email_sequences')
        .select('*')
        .eq('id', sequenceId)
        .eq('is_active', true);
        
      sequencesToProcess = data || [];
    } else {
      const { data } = await supabase
        .from('email_sequences')
        .select('*')
        .eq('is_active', true);
        
      sequencesToProcess = data || [];
    }
    
    console.log(`Found ${sequencesToProcess.length} active sequences to process`);
    
    // For each sequence, process enrollments
    // This is a placeholder for the actual processing logic
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${sequencesToProcess.length} sequences`,
        sequences: sequencesToProcess.map(s => ({ id: s.id, name: s.name })),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
    
  } catch (error) {
    console.error("Error processing email sequences:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
