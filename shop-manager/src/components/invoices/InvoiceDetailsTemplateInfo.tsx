
import { Badge } from "@/components/ui/badge";
import { FileCheck } from "lucide-react";

interface InvoiceDetailsTemplateInfoProps {
  templateName?: string;
}

export function InvoiceDetailsTemplateInfo({ templateName }: InvoiceDetailsTemplateInfoProps) {
  if (!templateName) return null;
  
  return (
    <div className="flex items-center gap-2 mb-2">
      <FileCheck className="h-4 w-4 text-slate-500" />
      <span className="text-sm text-slate-500">Created using template:</span>
      <Badge variant="secondary">{templateName}</Badge>
    </div>
  );
}
