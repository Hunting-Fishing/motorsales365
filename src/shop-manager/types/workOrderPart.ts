
export interface WorkOrderPart {
  id: string;
  work_order_id: string;
  job_line_id?: string;
  part_number: string;
  name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  
  // Core part properties
  category?: string;
  part_type: string;
  
  // Pricing fields
  customerPrice?: number;
  supplierCost?: number;
  supplierSuggestedRetail?: number;
  markupPercentage?: number;
  
  // Additional properties
  isTaxable?: boolean;
  coreChargeAmount?: number;
  coreChargeApplied?: boolean;
  ecoFee?: number;
  ecoFeeApplied?: boolean;
  warrantyDuration?: string;
  warrantyExpiryDate?: string;
  installDate?: string;
  installedBy?: string;
  invoiceNumber?: string;
  poLine?: string;
  isStockItem?: boolean;
  supplierName?: string;
  supplierOrderRef?: string;
  notesInternal?: string;
  inventoryItemId?: string;
  estimatedArrivalDate?: string;
  itemStatus?: string;
}

export interface WorkOrderPartFormValues {
  name: string;
  part_number: string;
  description?: string;
  quantity: number;
  unit_price: number;
  total_price?: number;
  status: string;
  notes?: string;
  job_line_id?: string;
  category?: string;
  category_id?: string;
  part_type: string;
  
  // Optional extended fields
  customerPrice?: number;
  supplierCost?: number;
  supplierSuggestedRetail?: number;
  markupPercentage?: number;
  isTaxable?: boolean;
  coreChargeAmount?: number;
  coreChargeApplied?: boolean;
  ecoFee?: number;
  ecoFeeApplied?: boolean;
  warrantyDuration?: string;
  warrantyExpiryDate?: string;
  installDate?: string;
  installedBy?: string;
  invoiceNumber?: string;
  poLine?: string;
  isStockItem?: boolean;
  supplierName?: string;
  supplier_id?: string;
  supplierOrderRef?: string;
  notesInternal?: string;
  inventoryItemId?: string;
  estimatedArrivalDate?: string;
  itemStatus?: string;
}

// Work Order Part Statuses - ensure no empty values
export const WORK_ORDER_PART_STATUSES = [
  'pending',
  'ordered',
  'received', 
  'installed',
  'returned',
  'backordered',
  'defective',
  'quote-requested',
  'quote-received',
  'approved',
  'declined',
  'warranty-claim',
  'core-exchange',
  'special-order',
  'discontinued'
] as const;

export type WorkOrderPartStatus = typeof WORK_ORDER_PART_STATUSES[number];

// Part Types - ensure no empty values
export const PART_TYPES = [
  'inventory',
  'non-inventory'
] as const;

export type PartType = typeof PART_TYPES[number];

// Status mapping for UI display
export const partStatusMap: Record<string, { label: string; classes: string }> = {
  'pending': { label: 'Pending', classes: 'bg-yellow-100 text-yellow-800' },
  'ordered': { label: 'Ordered', classes: 'bg-blue-100 text-blue-800' },
  'received': { label: 'Received', classes: 'bg-purple-100 text-purple-800' },
  'installed': { label: 'Installed', classes: 'bg-green-100 text-green-800' },
  'returned': { label: 'Returned', classes: 'bg-red-100 text-red-800' },
  'backordered': { label: 'Backordered', classes: 'bg-orange-100 text-orange-800' },
  'defective': { label: 'Defective', classes: 'bg-red-200 text-red-900' },
  'quote-requested': { label: 'Quote Requested', classes: 'bg-indigo-100 text-indigo-800' },
  'quote-received': { label: 'Quote Received', classes: 'bg-cyan-100 text-cyan-800' },
  'approved': { label: 'Approved', classes: 'bg-emerald-100 text-emerald-800' },
  'declined': { label: 'Declined', classes: 'bg-gray-100 text-gray-800' },
  'warranty-claim': { label: 'Warranty Claim', classes: 'bg-pink-100 text-pink-800' },
  'core-exchange': { label: 'Core Exchange', classes: 'bg-amber-100 text-amber-800' },
  'special-order': { label: 'Special Order', classes: 'bg-violet-100 text-violet-800' },
  'discontinued': { label: 'Discontinued', classes: 'bg-slate-100 text-slate-800' }
};
