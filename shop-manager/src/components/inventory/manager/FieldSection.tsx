
import React from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { FieldDefinition } from "./InventoryFieldManager";

interface FieldSectionProps {
  title: string;
  description: string;
  fields: FieldDefinition[];
  onToggle: (fieldId: string) => void;
}

export function FieldSection({ title, description, fields, onToggle }: FieldSectionProps) {
  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h3 className="text-lg font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {fields.map((field) => (
          <div key={field.id} className="flex items-center justify-between space-x-2 p-3 bg-muted/40 rounded-md">
            <div className="flex items-center">
              <Label htmlFor={field.id} className="text-sm font-medium mr-2">
                {field.label}
              </Label>
              
              {field.description && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">{field.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {field.isRequired ? "Required" : "Optional"}
              </span>
              <Switch
                id={field.id}
                checked={field.isRequired}
                onCheckedChange={() => onToggle(field.id)}
                className={field.isRequired ? "data-[state=checked]:bg-green-500" : ""}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
