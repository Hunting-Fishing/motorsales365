
import { WorkOrderPart } from '@/types/workOrderPart';
import { updateWorkOrderPart } from './workOrderPartsService';

export interface PartsAssignmentData {
  partId: string;
  jobLineId: string;
  quantity: number;
  assignedBy: string;
  assignmentDate: string;
  notes?: string;
}

export class PartsAssignmentService {
  static async assignPartToJobLine(data: PartsAssignmentData): Promise<boolean> {
    try {
      console.log('Assigning part to job line:', data);
      
      // Update the part to assign it to the job line
      await updateWorkOrderPart(data.partId, {
        job_line_id: data.jobLineId,
        quantity: data.quantity,
        status: 'assigned',
        notes: data.notes
      });
      
      console.log('Successfully assigned part to job line');
      return true;
    } catch (error) {
      console.error('Failed to assign part to job line:', error);
      return false;
    }
  }

  static async unassignPartFromJobLine(partId: string): Promise<boolean> {
    try {
      console.log('Unassigning part from job line:', { partId });
      
      // Update the part to remove job line assignment
      await updateWorkOrderPart(partId, {
        job_line_id: undefined,
        status: 'pending'
      });
      
      console.log('Successfully unassigned part from job line');
      return true;
    } catch (error) {
      console.error('Failed to unassign part from job line:', error);
      return false;
    }
  }

  static async getPartsForJobLine(jobLineId: string): Promise<WorkOrderPart[]> {
    try {
      console.log('Getting parts for job line:', jobLineId);
      
      // Import here to avoid circular dependency
      const { getPartsByJobLine } = await import('./workOrderPartsService');
      return await getPartsByJobLine(jobLineId);
    } catch (error) {
      console.error('Failed to get parts for job line:', error);
      return [];
    }
  }
}
