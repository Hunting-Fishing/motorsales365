
import { supabase } from '@/integrations/supabase/client';
import { 
  DiscountType, 
  JobLineDiscount, 
  PartDiscount, 
  WorkOrderDiscount, 
  ApplyDiscountRequest,
  DiscountCalculationResult 
} from '@/types/discount';

// Get all discount types
export const getDiscountTypes = async (): Promise<DiscountType[]> => {
  const { data, error } = await supabase
    .from('discount_types')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) throw error;

  return data?.map(item => ({
    ...item,
    discount_type: item.discount_type as 'percentage' | 'fixed_amount',
    applies_to: item.applies_to as 'labor' | 'parts' | 'work_order' | 'any'
  })) || [];
};

// Get discount types by category
export const getDiscountTypesByCategory = async (category?: 'labor' | 'parts' | 'work_order' | 'any'): Promise<DiscountType[]> => {
  let query = supabase
    .from('discount_types')
    .select('*')
    .eq('is_active', true);

  if (category) {
    query = query.or(`applies_to.eq.${category},applies_to.eq.any`);
  }

  const { data, error } = await query.order('name');

  if (error) throw error;

  return data?.map(item => ({
    ...item,
    discount_type: item.discount_type as 'percentage' | 'fixed_amount',
    applies_to: item.applies_to as 'labor' | 'parts' | 'work_order' | 'any'
  })) || [];
};

// Job Line Discount Functions
export const getJobLineDiscounts = async (jobLineId: string): Promise<JobLineDiscount[]> => {
  const { data, error } = await supabase
    .from('job_line_discounts')
    .select(`
      *,
      discountTypeInfo:discount_types(*)
    `)
    .eq('job_line_id', jobLineId);

  if (error) throw error;

  return data?.map(item => ({
    ...item,
    discount_type: item.discount_type as 'percentage' | 'fixed_amount',
    discountTypeInfo: item.discountTypeInfo ? {
      ...item.discountTypeInfo,
      discount_type: item.discountTypeInfo.discount_type as 'percentage' | 'fixed_amount',
      applies_to: item.discountTypeInfo.applies_to as 'labor' | 'parts' | 'work_order' | 'any'
    } : undefined
  })) || [];
};

export const applyJobLineDiscount = async (
  jobLineId: string, 
  discountRequest: ApplyDiscountRequest
): Promise<JobLineDiscount> => {
  const { data, error } = await supabase
    .from('job_line_discounts')
    .insert({
      job_line_id: jobLineId,
      discount_type_id: discountRequest.discount_type_id,
      discount_name: discountRequest.discount_name,
      discount_type: discountRequest.discount_type,
      discount_value: discountRequest.discount_value,
      discount_amount: 0, // This should be calculated based on the job line total
      reason: discountRequest.reason,
      created_by: discountRequest.created_by
    })
    .select()
    .single();

  if (error) throw error;

  return {
    ...data,
    discount_type: data.discount_type as 'percentage' | 'fixed_amount'
  };
};

export const removeJobLineDiscount = async (discountId: string): Promise<void> => {
  const { error } = await supabase
    .from('job_line_discounts')
    .delete()
    .eq('id', discountId);

  if (error) throw error;
};

// Part Discount Functions
export const getPartDiscounts = async (partId: string): Promise<PartDiscount[]> => {
  const { data, error } = await supabase
    .from('part_discounts')
    .select(`
      *,
      discountTypeInfo:discount_types(*)
    `)
    .eq('part_id', partId);

  if (error) throw error;

  return data?.map(item => ({
    ...item,
    discount_type: item.discount_type as 'percentage' | 'fixed_amount',
    discountTypeInfo: item.discountTypeInfo ? {
      ...item.discountTypeInfo,
      discount_type: item.discountTypeInfo.discount_type as 'percentage' | 'fixed_amount',
      applies_to: item.discountTypeInfo.applies_to as 'labor' | 'parts' | 'work_order' | 'any'
    } : undefined
  })) || [];
};

