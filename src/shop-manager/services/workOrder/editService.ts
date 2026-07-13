
import { WorkOrderJobLine } from '@/types/jobLine';
import { WorkOrderPart, WorkOrderPartFormValues } from '@/types/workOrderPart';
import { updateJobLine } from './jobLinesService';
import { updateWorkOrderPart } from './workOrderPartsService';

export class EditService {
  static async updateJobLine(
    jobLineId: string, 
    updates: Partial<WorkOrderJobLine>
  ): Promise<WorkOrderJobLine> {
    try {
      // Automatically calculate total amount if hours or rate changed
      if (updates.estimated_hours !== undefined || updates.labor_rate !== undefined) {
        const estimatedHours = updates.estimated_hours ?? 0;
        const laborRate = updates.labor_rate ?? 0;
        updates.total_amount = estimatedHours * laborRate;
      }

      return await updateJobLine(jobLineId, updates);
    } catch (error) {
      console.error('Error updating job line:', error);
      throw new Error('Failed to update job line');
    }
  }

  static async updatePart(
    partId: string, 
    updates: Partial<WorkOrderPart>
  ): Promise<WorkOrderPart> {
    try {
      // Convert WorkOrderPart to WorkOrderPartFormValues for the service
      const formValues: Partial<WorkOrderPartFormValues> = {
        name: updates.name || '',
        part_number: updates.part_number || '',
        description: updates.description,
        quantity: updates.quantity ?? 1,
        unit_price: updates.unit_price ?? 0,
        status: updates.status,
        notes: updates.notes,
        job_line_id: updates.job_line_id,
        part_type: updates.part_type || 'inventory'
      };

      // Automatically calculate total price if quantity or unit price changed
      if (updates.quantity !== undefined || updates.unit_price !== undefined) {
        const quantity = updates.quantity ?? 1;
        const unitPrice = updates.unit_price ?? 0;
        // Note: total_price is calculated in the database mapper
      }

      return await updateWorkOrderPart(partId, formValues);
    } catch (error) {
      console.error('Error updating part:', error);
      throw new Error('Failed to update part');
    }
  }
}
