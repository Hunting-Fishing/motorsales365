
// Discount system types

export interface DiscountType {
  id: string;
  name: string;
  description?: string;
  discount_type: 'percentage' | 'fixed_amount';
  default_value: number;
  applies_to: 'labor' | 'parts' | 'work_order' | 'any';
  is_active: boolean;
  requires_approval: boolean;
  max_discount_amount?: number;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface JobLineDiscount {
  id: string;
  job_line_id: string;
  discount_type_id?: string;
  discount_name: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  discount_amount: number;
  reason?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  created_by: string;
  // Related data
  discountTypeInfo?: DiscountType;
}

export interface PartDiscount {
  id: string;
  part_id: string;
  discount_type_id?: string;
  discount_name: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  discount_amount: number;
  reason?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  created_by: string;
  // Related data
  discountTypeInfo?: DiscountType;
}

export interface WorkOrderDiscount {
  id: string;
  work_order_id: string;
  discount_type_id?: string;
  discount_name: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  discount_amount: number;
  applies_to: 'labor' | 'parts' | 'total';
  reason?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  created_by: string;
  // Related data
  discountTypeInfo?: DiscountType;
}

export interface DiscountAuditLog {
  id: string;
  discount_id: string;
  discount_table: string;
  action_type: 'created' | 'modified' | 'deleted' | 'approved' | 'rejected';
  old_values?: any;
  new_values?: any;
  performed_by: string;
  performed_at: string;
  reason?: string;
}

export interface DiscountCalculationResult {
  labor_subtotal: number;
  labor_discounts: number;
  labor_total: number;
  parts_subtotal: number;
  parts_discounts: number;
  parts_total: number;
  work_order_discounts?: number;
  subtotal_before_wo_discounts?: number;
  total_discounts: number;
  final_total: number;
}

export interface ApplyDiscountRequest {
  discount_type_id?: string;
  discount_name: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  reason?: string;
  created_by: string;
}
