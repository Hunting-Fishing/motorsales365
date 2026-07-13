import { supabase } from '@/integrations/supabase/client';

export interface WorkflowTriggerEvent {
  trigger_type: string;
  resource_id?: string;
  context_data?: any;
  event_type?: string;
}

export interface WorkflowExecution {
  id: string;
  trigger_id: string;
  work_order_id?: string;
  execution_status: string;
  execution_log?: any;
  error_message?: string;
  created_at: string;
  triggered_at: string;
  completed_at?: string;
}

class WorkflowExecutionService {
  
  async triggerWorkflow(triggerId: string, contextData: any = {}) {
    try {
      console.log('Triggering workflow:', triggerId, contextData);
      
      const { data, error } = await supabase.functions.invoke('workflow-engine', {
        body: {
          trigger_id: triggerId,
          context_data: contextData
        }
      });
      
      if (error) {
        console.error('Workflow execution failed:', error);
        throw error;
      }
      
      console.log('Workflow execution result:', data);
      return { data, error: null };
      
    } catch (error) {
      console.error('Failed to trigger workflow:', error);
      return { data: null, error };
    }
  }
  
  async triggerWorkflowsByEvent(event: WorkflowTriggerEvent) {
    try {
      console.log('Triggering workflows by event:', event);
      
      // Find all active triggers matching this event
      const { data: triggers, error: triggerError } = await supabase
        .from('workflow_triggers')
        .select('*')
        .eq('trigger_type', event.trigger_type)
        .eq('is_active', true);
      
      if (triggerError) {
        console.error('Failed to fetch triggers:', triggerError);
        return { data: null, error: triggerError };
      }
      
      if (!triggers || triggers.length === 0) {
        console.log('No active triggers found for event type:', event.trigger_type);
        return { data: { triggered_count: 0 }, error: null };
      }
      
      const results = [];
      
      // Execute each matching trigger
      for (const trigger of triggers) {
        try {
          // Check if trigger conditions match
          if (this.evaluateTriggerConditions(trigger, event)) {
            const result = await this.triggerWorkflow(trigger.id, {
              ...event.context_data,
              resource_id: event.resource_id,
              event_type: event.event_type
            });
            
            results.push({
              trigger_id: trigger.id,
              trigger_name: trigger.name,
              success: !result.error,
              error: result.error?.message
            });
          }
        } catch (error) {
          console.error(`Failed to trigger workflow ${trigger.id}:`, error);
          results.push({
            trigger_id: trigger.id,
            trigger_name: trigger.name,
            success: false,
            error: error.message
          });
        }
      }
      
      return { 
        data: { 
          triggered_count: results.filter(r => r.success).length,
          results 
        }, 
        error: null 
      };
      
    } catch (error) {
      console.error('Failed to trigger workflows by event:', error);
      return { data: null, error };
    }
  }
  
  private evaluateTriggerConditions(trigger: any, event: WorkflowTriggerEvent): boolean {
    const config = trigger.trigger_config || {};
    
    // If no specific conditions, trigger on any event of this type
    if (!config.conditions) {
      return true;
    }
    
    // Check specific field conditions
    for (const condition of config.conditions) {
      const { field, operator, value } = condition;
      const contextValue = event.context_data?.[field];
      
      switch (operator) {
        case 'equals':
          if (contextValue !== value) return false;
          break;
        case 'not_equals':
          if (contextValue === value) return false;
          break;
        case 'contains':
          if (!String(contextValue).includes(value)) return false;
          break;
        case 'greater_than':
          if (Number(contextValue) <= Number(value)) return false;
          break;
        case 'less_than':
          if (Number(contextValue) >= Number(value)) return false;
          break;
        default:
          console.warn(`Unknown condition operator: ${operator}`);
      }
    }
    
    return true;
  }
  
