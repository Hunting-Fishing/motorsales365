
import { Invoice, InvoiceItem, InvoiceTemplate } from "@/types/invoice";
import { WorkOrder } from "@/types/workOrder";
import { InventoryItem } from "@/types/inventory";

export interface InvoiceTemplateActionsProps {
  invoice: Invoice;
  taxRate: number;
  templates: InvoiceTemplate[];
  onSelectTemplate: (template: InvoiceTemplate) => void;
  onSaveTemplate: (template: Partial<InvoiceTemplate>) => Promise<void>;
}

export interface WorkOrderSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectWorkOrder: (workOrder: WorkOrder) => void;
  workOrders: WorkOrder[];
}

export interface InventoryItemSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: InventoryItem) => void;
  inventoryItems: InventoryItem[];
  templates?: InvoiceTemplate[];
  onApplyTemplate?: (template: InvoiceTemplate) => void;
}

export interface InvoiceItemsTableProps {
  items: InvoiceItem[];
  onRemoveItem: (id: string) => void;
  onUpdateItemQuantity: (id: string, quantity: number) => void;
  onUpdateItemDescription: (id: string, description: string) => void;
  onUpdateItemPrice: (id: string, price: number) => void;
}

export interface InvoiceRightColumnProps {
  createdBy: string;
  assignedStaff: any[];
  staffMembers: any[];
  subtotal: number;
  taxRate: number;
  tax: number;
  total: number;
  showStaffDialog: boolean;
  setShowStaffDialog: (show: boolean) => void;
  onCreatedByChange: (value: any) => void;
  onAddStaffMember: (staff: any) => void;
  onRemoveStaffMember: (staffId: string) => void;
  onTaxRateChange: (value: number) => void;
}

export interface InvoiceLeftColumnProps {
  invoice: Invoice;
  workOrders: WorkOrder[];
  inventoryItems: InventoryItem[];
  templates: InvoiceTemplate[];
  showWorkOrderDialog: boolean;
  showInventoryDialog: boolean;
  showStaffDialog: boolean;
  setShowStaffDialog: (show: boolean) => void;
  setInvoice: (invoice: Invoice | ((prev: Invoice) => Invoice)) => void;
  setShowWorkOrderDialog: (show: boolean) => void;
  setShowInventoryDialog: (show: boolean) => void;
  handleSelectWorkOrder: (workOrder: WorkOrder) => void;
  handleAddInventoryItem: (item: InvoiceItem) => void;
  handleRemoveItem: (id: string) => void;
  handleUpdateItemQuantity: (id: string, quantity: number) => void;
  handleUpdateItemDescription: (id: string, description: string) => void;
  handleUpdateItemPrice: (id: string, price: number) => void;
  handleAddLaborItem: () => void;
  handleApplyTemplate: (template: InvoiceTemplate) => void;
  handleSaveTemplate: (template: Omit<InvoiceTemplate, "id" | "created_at" | "usage_count">) => Promise<void>;
}
