
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowLeft, Edit, Printer, Send } from "lucide-react";
import { InvoiceExportMenu } from "./InvoiceExportMenu";
import { Invoice } from "@/types/invoice";
import { toast } from "@/components/ui/use-toast";

interface InvoiceDetailsHeaderProps {
  invoiceId: string;
  status: string;
  statusStyles: {
    [key: string]: { label: string; classes: string };
  };
  invoice: Invoice & { 
    subtotal: number;
    tax: number;
    total: number;
    paymentMethod?: string;
  };
}

export function InvoiceDetailsHeader({
  invoiceId,
  status,
  statusStyles,
  invoice,
}: InvoiceDetailsHeaderProps) {
  const handleEmailInvoice = () => {
    toast({
      title: "Email sent",
      description: `Invoice ${invoiceId} has been emailed to the customer.`,
    });
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" asChild>
          <Link to="/invoices">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Invoice {invoiceId}</h1>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[status].classes}`}>
          {statusStyles[status].label}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button 
          variant="outline" 
          className="flex items-center gap-1"
          onClick={handleEmailInvoice}
        >
          <Send className="h-4 w-4" />
          Email
        </Button>
        <Button 
          variant="outline" 
          className="flex items-center gap-1"
          onClick={handlePrintInvoice}
        >
          <Printer className="h-4 w-4" />
          Print
        </Button>
        <InvoiceExportMenu invoice={invoice} />
        <Button asChild variant="default" className="flex items-center gap-1 bg-esm-blue-600 hover:bg-esm-blue-700">
          <Link to={`/invoices/${invoiceId}/edit`}>
            <Edit className="h-4 w-4" />
            Edit
          </Link>
        </Button>
      </div>
    </div>
  );
}
