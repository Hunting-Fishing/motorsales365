
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InvoiceTemplate } from "@/types/invoice";

export interface TemplateSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (template: InvoiceTemplate) => void;
  templates: InvoiceTemplate[];
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  open,
  onClose,
  onSelect,
  templates
}) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Invoice Template</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          {templates.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No templates available.</p>
          ) : (
            <div className="space-y-2">
              {templates.map((template) => (
                <div 
                  key={template.id}
                  onClick={() => onSelect(template)}
                  className="p-3 border rounded-md cursor-pointer hover:bg-muted"
                >
                  <div className="flex justify-between">
                    <span className="font-medium">{template.name}</span>
                    <span className="text-sm text-muted-foreground">Used {template.usage_count} times</span>
                  </div>
                  <p className="text-sm truncate">{template.description || 'No description'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
