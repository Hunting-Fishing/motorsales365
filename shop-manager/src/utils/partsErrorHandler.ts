
import { toast } from 'sonner';
import { WorkOrderPartFormValues } from '@/types/workOrderPart';

export class PartsFormValidator {
  static validatePartData(data: Partial<WorkOrderPartFormValues>): string[] {
    const errors: string[] = [];

    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      errors.push('Part name is required');
    }

    if (!data.part_number || typeof data.part_number !== 'string' || data.part_number.trim() === '') {
      errors.push('Part number is required');
    }

    if (!data.quantity || typeof data.quantity !== 'number' || data.quantity <= 0) {
      errors.push('Quantity must be greater than 0');
    }

    if (data.unit_price !== undefined && (typeof data.unit_price !== 'number' || data.unit_price < 0)) {
      errors.push('Unit price cannot be negative');
    }

    if (!data.part_type || typeof data.part_type !== 'string' || data.part_type.trim() === '') {
      errors.push('Part type is required');
    }

    return errors;
  }

  static validatePartForm(data: Partial<WorkOrderPartFormValues>): { field: string; message: string }[] {
    const errors: { field: string; message: string }[] = [];
    
    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      errors.push({ field: 'name', message: 'Part name is required' });
    }

    if (!data.part_number || typeof data.part_number !== 'string' || data.part_number.trim() === '') {
      errors.push({ field: 'part_number', message: 'Part number is required' });
    }

    if (!data.quantity || typeof data.quantity !== 'number' || data.quantity <= 0) {
      errors.push({ field: 'quantity', message: 'Quantity must be greater than 0' });
    }

    if (data.unit_price !== undefined && (typeof data.unit_price !== 'number' || data.unit_price < 0)) {
      errors.push({ field: 'unit_price', message: 'Unit price cannot be negative' });
    }

    if (!data.part_type || typeof data.part_type !== 'string' || data.part_type.trim() === '') {
      errors.push({ field: 'part_type', message: 'Part type is required' });
    }

    // Validate status if provided
    if (data.status && (typeof data.status !== 'string' || data.status.trim() === '')) {
      errors.push({ field: 'status', message: 'Status must be a valid string' });
    }

    return errors;
  }

  static showValidationErrors(errors: { field: string; message: string }[]) {
    errors.forEach(error => {
      this.showErrorToast(error.message);
    });
  }

  static handleApiError(error: any): string {
    console.error('Parts API Error:', error);
    
    if (error?.message && typeof error.message === 'string') {
      return error.message;
    }
    
    if (typeof error === 'string') {
      return error;
    }

    if (error?.details && typeof error.details === 'string') {
      return error.details;
    }
    
    return 'An unexpected error occurred while managing parts';
  }

  static preparePartDataForApi(formData: WorkOrderPartFormValues): any {
    // Ensure all required fields are present and valid
    const validation = this.validatePartForm(formData);
    if (validation.length > 0) {
      throw new Error(`Validation failed: ${validation.map(v => v.message).join(', ')}`);
    }

    // Calculate total price
    const totalPrice = (formData.quantity || 0) * (formData.unit_price || 0);

    return {
      name: formData.name.trim(),
      part_number: formData.part_number.trim(),
      description: formData.description?.trim() || '',
      quantity: formData.quantity,
      unit_price: formData.unit_price || 0,
      total_price: totalPrice,
      status: formData.status || 'pending',
      notes: formData.notes?.trim() || '',
      part_type: formData.part_type,
      job_line_id: formData.job_line_id || null,
      category: formData.category?.trim() || null,
      
      // Optional fields
      customer_price: formData.customerPrice || formData.unit_price || 0,
      supplier_cost: formData.supplierCost || null,
      retail_price: formData.supplierSuggestedRetail || null,
      markup_percentage: formData.markupPercentage || null,
      is_taxable: formData.isTaxable || false,
      core_charge_amount: formData.coreChargeAmount || null,
      core_charge_applied: formData.coreChargeApplied || false,
      warranty_duration: formData.warrantyDuration?.trim() || null,
      warranty_expiry_date: formData.warrantyExpiryDate || null,
      install_date: formData.installDate || null,
      installed_by: formData.installedBy?.trim() || null,
      invoice_number: formData.invoiceNumber?.trim() || null,
      po_line: formData.poLine?.trim() || null,
      is_stock_item: formData.isStockItem || false,
      supplier_name: formData.supplierName?.trim() || null,
      supplier_order_ref: formData.supplierOrderRef?.trim() || null,
      notes_internal: formData.notesInternal?.trim() || null,
      inventory_item_id: formData.inventoryItemId || null,
      estimated_arrival_date: formData.estimatedArrivalDate || null,
      item_status: formData.itemStatus || null
    };
  }

  static showSuccessToast(message: string) {
    toast.success(message);
  }

  static showErrorToast(message: string) {
    toast.error(message);
  }

  static showWarningToast(message: string) {
    toast.warning(message);
  }
}
