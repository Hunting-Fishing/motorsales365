import { WorkOrderJobLine } from '@sm/types/jobLine';
import { createJobLine, updateJobLine, deleteJobLine } from './jobLinesService';

/**
 * Comprehensive job line operations service
 * Handles all CRUD operations for work order job lines
 */

export async function createWorkOrderJobLine(
  jobLineData: Omit<WorkOrderJobLine, 'id' | 'created_at' | 'updated_at'>
): Promise<WorkOrderJobLine> {
  try {
    console.log('🔨 Creating new job line:', jobLineData);
    
    // Validate required fields
    if (!jobLineData.work_order_id) {
      throw new Error('Work order ID is required');
    }
    if (!jobLineData.name || jobLineData.name.trim() === '') {
      throw new Error('Job line name is required');
    }

    const createdJobLine = await createJobLine(jobLineData);
    console.log('✅ Job line created successfully:', createdJobLine.id);
    
    return createdJobLine;
  } catch (error) {
    console.error('❌ Error creating job line:', error);
    throw error;
  }
}

export async function updateWorkOrderJobLine(
  jobLineId: string, 
  updates: Partial<WorkOrderJobLine>
): Promise<WorkOrderJobLine> {
  try {
    console.log('🔧 Updating job line:', jobLineId, updates);
    
    if (!jobLineId) {
      throw new Error('Job line ID is required for update');
    }

    const updatedJobLine = await updateJobLine(jobLineId, updates);
    console.log('✅ Job line updated successfully:', updatedJobLine.id);
    
    return updatedJobLine;
  } catch (error) {
    console.error('❌ Error updating job line:', error);
    throw error;
  }
}

export async function deleteWorkOrderJobLine(jobLineId: string): Promise<void> {
  try {
    console.log('🗑️ Deleting job line:', jobLineId);
    
    if (!jobLineId) {
      throw new Error('Job line ID is required for deletion');
    }

    await deleteJobLine(jobLineId);
    console.log('✅ Job line deleted successfully');
  } catch (error) {
    console.error('❌ Error deleting job line:', error);
    throw error;
  }
}

export async function updateJobLineCompletion(
  jobLineId: string,
  completed: boolean,
  completedBy?: string
): Promise<WorkOrderJobLine> {
  try {
    console.log('✅ Updating job line completion:', jobLineId, completed);
    
    const updates: Partial<WorkOrderJobLine> = {
      is_work_completed: completed,
      completion_date: completed ? new Date().toISOString() : undefined,
      completed_by: completed ? (completedBy || 'Current User') : undefined,
      status: completed ? 'completed' : 'pending'
    };

    return await updateJobLine(jobLineId, updates);
  } catch (error) {
    console.error('❌ Error updating completion status:', error);
    throw error;
  }
}

export async function reorderJobLines(
  jobLines: WorkOrderJobLine[]
): Promise<void> {
  try {
    console.log('🔄 Reordering job lines:', jobLines.length, 'items');
    
    // Update display_order for each job line
    const updatePromises = jobLines.map((jobLine, index) => 
      updateJobLine(jobLine.id, { display_order: index + 1 })
    );

    await Promise.all(updatePromises);
    console.log('✅ Job lines reordered successfully');
  } catch (error) {
    console.error('❌ Error reordering job lines:', error);
    throw error;
  }
}

export async function toggleJobLineStatus(
  jobLineId: string,
  newStatus: 'pending' | 'in-progress' | 'completed' | 'on-hold'
): Promise<WorkOrderJobLine> {
  try {
    console.log('🔄 Changing job line status:', jobLineId, newStatus);
    
    const updates: Partial<WorkOrderJobLine> = {
      status: newStatus
    };

    // If marking as completed, also update completion fields
    if (newStatus === 'completed') {
      updates.is_work_completed = true;
      updates.completion_date = new Date().toISOString();
      updates.completed_by = 'Current User'; // In real app, get from auth
    }

    return await updateJobLine(jobLineId, updates);
  } catch (error) {
    console.error('❌ Error changing job line status:', error);
    throw error;
  }
}