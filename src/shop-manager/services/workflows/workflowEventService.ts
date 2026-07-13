import { workflowExecutionService } from './workflowExecutionService';

/**
 * Workflow Event Service
 * Integrates with existing services to trigger workflows on real events
 */
class WorkflowEventService {
  
  // Work Order Events
  async handleWorkOrderCreate(workOrder: any) {
    console.log('[Workflow Event] Work order created:', workOrder.id);
    return await workflowExecutionService.onWorkOrderCreated(workOrder);
  }
  
  async handleWorkOrderStatusUpdate(workOrder: any, oldStatus: string) {
    console.log('[Workflow Event] Work order status changed:', workOrder.id, oldStatus, '->', workOrder.status);
    return await workflowExecutionService.onWorkOrderStatusChanged(workOrder, oldStatus, workOrder.status);
  }
  
  async handleWorkOrderComplete(workOrder: any) {
    console.log('[Workflow Event] Work order completed:', workOrder.id);
    return await workflowExecutionService.onWorkOrderCompleted(workOrder);
  }
  
  // Customer Events  
  async handleCustomerCreate(customer: any) {
    console.log('[Workflow Event] Customer created:', customer.id);
    return await workflowExecutionService.onCustomerCreated(customer);
  }
  
  // Payment Events
  async handlePaymentReceived(payment: any) {
    console.log('[Workflow Event] Payment received:', payment.id);
    return await workflowExecutionService.onPaymentReceived(payment);
  }
  
  // Schedule Events
  async handleScheduledEvent(eventType: string, eventData: any) {
    console.log('[Workflow Event] Scheduled event:', eventType, eventData);
    
    return await workflowExecutionService.triggerWorkflowsByEvent({
      trigger_type: eventType,
      resource_id: eventData.resource_id,
      event_type: eventType,
      context_data: eventData
    });
  }
  
  // Manual Trigger
  async triggerManualWorkflow(triggerId: string, contextData: any = {}) {
    console.log('[Workflow Event] Manual trigger:', triggerId, contextData);
    return await workflowExecutionService.triggerWorkflow(triggerId, contextData);
  }
}

export const workflowEventService = new WorkflowEventService();

// Export convenience functions for integration
export const triggerWorkflowOnWorkOrderCreate = (workOrder: any) => 
  workflowEventService.handleWorkOrderCreate(workOrder);

export const triggerWorkflowOnWorkOrderStatusUpdate = (workOrder: any, oldStatus: string) =>
  workflowEventService.handleWorkOrderStatusUpdate(workOrder, oldStatus);

export const triggerWorkflowOnWorkOrderComplete = (workOrder: any) =>
  workflowEventService.handleWorkOrderComplete(workOrder);

export const triggerWorkflowOnCustomerCreate = (customer: any) =>
  workflowEventService.handleCustomerCreate(customer);

export const triggerWorkflowOnPaymentReceived = (payment: any) =>
  workflowEventService.handlePaymentReceived(payment);