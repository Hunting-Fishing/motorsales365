import { WorkOrderJobLine } from '@/types/jobLine';

export function parseEnhancedJobLineData(data: any[]): WorkOrderJobLine[] {
  return data.map(item => ({
    id: item.id,
    work_order_id: item.workOrderId || item.work_order_id,
    name: item.name,
    category: item.category,
    subcategory: item.subcategory,
    description: item.description,
    estimated_hours: item.estimatedHours || item.estimated_hours,
    labor_rate: item.laborRate || item.labor_rate,
    total_amount: item.totalAmount || item.total_amount,
    status: item.status,
    notes: item.notes,
    display_order: item.display_order || 0,
    created_at: item.created_at || new Date().toISOString(),
    updated_at: item.updated_at || new Date().toISOString()
  }));
}

export function validateJobLineData(jobLine: Partial<WorkOrderJobLine>): WorkOrderJobLine {
  return {
    id: jobLine.id || `temp-${Date.now()}`,
    work_order_id: jobLine.work_order_id || '',
    name: jobLine.name || '',
    category: jobLine.category || '',
    subcategory: jobLine.subcategory || '',
    description: jobLine.description || '',
    estimated_hours: jobLine.estimated_hours || 0,
    labor_rate: jobLine.labor_rate || 0,
    total_amount: jobLine.total_amount || 0,
    status: jobLine.status || 'pending',
    notes: jobLine.notes || '',
    display_order: jobLine.display_order || 0,
    created_at: jobLine.created_at || new Date().toISOString(),
    updated_at: jobLine.updated_at || new Date().toISOString()
  };
}

// Utility function to generate temporary job line IDs
export function generateTempJobLineId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
