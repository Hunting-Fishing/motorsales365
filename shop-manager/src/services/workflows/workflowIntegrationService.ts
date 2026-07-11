import { workflowEventService } from './workflowEventService';

/**
 * Integration service that connects existing services with workflow triggers
 * This service should be imported and used in existing work order, customer, and payment services
 */

export class WorkflowIntegrationService {
  
  // Work Order Integration Methods
  static async notifyWorkOrderCreated(workOrder: any) {
    try {
      console.log('[Workflow Integration] Work Order Created:', workOrder.id);
      await workflowEventService.handleWorkOrderCreate(workOrder);
    } catch (error) {
      console.error('[Workflow Integration] Failed to trigger work order created workflow:', error);
    }
  }
  
  static async notifyWorkOrderStatusChanged(workOrder: any, oldStatus: string) {
    try {
      console.log('[Workflow Integration] Work Order Status Changed:', workOrder.id, oldStatus, '->', workOrder.status);
      await workflowEventService.handleWorkOrderStatusUpdate(workOrder, oldStatus);
    } catch (error) {
      console.error('[Workflow Integration] Failed to trigger work order status change workflow:', error);
    }
  }
  
  static async notifyWorkOrderCompleted(workOrder: any) {
    try {
      console.log('[Workflow Integration] Work Order Completed:', workOrder.id);
      await workflowEventService.handleWorkOrderComplete(workOrder);
    } catch (error) {
      console.error('[Workflow Integration] Failed to trigger work order completion workflow:', error);
    }
  }
  
  // Customer Integration Methods
  static async notifyCustomerCreated(customer: any) {
    try {
      console.log('[Workflow Integration] Customer Created:', customer.id);
      await workflowEventService.handleCustomerCreate(customer);
    } catch (error) {
      console.error('[Workflow Integration] Failed to trigger customer created workflow:', error);
    }
  }
  
  // Payment Integration Methods
  static async notifyPaymentReceived(payment: any) {
    try {
      console.log('[Workflow Integration] Payment Received:', payment.id);
      await workflowEventService.handlePaymentReceived(payment);
    } catch (error) {
      console.error('[Workflow Integration] Failed to trigger payment received workflow:', error);
    }
  }
  
  // Manual Trigger Method
  static async triggerManualWorkflow(triggerId: string, contextData: any = {}) {
    try {
      console.log('[Workflow Integration] Manual Trigger:', triggerId, contextData);
      return await workflowEventService.triggerManualWorkflow(triggerId, contextData);
    } catch (error) {
      console.error('[Workflow Integration] Failed to trigger manual workflow:', error);
      throw error;
    }
  }
}

// Export convenience functions for easy integration
export const notifyWorkOrderCreated = WorkflowIntegrationService.notifyWorkOrderCreated;
export const notifyWorkOrderStatusChanged = WorkflowIntegrationService.notifyWorkOrderStatusChanged;
export const notifyWorkOrderCompleted = WorkflowIntegrationService.notifyWorkOrderCompleted;
export const notifyCustomerCreated = WorkflowIntegrationService.notifyCustomerCreated;
export const notifyPaymentReceived = WorkflowIntegrationService.notifyPaymentReceived;
export const triggerManualWorkflow = WorkflowIntegrationService.triggerManualWorkflow;

// Usage Instructions:
/*
To integrate workflows with existing services, add these calls:

1. In Work Order Service (when creating a work order):
   import { notifyWorkOrderCreated } from '@/services/workflows/workflowIntegrationService';
   
   // After creating work order
   await notifyWorkOrderCreated(workOrderData);

2. In Work Order Service (when updating status):
   import { notifyWorkOrderStatusChanged } from '@/services/workflows/workflowIntegrationService';
   
   // When updating work order status
   const oldStatus = existingWorkOrder.status;
   // ... update work order ...
   await notifyWorkOrderStatusChanged(updatedWorkOrder, oldStatus);

3. In Customer Service (when creating customer):
   import { notifyCustomerCreated } from '@/services/workflows/workflowIntegrationService';
   
   // After creating customer
   await notifyCustomerCreated(customerData);

4. In Payment Service (when processing payment):
   import { notifyPaymentReceived } from '@/services/workflows/workflowIntegrationService';
   
   // After processing payment
   await notifyPaymentReceived(paymentData);
*/