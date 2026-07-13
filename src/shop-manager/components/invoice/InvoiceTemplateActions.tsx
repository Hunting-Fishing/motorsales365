
import React from 'react';
import { Button } from "@/components/ui/button";
import { useInvoiceTemplates } from "@/hooks/useInvoiceTemplates";
import { Invoice, InvoiceTemplate } from "@/types/invoice";
import { useTaxSettings } from "@/hooks/useTaxSettings";
import { useShopId } from "@/hooks/useShopId";

interface InvoiceTemplateActionsProps {
  invoice: Invoice;
  onApplyTemplate: (template: InvoiceTemplate) => void;
  onSaveTemplate: (template: Omit<InvoiceTemplate, "id" | "created_at" | "usage_count">) => Promise<void>;
}

export const InvoiceTemplateActions: React.FC<InvoiceTemplateActionsProps> = ({
  invoice,
  onApplyTemplate,
  onSaveTemplate
}) => {
  const { shopId } = useShopId();
  const { taxSettings } = useTaxSettings(shopId || undefined);
  
  const { 
    templates, 
    loading,
    error,
    createTemplate,
    saveAsTemplate,
    refetch
  } = useInvoiceTemplates();

  // Apply the selected template to the current invoice
  const handleApplyTemplate = (template: InvoiceTemplate) => {
    onApplyTemplate(template);
  };

  // Save the current invoice as a template
  const handleSaveAsTemplate = async (name: string, description: string) => {
    try {
      const templateData = {
        name,
        description,
        default_tax_rate: (taxSettings.parts_tax_rate || 8) / 100,
        default_due_date_days: 30,
        default_notes: invoice.notes || "",
        default_items: invoice.items || [],
        last_used: null
      };
      await onSaveTemplate(templateData);
    } catch (error) {
      console.error("Error saving template:", error);
    }
  };

  return (
    <div className="flex flex-col space-y-2">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => console.log("Open template selector")}
      >
        Apply Template
      </Button>
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => console.log("Open save template dialog")}
      >
        Save as Template
      </Button>
    </div>
  );
};

export default InvoiceTemplateActions;
