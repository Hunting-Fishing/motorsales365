
import React, { useState } from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2 } from "lucide-react";

interface WorkOrderDescriptionFieldProps {
  form: any;
}

export const WorkOrderDescriptionField: React.FC<WorkOrderDescriptionFieldProps> = ({ form }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <FormField
      control={form.control}
      name="description"
      render={({ field }) => (
        <FormItem className="col-span-1 md:col-span-2">
          <div className="flex justify-between items-center">
            <FormLabel className="text-base">Work Order Description</FormLabel>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0"
            >
              {isExpanded ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </div>
          <FormControl>
            <Textarea
              placeholder="Describe the work to be performed in detail..."
              className={`resize-none transition-all duration-200 ${isExpanded ? 'min-h-[300px]' : 'min-h-[100px]'}`}
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
