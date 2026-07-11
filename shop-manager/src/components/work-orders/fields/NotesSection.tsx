
import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";

interface NotesSectionProps {
  form: any;
}

export const NotesSection: React.FC<NotesSectionProps> = ({ form }) => {
  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Notes</h3>
      
      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Additional Notes</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Enter any additional details or instructions"
                className="min-h-[100px] bg-white"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};
