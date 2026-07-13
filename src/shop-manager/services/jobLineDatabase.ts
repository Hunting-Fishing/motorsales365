
import { supabase } from '@/integrations/supabase/client';
import { WorkOrderJobLine, LaborRateType } from '@/types/jobLine';

// Type guard to validate labor rate type
function validateLaborRateType(type: string): LaborRateType {
  const validTypes: LaborRateType[] = ['standard', 'overtime', 'premium', 'flat_rate'];
  return validTypes.includes(type as LaborRateType) ? (type as LaborRateType) : 'standard';
}

export const getJobLines = async (workOrderId: string): Promise<WorkOrderJobLine[]> => {
  try {
    const { data, error } = await supabase
      .from('work_order_job_lines')
      .select('*')
      .eq('work_order_id', workOrderId)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching job lines:', error);
      throw new Error('Failed to fetch job lines');
    }

    // Transform the data to ensure proper types
    const transformedData = (data || []).map(item => ({
      ...item,
      labor_rate_type: validateLaborRateType(item.labor_rate_type || 'standard')
    })) as WorkOrderJobLine[];

    return transformedData;
  } catch (error) {
    console.error('Error in getJobLines:', error);
    return [];
  }
};

export const createJobLine = async (jobLineData: Partial<WorkOrderJobLine>): Promise<WorkOrderJobLine> => {
  try {
    // Ensure required fields are present
    if (!jobLineData.work_order_id || !jobLineData.name) {
      throw new Error('Work order ID and name are required');
    }

    const createData = {
      work_order_id: jobLineData.work_order_id,
      name: jobLineData.name,
      category: jobLineData.category || null,
      subcategory: jobLineData.subcategory || null,
      description: jobLineData.description || null,
      estimated_hours: jobLineData.estimated_hours || 0,
      labor_rate: jobLineData.labor_rate || 0,
      labor_rate_type: validateLaborRateType(jobLineData.labor_rate_type || 'standard'),
      total_amount: jobLineData.total_amount || 0,
      status: jobLineData.status || 'pending',
      display_order: jobLineData.display_order || 0,
      notes: jobLineData.notes || null
    };

    const { data, error } = await supabase
      .from('work_order_job_lines')
      .insert(createData)
      .select()
      .single();

    if (error) {
      console.error('Error creating job line:', error);
      throw new Error('Failed to create job line');
    }

    return {
      ...data,
      labor_rate_type: validateLaborRateType(data.labor_rate_type)
    } as WorkOrderJobLine;
  } catch (error) {
    console.error('Error in createJobLine:', error);
    throw error;
  }
};

export const updateJobLine = async (id: string, updates: Partial<WorkOrderJobLine>): Promise<WorkOrderJobLine> => {
  try {
    // Clean up the updates to ensure proper typing
    const updateData: any = { ...updates };
    if (updateData.labor_rate_type) {
      updateData.labor_rate_type = validateLaborRateType(updateData.labor_rate_type);
    }
    
    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const { data, error } = await supabase
      .from('work_order_job_lines')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating job line:', error);
      throw new Error('Failed to update job line');
    }

    return {
      ...data,
      labor_rate_type: validateLaborRateType(data.labor_rate_type)
    } as WorkOrderJobLine;
  } catch (error) {
    console.error('Error in updateJobLine:', error);
    throw error;
  }
};

export const deleteJobLine = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('work_order_job_lines')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting job line:', error);
      throw new Error('Failed to delete job line');
    }
  } catch (error) {
    console.error('Error in deleteJobLine:', error);
    throw error;
  }
};

// Remove the mock data
export const sampleJobLines: WorkOrderJobLine[] = [];
