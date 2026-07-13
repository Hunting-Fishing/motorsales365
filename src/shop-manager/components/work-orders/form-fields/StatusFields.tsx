
import React from "react";
import { UseFormReturn } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { WorkOrderFormSchemaValues } from "@/schemas/workOrderSchema";
import { WORK_ORDER_STATUSES } from "@/data/workOrderConstants";
import { Clock, AlertTriangle, CheckCircle2 } from "lucide-react";

interface StatusFieldsProps {
  form: UseFormReturn<WorkOrderFormSchemaValues>;
}

export const StatusFields: React.FC<StatusFieldsProps> = ({ form }) => {
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'low': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      default: return <Clock className="h-4 w-4 text-slate-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-200 bg-red-50/80';
      case 'medium': return 'border-yellow-200 bg-yellow-50/80';
      case 'low': return 'border-green-200 bg-green-50/80';
      default: return 'border-slate-200 bg-slate-50/80';
    }
  };

  const currentPriority = form.watch('priority');

  return (
    <div className={`bg-white/80 backdrop-blur-sm p-8 rounded-xl border-2 transition-colors duration-200 shadow-sm hover:shadow-md ${getPriorityColor(currentPriority)}`}>
      <div className="flex items-center gap-3 mb-6">
        {getPriorityIcon(currentPriority)}
        <h3 className="text-xl font-semibold text-slate-900">Status & Priority</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Status Field */}
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel className="text-slate-800 font-semibold text-base flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                Status
              </FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="h-12 bg-white/80 border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-white border-slate-200 shadow-xl rounded-lg">
                  {WORK_ORDER_STATUSES.map((status) => (
                    <SelectItem 
                      key={status.value} 
                      value={status.value} 
                      className="hover:bg-blue-50 focus:bg-blue-100 text-slate-900 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="text-xs">
                          {status.label}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Priority Field */}
        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel className="text-slate-800 font-semibold text-base flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                Priority
              </FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="h-12 bg-white/80 border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-white border-slate-200 shadow-xl rounded-lg">
                  <SelectItem value="low" className="hover:bg-green-50 focus:bg-green-100 text-slate-900 py-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>Low Priority</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="medium" className="hover:bg-yellow-50 focus:bg-yellow-100 text-slate-900 py-3">
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-yellow-500" />
                      <span>Medium Priority</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="high" className="hover:bg-red-50 focus:bg-red-100 text-slate-900 py-3">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <span>High Priority</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};
