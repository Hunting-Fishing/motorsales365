
import { WorkOrderRepository } from './WorkOrderRepository';
import { WorkOrder, WorkOrderFormValues } from '@/types/workOrder';
import { supabase } from '@/lib/supabase';
import { triggerWorkflowOnWorkOrderCreate, triggerWorkflowOnWorkOrderStatusUpdate, triggerWorkflowOnWorkOrderComplete } from '@/services/workflows/workflowEventService';
export class WorkOrderService {
  private repository: WorkOrderRepository;

  constructor() {
    this.repository = new WorkOrderRepository();
  }

  async getAllWorkOrders(): Promise<WorkOrder[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      console.error('WorkOrderService: Error fetching work orders:', error);
      throw error;
    }
  }

  async getWorkOrderById(id: string): Promise<WorkOrder> {
    try {
      const workOrder = await this.repository.findById(id);
      if (!workOrder) {
        throw new Error(`Work order with ID ${id} not found`);
      }
      return workOrder;
    } catch (error) {
      console.error('WorkOrderService: Error fetching work order by ID:', error);
      throw error;
    }
  }

  async createWorkOrder(formData: WorkOrderFormValues & { jobLines?: any[] }): Promise<WorkOrder> {
    try {
      console.log('=== WORK ORDER SERVICE DEBUG ===');
      console.log('1. Service received form data:', formData);
      
      const workOrderData = this.mapFormToWorkOrder(formData);
      console.log('2. Mapped data for database:', workOrderData);
      
      const result = await this.repository.create(workOrderData);
      console.log('3. Repository returned:', result);
      
      // Save job lines if provided
      if (formData.jobLines && formData.jobLines.length > 0) {
        console.log('4. Saving job lines:', formData.jobLines.length);
        await this.saveJobLines(result.id, formData.jobLines);
        console.log('5. Job lines saved successfully');
      }
      
      // Trigger workflow automation for new work order
      try {
        console.log('6. Triggering workflow for new work order');
        await triggerWorkflowOnWorkOrderCreate(result);
      } catch (workflowError) {
        console.warn('Workflow trigger failed (non-blocking):', workflowError);
      }
      
      return result;
    } catch (error) {
      console.error('WorkOrderService: Error creating work order:', error);
      console.error('Form data that caused error:', formData);
      throw error;
    }
  }

  /**
   * Save job lines for a work order
   */
  private async saveJobLines(workOrderId: string, jobLines: any[]): Promise<void> {
    try {
      console.log('=== SAVING JOB LINES ===');
      console.log('Work Order ID:', workOrderId);
      console.log('Job Lines to save:', jobLines);

      for (const jobLine of jobLines) {
        // For service-generated job lines with temp IDs, let DB generate new ID
        const jobLineId = jobLine.id && jobLine.id.startsWith('service-') ? null : jobLine.id;
        
        console.log(`Processing job line: ${jobLine.name} with ID: ${jobLine.id} -> ${jobLineId}`);
        
        const { data, error } = await supabase.rpc('upsert_work_order_job_line', {
          p_id: jobLineId,
          p_work_order_id: workOrderId,
          p_name: jobLine.name || '',
          p_category: jobLine.category || '',
          p_subcategory: jobLine.subcategory || '',
          p_description: jobLine.description || '',
          p_estimated_hours: jobLine.estimated_hours || 0,
          p_labor_rate: jobLine.labor_rate || 0,
          p_total_amount: jobLine.total_amount || 0,
          p_status: jobLine.status || 'pending',
          p_notes: jobLine.notes || '',
          p_display_order: jobLine.display_order || 0
        });

        if (error) {
          console.error('Error saving job line:', error);
          throw new Error(`Failed to save job line: ${error.message}`);
        }
        
        console.log(`Successfully saved job line: ${jobLine.name}`, data);
      }
      
      console.log('=== ALL JOB LINES SAVED SUCCESSFULLY ===');
    } catch (error) {
      console.error('Error in saveJobLines:', error);
      throw error;
    }
  }

  async updateWorkOrder(id: string, formData: Partial<WorkOrderFormValues>): Promise<WorkOrder> {
    try {
      const updateData = this.mapFormToWorkOrder(formData);
      return await this.repository.update(id, updateData);
    } catch (error) {
      console.error('WorkOrderService: Error updating work order:', error);
      throw error;
    }
  }

  async updateWorkOrderStatus(id: string, status: string, userId?: string, userName?: string): Promise<WorkOrder> {
    try {
      console.log('🔄 SERVICE DEBUG: updateWorkOrderStatus called');
      console.log('🔄 SERVICE DEBUG: ID:', id);
      console.log('🔄 SERVICE DEBUG: Status:', status);
      console.log('🔄 SERVICE DEBUG: UserID:', userId);
      console.log('🔄 SERVICE DEBUG: UserName:', userName);
      
      // Get current work order to know old status
      const currentWorkOrder = await this.repository.findById(id);
      const oldStatus = currentWorkOrder?.status || 'unknown';
      
      const result = await this.repository.updateStatus(id, status, userId, userName);
      console.log('🔄 SERVICE DEBUG: Repository returned:', result);
      
      // Trigger workflow automation for status change
      try {
        if (status === 'completed') {
          await triggerWorkflowOnWorkOrderComplete(result);
        } else {
          await triggerWorkflowOnWorkOrderStatusUpdate(result, oldStatus);
        }
      } catch (workflowError) {
        console.warn('Workflow trigger failed (non-blocking):', workflowError);
      }
      
      return result;
    } catch (error) {
      console.error('🔄 SERVICE DEBUG: Error updating work order status:', error);
      throw error;
    }
  }

  async deleteWorkOrder(id: string): Promise<void> {
    try {
      await this.repository.delete(id);
    } catch (error) {
      console.error('WorkOrderService: Error deleting work order:', error);
      throw error;
    }
  }

  async getWorkOrdersByCustomer(customerId: string): Promise<WorkOrder[]> {
    try {
      return await this.repository.findByCustomerId(customerId);
    } catch (error) {
      console.error('WorkOrderService: Error fetching work orders by customer:', error);
      throw error;
    }
  }

  /**
   * Maps form priority values to database urgency_level values
   */
  private static mapPriorityToUrgencyLevel(priority: string): string {
    const priorityMap: Record<string, string> = {
      'low': 'Low',
      'medium': 'Normal',
      'high': 'Urgent',
      'critical': 'Emergency'
    };
    
    return priorityMap[priority?.toLowerCase()] || 'Normal';
  }

  private mapFormToWorkOrder(formData: Partial<WorkOrderFormValues>): any {
    console.log('=== MAPPING FORM TO DATABASE ===');
    console.log('Input form data:', formData);
    
    const mapped = {
      // Core work order fields that exist in database
      customer_id: (formData as any).customerId || null,
      vehicle_id: (formData as any).vehicleId || null,
      description: formData.description,
      status: formData.status || 'pending',
      technician_id: (formData as any).technicianId || null,
      service_type: (formData as any).serviceType || null,
      estimated_hours: (formData as any).estimatedHours || null,
      
      // Map form fields to actual database columns
      urgency_level: WorkOrderService.mapPriorityToUrgencyLevel(formData.priority || 'medium'),
      customer_complaint: formData.description || null,
      complaint_source: (formData as any).complaintSource || 'Customer',
      additional_info: (formData as any).additionalInfo || null,
      customer_instructions: (formData as any).customerInstructions || formData.notes || null,
      authorization_limit: (formData as any).authorizationLimit || 0,
      preferred_contact_method: (formData as any).preferredContactMethod || 'Phone',
      drop_off_type: (formData as any).dropOffType || 'Walk-in',
      diagnostic_notes: (formData as any).diagnosticNotes || null,
      initial_mileage: (formData as any).initialMileage || null,
      vehicle_condition_notes: (formData as any).vehicleConditionNotes || null,
      customer_waiting: (formData as any).customerWaiting || false,
      is_warranty: (formData as any).isWarranty || false,
      is_repeat_issue: (formData as any).isRepeatIssue || false,
      vehicle_damages: (formData as any).vehicleDamages || [],
      service_tags: (formData as any).serviceTags || [],
      
      // Set timestamps (created_at and updated_at have defaults in DB)
      write_up_time: new Date().toISOString(),
    };
    
    // Only include non-null values to avoid database errors
    const cleanedMapped = Object.fromEntries(
      Object.entries(mapped).filter(([_, value]) => value !== null && value !== undefined)
    );
    
    console.log('Mapped database data:', cleanedMapped);
    return cleanedMapped;
  }
}
