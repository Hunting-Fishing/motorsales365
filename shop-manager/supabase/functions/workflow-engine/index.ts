import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WorkflowExecutionRequest {
  trigger_id: string;
  context_data?: any;
  event_type?: string;
  resource_id?: string;
}

interface WorkflowAction {
  id: string;
  trigger_id: string;
  action_type: string;
  action_config: any;
  action_order: number;
  delay_minutes: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { trigger_id, context_data = {}, event_type, resource_id }: WorkflowExecutionRequest = await req.json();
    
    console.log(`Starting workflow execution for trigger: ${trigger_id}`);
    
    // Get the workflow trigger
    const { data: trigger, error: triggerError } = await supabase
      .from('workflow_triggers')
      .select('*')
      .eq('id', trigger_id)
      .eq('is_active', true)
      .single();
    
    if (triggerError || !trigger) {
      console.error('Trigger not found or inactive:', triggerError);
      return new Response(
        JSON.stringify({ error: 'Trigger not found or inactive' }), 
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Create execution record
    const { data: execution, error: executionError } = await supabase
      .from('workflow_executions')
      .insert({
        trigger_id,
        execution_status: 'pending',
        execution_log: { ...context_data, event_type, resource_id },
        triggered_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (executionError) {
      console.error('Failed to create execution record:', executionError);
      return new Response(
        JSON.stringify({ error: 'Failed to create execution record' }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log(`Created execution record: ${execution.id}`);
    
    // Get workflow actions for this trigger
    const { data: actions, error: actionsError } = await supabase
      .from('workflow_actions')
      .select('*')
      .eq('trigger_id', trigger_id)
      .order('action_order', { ascending: true });
    
    if (actionsError) {
      console.error('Failed to fetch actions:', actionsError);
      await supabase
        .from('workflow_executions')
        .update({ execution_status: 'failed', error_message: 'Failed to fetch actions' })
        .eq('id', execution.id);
      
      return new Response(
        JSON.stringify({ error: 'Failed to fetch actions' }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (!actions || actions.length === 0) {
      console.log('No actions found for trigger');
      await supabase
        .from('workflow_executions')
        .update({ execution_status: 'completed' })
        .eq('id', execution.id);
      
      return new Response(
        JSON.stringify({ success: true, message: 'No actions to execute' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log(`Executing ${actions.length} actions`);
    
    // Execute actions in sequence
    let executedActions = 0;
    let failedActions = 0;
    
    for (const action of actions) {
      try {
        console.log(`Executing action ${action.id}: ${action.action_type}`);
        
        // Apply delay if specified
        if (action.delay_minutes > 0) {
          console.log(`Delaying action by ${action.delay_minutes} minutes`);
          // In production, this would be handled by a job queue
          // For now, we'll just log it
        }
        
        switch (action.action_type) {
          case 'send_email':
            await executeEmailAction(supabase, action, context_data, resendApiKey);
            break;
            
          case 'create_task':
            await executeTaskAction(supabase, action, context_data);
            break;
            
          case 'update_work_order':
            await executeWorkOrderUpdateAction(supabase, action, context_data);
            break;
            
          case 'send_notification':
            await executeNotificationAction(supabase, action, context_data);
            break;
            
          default:
            console.warn(`Unknown action type: ${action.action_type}`);
            continue;
        }
        
        executedActions++;
        console.log(`Action ${action.id} completed successfully`);
        
      } catch (error) {
        console.error(`Action ${action.id} failed:`, error);
        failedActions++;
        
        // Log action failure in execution_log
        const currentLog = execution.execution_log || {};
        currentLog.action_errors = currentLog.action_errors || [];
        currentLog.action_errors.push({
          action_id: action.id,
          error: error.message,
          executed_at: new Date().toISOString()
        });
        
        await supabase
          .from('workflow_executions')
          .update({ execution_log: currentLog })
          .eq('id', execution.id);
      }
    }
    
    // Update execution status
    const finalStatus = failedActions === 0 ? 'completed' : 
                       executedActions === 0 ? 'failed' : 'partial';
    
    const executionLog = execution.execution_log || {};
    executionLog.executed_actions = executedActions;
    executionLog.failed_actions = failedActions;
    executionLog.execution_time_ms = Date.now() - new Date(execution.triggered_at).getTime();
    
    await supabase
      .from('workflow_executions')
      .update({
        execution_status: finalStatus,
        completed_at: new Date().toISOString(),
        execution_log: executionLog
      })
      .eq('id', execution.id);
    
    console.log(`Workflow execution completed. Status: ${finalStatus}, Executed: ${executedActions}, Failed: ${failedActions}`);
    
    return new Response(
      JSON.stringify({
        success: true,
        execution_id: execution.id,
        status: finalStatus,
        executed_actions: executedActions,
        failed_actions: failedActions
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Workflow execution error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function executeEmailAction(supabase: any, action: WorkflowAction, contextData: any, resendApiKey?: string) {
  const config = action.action_config;
  
  if (!resendApiKey) {
    throw new Error('RESEND_API_KEY not configured');
  }
  
  // Get email template if specified
  let emailContent = {
    subject: config.subject || 'Notification',
    body: config.body || 'You have a new notification.'
  };
  
  if (config.template_id) {
    const { data: template } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', config.template_id)
      .single();
    
    if (template) {
      emailContent = {
        subject: template.subject,
        body: template.content
      };
    }
  }
  
  // Replace placeholders with context data
  const subject = replacePlaceholders(emailContent.subject, contextData);
  const body = replacePlaceholders(emailContent.body, contextData);
  
  // Get recipient email
  let recipientEmail = config.recipient_email;
  
  if (config.recipient_type === 'customer' && contextData.customer_id) {
    const { data: customer } = await supabase
      .from('customers')
      .select('email')
      .eq('id', contextData.customer_id)
      .single();
    
    if (customer) {
      recipientEmail = customer.email;
    }
  }
  
  if (!recipientEmail) {
    throw new Error('No recipient email found');
  }
  
  // Send email via Resend
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: config.from_email || 'notifications@yourdomain.com',
      to: [recipientEmail],
      subject: subject,
      html: body
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Email send failed: ${error.message}`);
  }
  
  console.log(`Email sent successfully to ${recipientEmail}`);
}

async function executeTaskAction(supabase: any, action: WorkflowAction, contextData: any) {
  const config = action.action_config;
  
  const taskData = {
    title: replacePlaceholders(config.title || 'Automated Task', contextData),
    description: replacePlaceholders(config.description || '', contextData),
    assigned_to: config.assigned_to,
    due_date: config.due_date ? new Date(Date.now() + config.due_date * 24 * 60 * 60 * 1000).toISOString() : null,
    priority: config.priority || 'medium',
    work_order_id: contextData.work_order_id,
    customer_id: contextData.customer_id,
    created_at: new Date().toISOString()
  };
  
  const { error } = await supabase
    .from('reminders')
    .insert(taskData);
  
  if (error) {
    throw new Error(`Failed to create task: ${error.message}`);
  }
  
  console.log('Task created successfully');
}

async function executeWorkOrderUpdateAction(supabase: any, action: WorkflowAction, contextData: any) {
  const config = action.action_config;
  
  if (!contextData.work_order_id) {
    throw new Error('No work order ID in context');
  }
  
  const updates: any = {};
  
  if (config.status) {
    updates.status = config.status;
  }
  
  if (config.priority) {
    updates.priority = config.priority;
  }
  
  if (config.notes) {
    updates.notes = replacePlaceholders(config.notes, contextData);
  }
  
  if (Object.keys(updates).length === 0) {
    console.log('No work order updates specified');
    return;
  }
  
  updates.updated_at = new Date().toISOString();
  
  const { error } = await supabase
    .from('work_orders')
    .update(updates)
    .eq('id', contextData.work_order_id);
  
  if (error) {
    throw new Error(`Failed to update work order: ${error.message}`);
  }
  
  console.log('Work order updated successfully');
}

async function executeNotificationAction(supabase: any, action: WorkflowAction, contextData: any) {
  const config = action.action_config;
  
  const notificationData = {
    title: replacePlaceholders(config.title || 'Notification', contextData),
    message: replacePlaceholders(config.message || '', contextData),
    type: config.type || 'info',
    user_id: config.user_id || contextData.assigned_to,
    created_at: new Date().toISOString()
  };
  
  const { error } = await supabase
    .from('notifications')
    .insert(notificationData);
  
  if (error) {
    throw new Error(`Failed to create notification: ${error.message}`);
  }
  
  console.log('Notification created successfully');
}

function replacePlaceholders(text: string, contextData: any): string {
  if (!text) return text;
  
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return contextData[key] || match;
  });
}