
import { supabase } from '@/integrations/supabase/client';
import { WorkOrderJobLine } from '@/types/jobLine';

export async function getWorkOrderJobLines(workOrderId: string): Promise<WorkOrderJobLine[]> {
  console.log('🔍 Fetching job lines for work order:', workOrderId);
  
  try {
    const { data, error } = await supabase
      .from('work_order_job_lines')
      .select('*')
      .eq('work_order_id', workOrderId)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('❌ Error fetching job lines:', error);
      throw error;
    }

    console.log('✅ Fetched job lines:', data?.length || 0, 'items');

    const mappedJobLines: WorkOrderJobLine[] = (data || []).map(line => ({
      id: line.id,
      work_order_id: line.work_order_id,
      name: line.name,
      category: line.category || '',
      subcategory: line.subcategory || '',
      description: line.description || '',
      estimated_hours: line.estimated_hours || 0,
      labor_rate: line.labor_rate || 0,
      labor_rate_type: (line.labor_rate_type || 'standard') as 'standard' | 'overtime' | 'premium' | 'flat_rate',
      total_amount: line.total_amount || 0,
      status: (line.status || 'pending') as 'pending' | 'in-progress' | 'completed' | 'on-hold',
      display_order: line.display_order || 0,
      notes: line.notes || '',
      is_from_service_selection: line.is_from_service_selection || false,
      created_at: line.created_at,
      updated_at: line.updated_at
    }));

    return mappedJobLines;
  } catch (error) {
    console.error('❌ Error in getWorkOrderJobLines:', error);
    throw error;
  }
}

export async function createJobLine(jobLine: Omit<WorkOrderJobLine, 'id' | 'created_at' | 'updated_at'>): Promise<WorkOrderJobLine> {
  console.log('🔨 Creating job line:', jobLine);
  
  try {
    // Validate required fields
    if (!jobLine.work_order_id) {
      throw new Error('Work order ID is required');
    }
    if (!jobLine.name) {
      throw new Error('Job line name is required');
    }

    console.log('📝 Inserting job line into database...');
    
    const { data, error } = await supabase
      .from('work_order_job_lines')
      .insert([{
        work_order_id: jobLine.work_order_id,
        name: jobLine.name,
        category: jobLine.category || '',
        subcategory: jobLine.subcategory || '',
        description: jobLine.description || '',
        estimated_hours: jobLine.estimated_hours || 0,
        labor_rate: jobLine.labor_rate || 0,
        labor_rate_type: jobLine.labor_rate_type || 'standard',
        total_amount: jobLine.total_amount || 0,
        status: jobLine.status || 'pending',
        display_order: jobLine.display_order || 0,
        notes: jobLine.notes || '',
        is_from_service_selection: jobLine.is_from_service_selection || false
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ Database error creating job line:', error);
      throw new Error(`Failed to create job line: ${error.message}`);
    }

    if (!data) {
      console.error('❌ No data returned from job line creation');
      throw new Error('No data returned from job line creation');
    }

    console.log('✅ Job line created successfully:', data);

    const createdJobLine: WorkOrderJobLine = {
      id: data.id,
      work_order_id: data.work_order_id,
      name: data.name,
      category: data.category || '',
      subcategory: data.subcategory || '',
      description: data.description || '',
      estimated_hours: data.estimated_hours || 0,
      labor_rate: data.labor_rate || 0,
      labor_rate_type: (data.labor_rate_type || 'standard') as 'standard' | 'overtime' | 'premium' | 'flat_rate',
      total_amount: data.total_amount || 0,
      status: (data.status || 'pending') as 'pending' | 'in-progress' | 'completed' | 'on-hold',
      display_order: data.display_order || 0,
      notes: data.notes || '',
      is_from_service_selection: data.is_from_service_selection || false,
      created_at: data.created_at,
      updated_at: data.updated_at
    };

    return createdJobLine;
  } catch (error) {
    console.error('❌ Error in createJobLine:', error);
    throw error;
  }
}

export async function updateJobLine(jobLineId: string, updates: Partial<WorkOrderJobLine>): Promise<WorkOrderJobLine> {
  console.log('🔧 Updating job line:', jobLineId, updates);
  
  try {
    if (!jobLineId) {
      throw new Error('Job line ID is required for update');
    }

    console.log('📝 Updating job line in database...');

    const { data, error } = await supabase
      .from('work_order_job_lines')
      .update({
        name: updates.name,
        category: updates.category,
        subcategory: updates.subcategory,
        description: updates.description,
        estimated_hours: updates.estimated_hours,
        labor_rate: updates.labor_rate,
        labor_rate_type: updates.labor_rate_type,
        total_amount: updates.total_amount,
        status: updates.status,
        display_order: updates.display_order,
        notes: updates.notes,
        is_from_service_selection: updates.is_from_service_selection
      })
      .eq('id', jobLineId)
      .select()
      .single();

    if (error) {
      console.error('❌ Database error updating job line:', error);
      throw new Error(`Failed to update job line: ${error.message}`);
    }

    if (!data) {
      console.error('❌ No data returned from job line update');
      throw new Error('Job line not found or could not be updated');
    }

    console.log('✅ Job line updated successfully:', data);

    const updatedJobLine: WorkOrderJobLine = {
      id: data.id,
      work_order_id: data.work_order_id,
      name: data.name,
      category: data.category || '',
      subcategory: data.subcategory || '',
      description: data.description || '',
      estimated_hours: data.estimated_hours || 0,
      labor_rate: data.labor_rate || 0,
      labor_rate_type: (data.labor_rate_type || 'standard') as 'standard' | 'overtime' | 'premium' | 'flat_rate',
      total_amount: data.total_amount || 0,
      status: (data.status || 'pending') as 'pending' | 'in-progress' | 'completed' | 'on-hold',
      display_order: data.display_order || 0,
      notes: data.notes || '',
      is_from_service_selection: data.is_from_service_selection || false,
      created_at: data.created_at,
      updated_at: data.updated_at
    };

    return updatedJobLine;
  } catch (error) {
    console.error('❌ Error in updateJobLine:', error);
    throw error;
  }
}

export async function deleteJobLine(jobLineId: string): Promise<void> {
  console.log('🗑️ Deleting job line:', jobLineId);
  
  try {
    if (!jobLineId) {
      throw new Error('Job line ID is required for deletion');
    }

    const { error } = await supabase
      .from('work_order_job_lines')
      .delete()
      .eq('id', jobLineId);

    if (error) {
      console.error('❌ Database error deleting job line:', error);
      throw new Error(`Failed to delete job line: ${error.message}`);
    }

    console.log('✅ Job line deleted successfully');
  } catch (error) {
    console.error('❌ Error in deleteJobLine:', error);
    throw error;
  }
}

// Alias exports for backward compatibility with existing imports
export const createWorkOrderJobLine = createJobLine;
export const updateWorkOrderJobLine = updateJobLine;
export const deleteWorkOrderJobLine = deleteJobLine;

// Additional alias for upsert functionality
export async function upsertWorkOrderJobLine(jobLine: Partial<WorkOrderJobLine> & { work_order_id: string }): Promise<WorkOrderJobLine> {
  console.log('🔄 Upserting job line:', jobLine);
  
  if (jobLine.id) {
    return updateJobLine(jobLine.id, jobLine);
  } else {
    return createJobLine(jobLine as Omit<WorkOrderJobLine, 'id' | 'created_at' | 'updated_at'>);
  }
}
