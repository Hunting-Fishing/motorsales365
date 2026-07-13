
import React from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/use-toast";

interface TimeEntryExportMenuProps {
  onExport: (format: "csv" | "excel" | "pdf") => void;
}

export function TimeEntryExportMenu({ onExport }: TimeEntryExportMenuProps) {
  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export Time Entries
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onExport("csv")}>
            Export as CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onExport("excel")}>
            Export as Excel
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onExport("pdf")}>
            Export as PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
