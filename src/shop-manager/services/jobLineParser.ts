
import { WorkOrderJobLine } from '@/types/jobLine';

export function parseJobLineData(data: any[]): WorkOrderJobLine[] {
  return data.map(item => ({
    id: item.id || `temp-${Date.now()}-${Math.random()}`,
    work_order_id: item.work_order_id || item.workOrderId,
    name: item.name || '',
    category: item.category || '',
    subcategory: item.subcategory || '',
    description: item.description || '',
    estimated_hours: item.estimated_hours || item.estimatedHours || 0,
    labor_rate: item.labor_rate || item.laborRate || 0,
    total_amount: item.total_amount || item.totalAmount || 0,
    status: item.status || 'pending',
    notes: item.notes || '',
    display_order: item.display_order || 0,
    created_at: item.created_at || new Date().toISOString(),
    updated_at: item.updated_at || new Date().toISOString()
  }));
}
