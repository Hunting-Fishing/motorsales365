
import { useInvoiceFormState } from "@/hooks/invoice/useInvoiceFormState";
import { useInvoiceTemplates } from "@/hooks/invoice/useInvoiceTemplates";
import { useInvoiceSave } from "@/hooks/invoice/useInvoiceSave";
import { useInvoiceTotals } from "@/hooks/invoice/useInvoiceTotals";
import { useInvoiceWorkOrder } from "@/hooks/invoice/useInvoiceWorkOrder";
import { StaffMember, Invoice, InvoiceTemplate, InvoiceItem } from "@/types/invoice";
import { InventoryItem } from "@/types/inventory";
import { useState } from "react";

export function useInvoiceForm(initialWorkOrderId?: string, initialInvoiceData?: Partial<Invoice>) {
  // Create local state for items and assignedStaff if not provided by useInvoiceFormState
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [assignedStaff, setAssignedStaff] = useState<StaffMember[]>([]);
  const [showWorkOrderDialog, setShowWorkOrderDialog] = useState(false);
  const [showInventoryDialog, setShowInventoryDialog] = useState(false);
  const [showStaffDialog, setShowStaffDialog] = useState(false);
  
  // Use form state hook with correct typing and initial data
  const initialData = initialInvoiceData || (initialWorkOrderId ? { work_order_id: initialWorkOrderId } : {});
  const {
    invoice,
    setInvoice,
  } = useInvoiceFormState(initialData);

  // Add handlers for item management
  const handleAddInventoryItem = (item: InvoiceItem) => {
    setItems(prev => [...prev, item]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleUpdateItemQuantity = (id: string, quantity: number) => {
    setItems(prev => 
      prev.map(item => item.id === id ? { ...item, quantity } : item)
    );
  };

  const handleUpdateItemDescription = (id: string, description: string) => {
    setItems(prev => 
      prev.map(item => item.id === id ? { ...item, description } : item)
    );
  };

  const handleUpdateItemPrice = (id: string, price: number) => {
    setItems(prev => 
      prev.map(item => item.id === id ? { ...item, price } : item)
    );
  };

  const handleAddLaborItem = () => {
    const newItem: InvoiceItem = {
      id: crypto.randomUUID(),
      name: "Labor",
      description: "Labor",
      quantity: 1,
      price: 0,
      total: 0,
      hours: true
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleAddStaffMember = (staff: StaffMember) => {
    setAssignedStaff(prev => [...prev, staff]);
  };

  const handleRemoveStaffMember = (staffId: string) => {
    setAssignedStaff(prev => prev.filter(s => s.id !== staffId));
  };

  // Use invoice templates hook
  const { 
    templates,
    createTemplate,
    saveTemplate
  } = useInvoiceTemplates();

  // Create wrapper functions for the template operations
  const handleApplyTemplate = (template: InvoiceTemplate) => {
    setInvoice(prev => ({
      ...prev,
      items: template.default_items || [],
      notes: template.default_notes || prev.notes,
      tax_rate: template.default_tax_rate || prev.tax_rate
    }));
  };
  
  const handleSaveTemplate = (templateData: Omit<InvoiceTemplate, "id" | "created_at" | "usage_count">) => {
    return saveTemplate(templateData);
  };

  // Use invoice totals hook with customer information
  const totalsResult = useInvoiceTotals({
    items,
    customer: (typeof invoice.customer === 'object' ? invoice.customer : null)
  });
  const { subtotal, tax, total, taxRate } = totalsResult;
  
  const onTaxRateChange = (newRate: number) => {
    console.log("Tax rate changed to:", newRate);
  };

  // Use invoice save hook
  const { 
    saveInvoice,
    isSaving
  } = useInvoiceSave();

  // Wrap the save invoice function to include all required data
  const handleSaveInvoice = (status: "draft" | "pending" | "paid" | "overdue" | "cancelled") => {
    // Create a complete invoice object with items and staff
    const completeInvoice: Invoice = {
      ...invoice,
      items: items,
      assignedStaff: assignedStaff,
      status: status
    };
    
    // Pass the complete invoice to the save function
    saveInvoice(completeInvoice, status);
  };

  // Handle selecting a work order
  const { handleSelectWorkOrder: selectWorkOrder } = useInvoiceWorkOrder();

  // Create a wrapper for selectWorkOrder
  const handleSelectWorkOrder = (workOrder: any) => {
    if (!workOrder) return;
    
    const workOrderUpdates = selectWorkOrder(workOrder);
    
    setInvoice((prev: Invoice) => {
      return {
        ...prev,
        work_order_id: workOrderUpdates.workOrderId,
        customer: workOrderUpdates.customer,
        customer_address: workOrderUpdates.customerAddress,
      };
    });
    
    // Update assigned staff if provided
    if (Array.isArray(workOrderUpdates.assignedStaff)) {
      setAssignedStaff(
        workOrderUpdates.assignedStaff.map((staff: any) => {
          if (typeof staff === 'string') {
            return { id: crypto.randomUUID(), name: staff, role: '' };
          }
          return staff as StaffMember;
        })
      );
    }
    
    setShowWorkOrderDialog(false);
  };

  return {
    // Form state
    invoice,
    subtotal,
    tax,
    taxRate,
    total,
    isSubmitting: isSaving,
    items,
    assignedStaff,
    
    // Dialog states
    showWorkOrderDialog,
    showInventoryDialog,
    showStaffDialog,
    
    // Templates
    templates,
    
    // Setters
    setInvoice,
    setShowWorkOrderDialog,
    setShowInventoryDialog,
    setShowStaffDialog,
    
    // Event handlers
    handleSelectWorkOrder,
    handleAddInventoryItem,
    handleAddStaffMember,
    handleRemoveStaffMember,
    handleRemoveItem,
    handleUpdateItemQuantity,
    handleUpdateItemDescription,
    handleUpdateItemPrice,
    handleAddLaborItem,
    handleSaveInvoice,
    handleApplyTemplate,
    handleSaveTemplate,
    onTaxRateChange,
  };
}
