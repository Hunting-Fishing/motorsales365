
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InvoiceTemplate } from "@/types/invoice";
import { FileBox } from "lucide-react";

interface InvoiceTemplateSelectorProps {
  templates: InvoiceTemplate[];
  onSelectTemplate: (template: InvoiceTemplate) => void;
}

export function InvoiceTemplateSelector({ 
  templates, 
  onSelectTemplate 
}: InvoiceTemplateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <FileBox className="h-4 w-4 mr-2" />
          Templates
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>Apply Template</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-72">
          {templates.length === 0 ? (
            <div className="px-2 py-3 text-sm text-muted-foreground text-center">
              No templates available
            </div>
          ) : (
            templates.map((template) => (
              <DropdownMenuItem
                key={template.id}
                className="cursor-pointer"
                onClick={() => {
                  onSelectTemplate(template);
                  setIsOpen(false);
                }}
              >
                <div className="flex flex-col w-full">
                  <span className="font-medium">{template.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {template.description}
                  </span>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
