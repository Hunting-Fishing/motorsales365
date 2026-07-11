
import { Separator } from "@/components/ui/separator";
import { InvoiceDetailsCompanyInfo } from "./InvoiceDetailsCompanyInfo";
import { InvoiceDetailsCustomerInfo } from "./InvoiceDetailsCustomerInfo";
import { InvoiceDetailsItemsTable } from "./InvoiceDetailsItemsTable";
import { InvoiceDetailsNotes } from "./InvoiceDetailsNotes";
import { InvoiceDetailsPaymentInfo } from "./InvoiceDetailsPaymentInfo";
import { useShopName } from "@/hooks/useShopName";
import { Invoice } from "@/types/invoice";

interface InvoiceDetailsContentProps {
  invoice: Invoice & { 
    subtotal: number;
    tax: number;
    total: number;
    hours?: boolean;
    paymentMethod: string;
    customer_id?: string;
  };
  statusStyles: {
    [key: string]: { label: string; classes: string };
  };
}

export function InvoiceDetailsContent({
  invoice,
  statusStyles,
}: InvoiceDetailsContentProps) {
  const { shopName } = useShopName();
  
  const companyInfo = {
    companyName: shopName || "All Business 365",
    companyDescription: "Work Order System",
    companyAddress: "123 Main Street, Anytown, CA 12345",
    companyPhone: "(555) 123-4567",
    companyEmail: "billing@allbusiness365.com",
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 max-w-5xl mx-auto">
      {/* Invoice header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">INVOICE</h2>
          <p className="text-slate-500">{invoice.id}</p>
          <div className="mt-4">
            <p className="font-medium">Date Issued: {invoice.issue_date}</p>
            <p className="font-medium">Due Date: {invoice.due_date}</p>
          </div>
        </div>
        
        <InvoiceDetailsCompanyInfo 
          companyName={companyInfo.companyName}
          companyDescription={companyInfo.companyDescription}
          companyAddress={companyInfo.companyAddress}
          companyPhone={companyInfo.companyPhone}
          companyEmail={companyInfo.companyEmail}
        />
      </div>
      
      <Separator className="my-6" />
      
      {/* Customer info and work order reference */}
      <InvoiceDetailsCustomerInfo 
        customer={invoice.customer}
        customerAddress={invoice.customer_address}
        customerEmail={invoice.customer_email}
        workOrderId={invoice.work_order_id}
        description={invoice.description || ""}
      />
      
      {/* Items table */}
      <InvoiceDetailsItemsTable 
        items={invoice.items || []}
        subtotal={invoice.subtotal}
        tax={invoice.tax}
        total={invoice.total}
      />
      
      {/* Notes */}
      <InvoiceDetailsNotes notes={invoice.notes} />
      
      {/* Payment information */}
      <InvoiceDetailsPaymentInfo 
        paymentMethod={invoice.paymentMethod || "N/A"}
        status={invoice.status}
        statusLabel={statusStyles[invoice.status as keyof typeof statusStyles].label}
        createdBy={invoice.created_by || ""}
        customerId={invoice.customer_id}
      />
      
      {/* Footer */}
      <div className="mt-8 text-center text-sm text-slate-500">
        <p>Thank you for your business!</p>
      </div>
    </div>
  );
}
