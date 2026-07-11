
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InvoiceTemplate } from "@/types/invoice";
import { format } from "date-fns";
import { CalendarPlus } from "lucide-react";

interface InvoiceTemplateDialogProps {
  templates: InvoiceTemplate[];
  onSelectTemplate: (template: InvoiceTemplate) => void;
}

export function InvoiceTemplateDialog({
  templates,
  onSelectTemplate,
}: InvoiceTemplateDialogProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (template: InvoiceTemplate) => {
    onSelectTemplate(template);
    setOpen(false);
  };

  if (!templates || templates.length === 0) {
    return null;
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="flex items-center"
        onClick={() => setOpen(true)}
      >
        <CalendarPlus className="mr-2 h-4 w-4" />
        Use Template
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Select Invoice Template</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4 max-h-[60vh] overflow-y-auto">
            {templates.map((template) => (
              <div
                key={template.id}
                className="border rounded-lg p-4 hover:border-blue-500 cursor-pointer transition-colors"
                onClick={() => handleSelect(template)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{template.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {template.description || "No description"}
                    </p>
                    <div className="text-xs text-muted-foreground mt-2">
                      {template.default_items?.length || 0} items included
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">
                      Used {template.usage_count || 0} times
                    </div>
                    {template.last_used && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Last used:{" "}
                        {format(new Date(template.last_used), "MMM d, yyyy")}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {templates.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No templates found. Save an invoice as a template first.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
