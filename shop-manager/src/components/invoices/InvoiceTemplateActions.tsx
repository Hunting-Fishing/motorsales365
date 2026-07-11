
import { InvoiceTemplateDialog } from "./InvoiceTemplateDialog";
import { SaveTemplateDialog } from "./SaveTemplateDialog";
import { Invoice, InvoiceTemplate } from "@/types/invoice";

interface InvoiceTemplateActionsProps {
  invoice: Invoice;
  taxRate: number;
  templates: InvoiceTemplate[];
  onSelectTemplate: (template: InvoiceTemplate) => void;
  onSaveTemplate: (template: Omit<InvoiceTemplate, 'id' | 'createdAt' | 'usageCount'>) => void;
}

export function InvoiceTemplateActions({
  invoice,
  taxRate,
  templates,
  onSelectTemplate,
  onSaveTemplate
}: InvoiceTemplateActionsProps) {
  return (
    <div className="flex gap-2">
      <InvoiceTemplateDialog 
        templates={templates} 
        onSelectTemplate={onSelectTemplate} 
      />
      <SaveTemplateDialog 
        currentInvoice={invoice} 
        taxRate={taxRate}
        onSaveTemplate={onSaveTemplate} 
      />
    </div>
  );
}
