
import { Download, FileText } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { exportToCSV, exportToExcel, exportToPDF } from "@/utils/export";
import { toast } from "@/components/ui/use-toast";
import { generateReportPdf, savePdf } from "@/utils/pdf";

interface ReportExportMenuProps {
  data: any[];
  title: string;
  columns: { header: string; dataKey: string }[];
  summaryData?: Record<string, any>; // Summary stats for the report
  chartImageUrl?: string; // Optional chart image URL (can be a base64 data URL)
  disabled?: boolean;
}

export function ReportExportMenu({ 
  data, 
  title, 
  columns, 
  summaryData,
  chartImageUrl,
  disabled = false 
}: ReportExportMenuProps) {
  const handleExport = (format: "csv" | "excel" | "pdf") => {
    try {
      if (data.length === 0) {
        toast({
          title: "No data to export",
          description: "There is no data available to export",
          variant: "destructive"
        });
        return;
      }

      switch (format) {
        case "csv":
          exportToCSV(data, title);
          break;
        case "excel":
          exportToExcel(data, title);
          break;
        case "pdf":
          // Use enhanced PDF generation
          const doc = generateReportPdf(title, data, columns, summaryData, chartImageUrl);
          savePdf(doc, title);
          break;
      }

      toast({
        title: "Export successful",
        description: `Report exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description: "There was an error exporting your report",
        variant: "destructive"
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2" disabled={disabled}>
          <Download className="h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("csv")} disabled={disabled}>
          <FileText className="mr-2 h-4 w-4" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("excel")} disabled={disabled}>
          <FileText className="mr-2 h-4 w-4" />
          Export as Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("pdf")} disabled={disabled}>
          <FileText className="mr-2 h-4 w-4" />
          Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
