
import { exportToCSV, exportToExcel, exportMultiSheetExcel } from "@/utils/export";
import { toast } from "@/components/ui/use-toast";
import { Invoice } from "@/types/invoice";
import { ExportMenuBase } from "./ExportMenuBase";

interface InvoiceExportMenuProps {
  invoice: Invoice;
}

export function InvoiceExportMenu({ invoice }: InvoiceExportMenuProps) {
  const handleExport = (format: "csv" | "excel" | "pdf") => {
    console.log(`Exporting invoice as ${format}`);
    
    // Prepare invoice data for export
    const exportData = {
      id: invoice.id,
      customer: invoice.customer,
      description: invoice.description || "",
      total: invoice.total ? `$${invoice.total.toFixed(2)}` : "$0.00",
      status: invoice.status,
      date: invoice.date,
      dueDate: invoice.due_date,
      subtotal: invoice.subtotal ? `$${invoice.subtotal.toFixed(2)}` : "$0.00",
      tax: invoice.tax ? `$${invoice.tax.toFixed(2)}` : "$0.00",
      workOrderId: invoice.work_order_id || "N/A",
      paymentMethod: invoice.payment_method || "N/A"
    };
    
    // Prepare items data
    const itemsData = invoice.items ? invoice.items.map(item => ({
      name: item.name,
      description: item.description || "",
      quantity: item.quantity,
      price: `$${item.price.toFixed(2)}`,
      total: `$${item.total.toFixed(2)}`,
      hours: item.hours ? "Yes" : "No"
    })) : [];
    
    try {
      switch (format) {
        case "csv":
          exportToCSV([exportData], `Invoice_${invoice.id}`);
          break;
        case "excel":
          // Create a workbook with invoice details and items
          const workbookData: Record<string, any[]> = {
            "Invoice Details": [exportData],
            "Line Items": itemsData
          };
          
          exportMultiSheetExcel(workbookData, `Invoice_${invoice.id}`);
          break;
        case "pdf":
          // For PDF, we'll call a special function in a separate module
          // This would be implemented in a PDF service
          window.print(); // Simple solution for now
          break;
      }

      toast({
        title: "Export successful",
        description: `Invoice exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description: "There was an error exporting your invoice",
        variant: "destructive"
      });
    }
  };

  return <ExportMenuBase onExport={handleExport} />;
}
