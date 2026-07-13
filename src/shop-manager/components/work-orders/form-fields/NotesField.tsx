
import React from "react";
import { UseFormReturn } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { WorkOrderFormSchemaValues } from "@/schemas/workOrderSchema";
import { FileText, Lightbulb } from "lucide-react";

interface NotesFieldProps {
  form: UseFormReturn<WorkOrderFormSchemaValues>;
}

export const NotesField: React.FC<NotesFieldProps> = ({ form }) => {
  return (
    <div className="bg-gradient-to-br from-white via-slate-50/50 to-blue-50/30 p-8 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg">
          <FileText className="h-5 w-5 text-white" />
        </div>
        <h3 className="text-xl font-semibold text-slate-900">Additional Notes</h3>
      </div>
      
      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem className="space-y-4">
            <FormLabel className="text-slate-800 font-semibold text-base flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              Internal Notes & Instructions
            </FormLabel>
            <FormControl>
              <Textarea 
                placeholder="Add any internal notes, special instructions, customer requests, or important details that will help technicians complete this work order effectively..."
                className="min-h-[120px] bg-white/80 border-slate-300 text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 resize-none"
                {...field} 
              />
            </FormControl>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
              <span>These notes are internal and won't be visible to customers</span>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};
