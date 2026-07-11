import { useState } from 'react';
import { StaffMember, Invoice, InvoiceItem } from '@/types/invoice';
import { WorkOrder } from '@/types/workOrder';
import { InventoryItem } from '@/types/inventory';
import { v4 as uuidv4 } from 'uuid';
import { useTaxSettings } from '@/hooks/useTaxSettings';
import { useShopId } from '@/hooks/useShopId';

export function useInvoiceData(initialWorkOrderId?: string) {
  const { shopId } = useShopId();
  const { taxSettings } = useTaxSettings(shopId || undefined);
  const [invoice, setInvoice] = useState<Invoice>({
    id: uuidv4(),
    number: `INV-${Date.now().toString().slice(-6)}`,
    customer: '',
    customer_id: '', // Ensure this required field is set
    customer_address: '',
    customer_email: '',
    status: 'draft',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    date: new Date().toISOString().split('T')[0],
    description: '',
    payment_method: '',
    subtotal: 0,
    tax: 0,
    tax_rate: (taxSettings.parts_tax_rate || 8) / 100,
    total: 0,
    notes: '',
    work_order_id: initialWorkOrderId || '',
    created_by: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    assignedStaff: [],
    items: [] // Ensure this required field is set
  });
  
  const [items, setItems] = useState<InvoiceItem[]>([]);
  
  const [showWorkOrderDialog, setShowWorkOrderDialog] = useState(false);
  const [showInventoryDialog, setShowInventoryDialog] = useState(false);
  const [showStaffDialog, setShowStaffDialog] = useState(false);
  
  // Calculations
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const taxRate = invoice.tax_rate;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;
  
  // Functions to handle work orders
  const handleSelectWorkOrder = (workOrder: WorkOrder) => {
    // Update invoice with selected work order data
    setInvoice(prev => ({
      ...prev,
      customer: workOrder.customer || '',
      work_order_id: workOrder.id,
      description: `Services for ${workOrder.description || 'work order'}`
    }));
    
    // Add any inventory items from work order
    if (workOrder.inventoryItems && workOrder.inventoryItems.length > 0) {
      // Convert work order inventory items to invoice items
      const newItems = workOrder.inventoryItems.map(woItem => ({
        id: uuidv4(),
        name: woItem.name,
        description: `${woItem.name} (${woItem.sku})`,
        quantity: woItem.quantity,
        price: woItem.unit_price,
        total: woItem.quantity * woItem.unit_price,
        sku: woItem.sku,
        category: woItem.category
      } as InvoiceItem));
      
      setItems(prev => [...prev, ...newItems]);
    }
    
    setShowWorkOrderDialog(false);
  };
  
  // Functions to handle inventory items
  const handleAddInventoryItem = (inventoryItem: InventoryItem) => {
    const itemPrice = inventoryItem.price || inventoryItem.unit_price || 0;
    
    const newItem: InvoiceItem = {
      id: uuidv4(),
      name: inventoryItem.name,
      description: inventoryItem.description || inventoryItem.name,
      quantity: 1,
      price: itemPrice,
      total: itemPrice,
      sku: inventoryItem.sku,
      category: inventoryItem.category,
    };
    
    setItems(prev => [...prev, newItem]);
    setShowInventoryDialog(false);
  };
  
  // Functions to handle staff
  const handleAddStaffMember = (staffMember: StaffMember) => {
    const staffExists = invoice.assignedStaff?.some(s => s.id === staffMember.id);
    if (staffExists) return;
    
    setInvoice(prev => ({
      ...prev,
      assignedStaff: [...(prev.assignedStaff || []), staffMember]
    }));
    
    setShowStaffDialog(false);
  };
  
  const handleRemoveStaffMember = (staffId: string) => {
    setInvoice(prev => ({
      ...prev,
      assignedStaff: (prev.assignedStaff || []).filter(s => s.id !== staffId)
    }));
  };
  
  // Functions to handle invoice items
  const handleRemoveItem = (itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
  };
  
  const handleUpdateItemQuantity = (itemId: string, quantity: number) => {
    setItems(prev => 
      prev.map(item => 
        item.id === itemId ? { ...item, quantity, total: quantity * item.price } : item
      )
    );
  };
  
  const handleUpdateItemDescription = (itemId: string, description: string) => {
    setItems(prev => 
      prev.map(item => 
        item.id === itemId ? { ...item, description } : item
      )
    );
  };
  
  const handleUpdateItemPrice = (itemId: string, price: number) => {
    setItems(prev => 
      prev.map(item => 
        item.id === itemId ? { ...item, price, total: item.quantity * price } : item
      )
    );
  };
  
  // Add labor item
  const handleAddLaborItem = () => {
    const newItem: InvoiceItem = {
      id: uuidv4(),
      name: "Labor", // Add the required name field
      description: 'Labor',
      quantity: 1,
      price: 100,
      total: 100, // Calculate the total correctly
      hours: true
    };
    
    setItems(prev => [...prev, newItem]);
  };
  
  // Save invoice
  const handleSaveInvoice = async () => {
    try {
      // Update invoice with calculations and items
      const updatedInvoice: Invoice = {
        ...invoice,
        items,
        subtotal,
        tax,
        tax_rate: taxRate,
        total,
        updated_at: new Date().toISOString()
      };
      
      // Save to database code would go here
      console.log('Saving invoice:', updatedInvoice);
      
      return updatedInvoice;
    } catch (error) {
      console.error('Error saving invoice:', error);
      throw error;
    }
  };
  
  return {
    invoice,
    items,
    setInvoice,
    setItems,
    showWorkOrderDialog,
    showInventoryDialog,
    showStaffDialog,
    setShowWorkOrderDialog,
    setShowInventoryDialog,
    setShowStaffDialog,
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
    subtotal,
    tax,
    taxRate,
    total
  };
}
