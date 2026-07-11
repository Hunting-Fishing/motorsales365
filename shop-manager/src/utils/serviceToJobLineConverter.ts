import { SelectedService } from '@/types/selectedService';
import { WorkOrderJobLine } from '@/types/jobLine';
import { createJobLine, getWorkOrderJobLines, deleteWorkOrderJobLine } from '@/services/workOrder/jobLinesService';

/**
 * Converts selected services to work order job lines
 * Note: Does not generate IDs - these will be created by the database
 */
export function convertServicesToJobLines(
  services: SelectedService[],
  workOrderId: string
): Omit<WorkOrderJobLine, 'id' | 'created_at' | 'updated_at'>[] {
  return services.map((service, index) => ({
    work_order_id: workOrderId,
    name: service.name,
    description: service.description || '',
    category: service.category || service.categoryName || 'General',
    subcategory: service.subcategory || service.subcategoryName || 'Service',
    estimated_hours: service.estimated_hours || 0,
    labor_rate: service.labor_rate || 0,
    total_amount: service.total_amount || service.price || 0,
    status: service.status || 'pending',
    notes: '',
    display_order: index,
    is_from_service_selection: true
  }));
}

/**
 * Creates job lines from selected services and saves them to the database
 */
export async function createJobLinesFromServices(
  services: SelectedService[],
  workOrderId: string
): Promise<WorkOrderJobLine[]> {
  
  
  const jobLinesToCreate = convertServicesToJobLines(services, workOrderId);
  
  // Create job lines in the database using createJobLine for new records
  const createdJobLines: WorkOrderJobLine[] = [];
  
  for (const jobLineData of jobLinesToCreate) {
    try {
      const createdJobLine = await createJobLine(jobLineData);
      createdJobLines.push(createdJobLine);
    } catch (error) {
      console.error('Failed to create job line from service:', error);
      throw error;
    }
  }
  
  return createdJobLines;
}

/**
 * Removes job lines that were created from service selection
 */
export async function removeServiceJobLines(workOrderId: string): Promise<void> {
  
  
  const allJobLines = await getWorkOrderJobLines(workOrderId);
  const serviceJobLines = allJobLines.filter(jl => jl.is_from_service_selection);
  
  for (const jobLine of serviceJobLines) {
    try {
      await deleteWorkOrderJobLine(jobLine.id);
    } catch (error) {
      console.error('Failed to remove service job line:', error);
    }
  }
}