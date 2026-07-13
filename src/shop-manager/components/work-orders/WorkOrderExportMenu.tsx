
import { Download, FileText } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { exportToCSV, exportToExcel, exportMultiSheetExcel } from "@/utils/export";
import { toast } from "@/components/ui/use-toast";
import { WorkOrder, TimeEntry } from "@/types/workOrder";
import { generateWorkOrderPdf, savePdf } from "@/utils/pdf";

interface WorkOrderExportMenuProps {
  workOrder: WorkOrder;
}

export function WorkOrderExportMenu({ workOrder }: WorkOrderExportMenuProps) {
  const handleExport = (format: "csv" | "excel" | "pdf") => {
    try {
      // Prepare data for export
      const exportData = {
        id: workOrder.id,
        customer: workOrder.customer || 'N/A',
        description: workOrder.description,
        status: workOrder.status,
        priority: workOrder.priority || 'medium',
        date: workOrder.created_at || 'N/A',
        dueDate: workOrder.due_date || 'N/A',
        technician: workOrder.technician_id || 'N/A',
        location: workOrder.location || 'N/A',
        notes: workOrder.notes || "N/A",
        totalBillableTime: workOrder.total_billable_time 
          ? workOrder.total_billable_time
          : "N/A"
      };
      
      // Format time entries data if they exist
      const timeEntriesData = workOrder.timeEntries ? workOrder.timeEntries.map(entry => ({
        employeeName: entry.employee_name,
        startTime: entry.start_time ? new Date(entry.start_time).toLocaleString() : 'N/A',
        endTime: entry.end_time ? new Date(entry.end_time).toLocaleString() : 'Ongoing',
        duration: entry.duration || 0,
        notes: entry.notes || '',
        billable: entry.billable ? 'Yes' : 'No'
      })) : [];
      
      // Format inventory items if they exist
      const inventoryItemsData = workOrder.inventory_items ? workOrder.inventory_items.map(item => ({
        name: item.name,
        sku: item.sku,
        category: item.category,
        quantity: item.quantity,
        unitPrice: item.unit_price.toFixed(2),
        total: (item.quantity * item.unit_price).toFixed(2)
      })) : [];
      
      switch (format) {
        case "csv":
          exportToCSV([exportData], `WorkOrder_${workOrder.id}`);
          break;
        case "excel":
          // Create a workbook with multiple sheets
          const workbookData: Record<string, any[]> = {
            "Work Order": [exportData]
          };
          
          // Add time entries sheet if there are any
          if (timeEntriesData.length > 0) {
            workbookData["Time Entries"] = timeEntriesData;
          }
          
          // Add inventory items sheet if there are any
          if (inventoryItemsData.length > 0) {
            workbookData["Inventory Items"] = inventoryItemsData;
          }
          
          exportMultiSheetExcel(workbookData, `WorkOrder_${workOrder.id}`);
          break;
        case "pdf":
          // Use our enhanced PDF generator
          const doc = generateWorkOrderPdf(workOrder);
          savePdf(doc, `WorkOrder_${workOrder.id}`);
          break;
      }

      toast({
        title: "Export successful",
        description: `Work order exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description: "There was an error exporting your work order",
        variant: "destructive"
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("csv")}>
          <FileText className="mr-2 h-4 w-4" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("excel")}>
          <FileText className="mr-2 h-4 w-4" />
          Export as Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("pdf")}>
          <FileText className="mr-2 h-4 w-4" />
          Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