export const applyPartDiscount = async (
  partId: string, 
  discountRequest: ApplyDiscountRequest
): Promise<PartDiscount> => {
  const { data, error } = await supabase
    .from('part_discounts')
    .insert({
      part_id: partId,
      discount_type_id: discountRequest.discount_type_id,
      discount_name: discountRequest.discount_name,
      discount_type: discountRequest.discount_type,
      discount_value: discountRequest.discount_value,
      discount_amount: 0, // This should be calculated based on the part cost
      reason: discountRequest.reason,
      created_by: discountRequest.created_by
    })
    .select()
    .single();

  if (error) throw error;

  return {
    ...data,
    discount_type: data.discount_type as 'percentage' | 'fixed_amount'
  };
};

export const removePartDiscount = async (discountId: string): Promise<void> => {
  const { error } = await supabase
    .from('part_discounts')
    .delete()
    .eq('id', discountId);

  if (error) throw error;
};

// Work Order Discount Functions
export const getWorkOrderDiscounts = async (workOrderId: string): Promise<WorkOrderDiscount[]> => {
  const { data, error } = await supabase
    .from('work_order_discounts')
    .select(`
      *,
      discountTypeInfo:discount_types(*)
    `)
    .eq('work_order_id', workOrderId);

  if (error) throw error;

  return data?.map(item => ({
    ...item,
    discount_type: item.discount_type as 'percentage' | 'fixed_amount',
    applies_to: item.applies_to as 'labor' | 'parts' | 'total',
    discountTypeInfo: item.discountTypeInfo ? {
      ...item.discountTypeInfo,
      discount_type: item.discountTypeInfo.discount_type as 'percentage' | 'fixed_amount',
      applies_to: item.discountTypeInfo.applies_to as 'labor' | 'parts' | 'work_order' | 'any'
    } : undefined
  })) || [];
};

export const applyWorkOrderDiscount = async (
  workOrderId: string, 
  discountRequest: ApplyDiscountRequest & { applies_to: 'labor' | 'parts' | 'total' }
): Promise<WorkOrderDiscount> => {
  const { data, error } = await supabase
    .from('work_order_discounts')
    .insert({
      work_order_id: workOrderId,
      discount_type_id: discountRequest.discount_type_id,
      discount_name: discountRequest.discount_name,
      discount_type: discountRequest.discount_type,
      discount_value: discountRequest.discount_value,
      discount_amount: 0, // This should be calculated based on the work order total
      applies_to: discountRequest.applies_to,
      reason: discountRequest.reason,
      created_by: discountRequest.created_by
    })
    .select()
    .single();

  if (error) throw error;

  return {
    ...data,
    discount_type: data.discount_type as 'percentage' | 'fixed_amount',
    applies_to: data.applies_to as 'labor' | 'parts' | 'total'
  };
};

export const removeWorkOrderDiscount = async (discountId: string): Promise<void> => {
  const { error } = await supabase
    .from('work_order_discounts')
    .delete()
    .eq('id', discountId);

  if (error) throw error;
};

// Calculation Functions
export const calculateJobLineTotalWithDiscounts = async (jobLineId: string): Promise<DiscountCalculationResult> => {
  const { data, error } = await supabase
    .rpc('calculate_job_line_total_with_discounts', { job_line_id_param: jobLineId });

  if (error) throw error;

  // Parse the JSON result from the database function
  const result = typeof data === 'string' ? JSON.parse(data) : data;
  
  return result as DiscountCalculationResult;
};

export const calculateWorkOrderTotalsWithDiscounts = async (workOrderId: string): Promise<DiscountCalculationResult> => {
  const { data, error } = await supabase
    .rpc('calculate_work_order_totals_with_discounts', { work_order_id_param: workOrderId });

  if (error) throw error;

  // Parse the JSON result from the database function
  const result = typeof data === 'string' ? JSON.parse(data) : data;
  
  return result as DiscountCalculationResult;
};
