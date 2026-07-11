
import { WorkOrderPart } from '@/types/workOrderPart';

export function mapDatabasePartToWorkOrderPart(dbPart: any): WorkOrderPart {
  if (!dbPart || !dbPart.id) {
    throw new Error('Invalid database part data');
  }

  // Handle both old and new field names for backward compatibility
  const partName = dbPart.part_name || dbPart.name || '';
  const partNumber = dbPart.part_number || '';
  const description = dbPart.description || dbPart.part_description || '';
  const unitPrice = parseFloat(dbPart.customer_price || dbPart.unit_price || 0);
  const quantity = parseInt(dbPart.quantity) || 0;
  const totalPrice = parseFloat(dbPart.total_price) || (unitPrice * quantity);

  return {
    id: dbPart.id,
    work_order_id: dbPart.work_order_id,
    job_line_id: dbPart.job_line_id || undefined,
    part_number: partNumber,
    name: partName,
    description: description || undefined,
    quantity: quantity,
    unit_price: unitPrice,
    total_price: totalPrice,
    status: dbPart.status || 'pending',
    notes: dbPart.notes || dbPart.notes_internal || undefined,
    created_at: dbPart.created_at || new Date().toISOString(),
    updated_at: dbPart.updated_at || new Date().toISOString(),
    
    // Core fields
    category: dbPart.category || undefined,
    part_type: dbPart.part_type || 'inventory',
    
    // Pricing fields - handle various field names from database
    customerPrice: parseFloat(dbPart.customer_price) || unitPrice || undefined,
    supplierCost: parseFloat(dbPart.supplier_cost) || undefined,
    supplierSuggestedRetail: parseFloat(dbPart.retail_price || dbPart.supplier_suggested_retail_price) || undefined,
    markupPercentage: parseFloat(dbPart.markup_percentage) || undefined,
    
    // Additional properties
    supplierName: dbPart.supplier_name || undefined,
    isTaxable: Boolean(dbPart.is_taxable),
    coreChargeAmount: parseFloat(dbPart.core_charge_amount) || undefined,
    coreChargeApplied: Boolean(dbPart.core_charge_applied),
    ecoFee: parseFloat(dbPart.eco_fee) || undefined,
    ecoFeeApplied: Boolean(dbPart.eco_fee_applied),
    warrantyDuration: dbPart.warranty_duration || undefined,
    warrantyExpiryDate: dbPart.warranty_expiry_date || undefined,
    installDate: dbPart.install_date || undefined,
    installedBy: dbPart.installed_by || undefined,
    invoiceNumber: dbPart.invoice_number || undefined,
    poLine: dbPart.po_line || undefined,
    isStockItem: Boolean(dbPart.is_stock_item),
    supplierOrderRef: dbPart.supplier_order_ref || undefined,
    notesInternal: dbPart.notes_internal || undefined,
    inventoryItemId: dbPart.inventory_item_id || undefined,
    estimatedArrivalDate: dbPart.estimated_arrival_date || undefined,
    itemStatus: dbPart.item_status || undefined
  };
}

export function validatePartData(part: any): boolean {
  if (!part) return false;
  if (!part.id || typeof part.id !== 'string') return false;
  if (!part.work_order_id || typeof part.work_order_id !== 'string') return false;
  if (!part.name || typeof part.name !== 'string' || part.name.trim() === '') return false;
  if (!part.part_number || typeof part.part_number !== 'string' || part.part_number.trim() === '') return false;
  if (typeof part.quantity !== 'number' || part.quantity < 0) return false;
  if (typeof part.unit_price !== 'number' || part.unit_price < 0) return false;
  
  return true;
}

export function sanitizePartData(part: any): WorkOrderPart | null {
  try {
    const mappedPart = mapDatabasePartToWorkOrderPart(part);
    return validatePartData(mappedPart) ? mappedPart : null;
  } catch (error) {
    console.error('Error sanitizing part data:', error, part);
    return null;
  }
}