  async getWorkflowExecutions(triggerId?: string, limit: number = 50) {
    try {
      let query = supabase
        .from('workflow_executions')
        .select(`
          *,
          workflow_triggers(name, trigger_type)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (triggerId) {
        query = query.eq('trigger_id', triggerId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Failed to fetch executions:', error);
        return { data: null, error };
      }
      
      return { data: data || [], error: null };
      
    } catch (error) {
      console.error('Failed to get workflow executions:', error);
      return { data: null, error };
    }
  }
  
  async getExecutionLogs(executionId: string) {
    try {
      const { data: execution, error } = await supabase
        .from('workflow_executions')
        .select('execution_log')
        .eq('id', executionId)
        .single();
      
      if (error) {
        console.error('Failed to fetch execution logs:', error);
        return { data: null, error };
      }
      
      // Return logs from execution_log jsonb field
      const logs = execution?.execution_log || {};
      return { data: logs, error: null };
      
    } catch (error) {
      console.error('Failed to get execution logs:', error);
      return { data: null, error };
    }
  }
  
  async retryExecution(executionId: string) {
    try {
      // Get the original execution
      const { data: execution, error: fetchError } = await supabase
        .from('workflow_executions')
        .select('*')
        .eq('id', executionId)
        .single();
      
      if (fetchError || !execution) {
        return { data: null, error: fetchError || new Error('Execution not found') };
      }
      
      // Retry the workflow
      return await this.triggerWorkflow(execution.trigger_id, execution.execution_log || {});
      
    } catch (error) {
      console.error('Failed to retry execution:', error);
      return { data: null, error };
    }
  }
  
  // Work Order Event Handlers
  async onWorkOrderCreated(workOrder: any) {
    console.log('Work order created event:', workOrder.id);
    
    return await this.triggerWorkflowsByEvent({
      trigger_type: 'work_order_created',
      resource_id: workOrder.id,
      event_type: 'work_order_created',
      context_data: {
        work_order_id: workOrder.id,
        customer_id: workOrder.customer_id,
        status: workOrder.status,
        priority: workOrder.priority,
        vehicle_id: workOrder.vehicle_id,
        technician_id: workOrder.technician_id
      }
    });
  }
  
  async onWorkOrderStatusChanged(workOrder: any, oldStatus: string, newStatus: string) {
    console.log('Work order status changed:', workOrder.id, oldStatus, '->', newStatus);
    
    return await this.triggerWorkflowsByEvent({
      trigger_type: 'work_order_status_changed',
      resource_id: workOrder.id,
      event_type: 'work_order_status_changed',
      context_data: {
        work_order_id: workOrder.id,
        customer_id: workOrder.customer_id,
        old_status: oldStatus,
        new_status: newStatus,
        status: newStatus,
        priority: workOrder.priority,
        vehicle_id: workOrder.vehicle_id,
        technician_id: workOrder.technician_id
      }
    });
  }
  
  async onWorkOrderCompleted(workOrder: any) {
    console.log('Work order completed event:', workOrder.id);
    
    return await this.triggerWorkflowsByEvent({
      trigger_type: 'work_order_completed',
      resource_id: workOrder.id,
      event_type: 'work_order_completed',
      context_data: {
        work_order_id: workOrder.id,
        customer_id: workOrder.customer_id,
        status: workOrder.status,
        completed_at: workOrder.completed_at,
        total_amount: workOrder.total_amount,
        vehicle_id: workOrder.vehicle_id,
        technician_id: workOrder.technician_id
      }
    });
  }
  
  async onCustomerCreated(customer: any) {
    console.log('Customer created event:', customer.id);
    
    return await this.triggerWorkflowsByEvent({
      trigger_type: 'customer_created',
      resource_id: customer.id,
      event_type: 'customer_created',
      context_data: {
        customer_id: customer.id,
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone
      }
    });
  }
  
  async onPaymentReceived(payment: any) {
    console.log('Payment received event:', payment.id);
    
    return await this.triggerWorkflowsByEvent({
      trigger_type: 'payment_received',
      resource_id: payment.id,
      event_type: 'payment_received',
      context_data: {
        payment_id: payment.id,
        customer_id: payment.customer_id,
        work_order_id: payment.work_order_id,
        amount: payment.amount,
        payment_method: payment.payment_method
      }
    });
  }
}

export const workflowExecutionService = new WorkflowExecutionService();