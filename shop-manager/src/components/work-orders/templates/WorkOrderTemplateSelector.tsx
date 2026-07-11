
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { WorkOrderTemplate } from "@/types/workOrder";

interface WorkOrderTemplateSelectorProps {
  templates: WorkOrderTemplate[];
  onTemplateSelect: (template: WorkOrderTemplate) => void;
  open: boolean;
  onClose: () => void;
}

export function WorkOrderSelector({
  templates,
  onTemplateSelect,
  open,
  onClose
}: WorkOrderTemplateSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredTemplates = templates.filter((template) =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Select Template</DialogTitle>
        </DialogHeader>
        
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="border rounded-md divide-y max-h-[400px] overflow-y-auto">
          {filteredTemplates.length > 0 ? (
            filteredTemplates.map((template) => (
              <div 
                key={template.id} 
                className="p-3 hover:bg-muted cursor-pointer"
                onClick={() => {
                  onTemplateSelect(template);
                  onClose();
                }}
              >
                <div className="font-medium">{template.name}</div>
                <div className="text-sm text-muted-foreground line-clamp-2">
                  {template.description || "No description"}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Used {template.usage_count} times • Last used: {template.last_used ? new Date(template.last_used).toLocaleDateString() : "Never"}
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-muted-foreground">
              No templates found
            </div>
          )}
        </div>
        
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
