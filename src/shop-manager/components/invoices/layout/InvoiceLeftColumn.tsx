
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StaffMember, Invoice, InvoiceTemplate, InvoiceItem } from "@/types/invoice";
import { WorkOrder } from "@/types/workOrder";
import { InventoryItem } from "@/types/inventory";
import { useTaxSettings } from "@/hooks/useTaxSettings";
import { useShopId } from "@/hooks/useShopId";

interface InvoiceLeftColumnProps {
  invoice: Invoice;
  workOrders: WorkOrder[];
  inventoryItems: InventoryItem[];
  templates: InvoiceTemplate[];
  showWorkOrderDialog: boolean;
  showInventoryDialog: boolean;
  showStaffDialog: boolean;
  setInvoice: (invoice: Invoice | ((prev: Invoice) => Invoice)) => void;
  setShowWorkOrderDialog: (show: boolean) => void;
  setShowInventoryDialog: (show: boolean) => void;
  setShowStaffDialog: (show: boolean) => void;
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

export function InvoiceLeftColumn({ 
  invoice, 
  workOrders,
  inventoryItems,
  templates,
  showWorkOrderDialog,
  showInventoryDialog,
  showStaffDialog,
  setInvoice,
  setShowWorkOrderDialog,
  setShowInventoryDialog,
  setShowStaffDialog,
  handleSelectWorkOrder,
  handleAddInventoryItem,
  handleRemoveItem,
  handleUpdateItemQuantity,
  handleUpdateItemDescription,
  handleUpdateItemPrice,
  handleAddLaborItem,
  handleApplyTemplate,
  handleSaveTemplate
}: InvoiceLeftColumnProps) {
  const { shopId } = useShopId();
  const { taxSettings } = useTaxSettings(shopId || undefined);
  const handleInvoiceChange = (field: string, value: any) => {
    setInvoice(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveAsTemplate = () => {
    const templateName = prompt("Enter template name:");
    const templateDescription = prompt("Enter template description:");
    
    if (templateName) {
      const templateData = {
        name: templateName,
        description: templateDescription || "",
        default_items: invoice.items || [],
        default_tax_rate: invoice.tax_rate || (taxSettings.parts_tax_rate || 8) / 100,
        default_notes: invoice.notes || "",
        default_due_date_days: 30,
        last_used: null
      };
      
      handleSaveTemplate(templateData);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customer">Customer Name</Label>
            <Input
              id="customer"
              value={invoice.customer}
              onChange={(e) => handleInvoiceChange('customer', e.target.value)}
              placeholder="Enter customer name"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="customer_email">Customer Email</Label>
            <Input
              id="customer_email"
              type="email"
              value={invoice.customer_email || ''}
              onChange={(e) => handleInvoiceChange('customer_email', e.target.value)}
              placeholder="Enter customer email"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="customer_address">Customer Address</Label>
            <Textarea
              id="customer_address"
              value={invoice.customer_address || ''}
              onChange={(e) => handleInvoiceChange('customer_address', e.target.value)}
              placeholder="Enter customer address"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={invoice.description || ''}
              onChange={(e) => handleInvoiceChange('description', e.target.value)}
              placeholder="Enter invoice description"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={invoice.notes || ''}
              onChange={(e) => handleInvoiceChange('notes', e.target.value)}
              placeholder="Enter invoice notes"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Template Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={handleSaveAsTemplate} variant="outline" className="w-full">
            Save as Template
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
