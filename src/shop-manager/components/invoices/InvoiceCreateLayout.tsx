
import React from "react";
import { InvoiceHeader } from "@/components/invoices/InvoiceHeader";
import { InvoiceLeftColumn } from "@/components/invoices/layout/InvoiceLeftColumn";
import { InvoiceRightColumn } from "@/components/invoices/layout/InvoiceRightColumn";
import { 
  Invoice, 
  StaffMember, 
  InvoiceItem, 
  InvoiceTemplate,
  createInvoiceUpdater
} from "@/types/invoice";
import { WorkOrder } from "@/types/workOrder";
import { InventoryItem } from "@/types/inventory";

interface InvoiceCreateLayoutProps {
  invoice: Invoice;
  subtotal: number;
  tax: number;
  taxRate: number;
  total: number;
  items: InvoiceItem[];
  showWorkOrderDialog: boolean;
  showInventoryDialog: boolean;
  showStaffDialog: boolean;
  workOrders: WorkOrder[];
  inventoryItems: InventoryItem[];
  staffMembers: StaffMember[];
  templates: InvoiceTemplate[];
  setInvoice: (invoice: Invoice | ((prev: Invoice) => Invoice)) => void;
  setShowWorkOrderDialog: (show: boolean) => void;
  setShowInventoryDialog: (show: boolean) => void;
  setShowStaffDialog: (show: boolean) => void;
  handleSelectWorkOrder: (workOrder: WorkOrder) => void;
  handleAddInventoryItem: (item: InvoiceItem) => void;
  handleAddStaffMember: (staff: StaffMember) => void;
  handleRemoveStaffMember: (staffId: string) => void;
  handleRemoveItem: (id: string) => void;
  handleUpdateItemQuantity: (id: string, quantity: number) => void;
  handleUpdateItemDescription: (id: string, description: string) => void;
  handleUpdateItemPrice: (id: string, price: number) => void;
  handleAddLaborItem: () => void;
  handleSaveInvoice: (status: "draft" | "pending" | "paid" | "overdue" | "cancelled") => void;
  handleApplyTemplate: (template: InvoiceTemplate) => void;
  handleSaveTemplate: (template: Omit<InvoiceTemplate, "id" | "created_at" | "usage_count">) => Promise<void>;
  onTaxRateChange: (value: number) => void;
}

export function InvoiceCreateLayout({
  invoice,
  subtotal,
  tax,
  taxRate,
  total,
  items,
  showWorkOrderDialog,
  showInventoryDialog,
  showStaffDialog,
  workOrders,
  inventoryItems,
  staffMembers,
  templates,
  setInvoice,
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
  handleApplyTemplate,
  handleSaveTemplate,
  onTaxRateChange,
}: InvoiceCreateLayoutProps) {
  return (
    <div className="space-y-6">
      <InvoiceHeader 
        onSaveAsDraft={() => handleSaveInvoice("draft")}
        onCreateInvoice={() => handleSaveInvoice("pending")}
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <InvoiceLeftColumn 
          invoice={invoice}
          workOrders={workOrders}
          inventoryItems={inventoryItems}
          templates={templates}
          showWorkOrderDialog={showWorkOrderDialog}
          showInventoryDialog={showInventoryDialog}
          showStaffDialog={showStaffDialog}
          setShowWorkOrderDialog={setShowWorkOrderDialog}
          setShowInventoryDialog={setShowInventoryDialog}
          setShowStaffDialog={setShowStaffDialog}
          setInvoice={setInvoice}
          handleSelectWorkOrder={handleSelectWorkOrder}
          handleAddInventoryItem={handleAddInventoryItem}
          handleRemoveItem={handleRemoveItem}
          handleUpdateItemQuantity={handleUpdateItemQuantity}
          handleUpdateItemDescription={handleUpdateItemDescription}
          handleUpdateItemPrice={handleUpdateItemPrice}
          handleAddLaborItem={handleAddLaborItem}
          handleApplyTemplate={handleApplyTemplate}
          handleSaveTemplate={handleSaveTemplate}
        />
        
        <InvoiceRightColumn 
          createdBy={invoice.created_by || ""}
          assignedStaff={invoice.assignedStaff || []}
          staffMembers={staffMembers}
          subtotal={subtotal}
          taxRate={taxRate}
          tax={tax}
          total={total}
          showStaffDialog={showStaffDialog}
          setShowStaffDialog={setShowStaffDialog}
          onCreatedByChange={(value) => setInvoice(createInvoiceUpdater({ created_by: value }))}
          onAddStaffMember={handleAddStaffMember}
          onRemoveStaffMember={handleRemoveStaffMember}
          onTaxRateChange={onTaxRateChange}
        />
      </div>
    </div>
  );
}
