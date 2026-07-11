
import React from "react";
import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, MapPin, Calendar } from "lucide-react";
import { WorkOrderFormSchemaValues } from "@/schemas/workOrderSchema";

interface Technician {
  id: string;
  name: string;
  jobTitle?: string;
}

interface AssignmentFieldsProps {
  form: UseFormReturn<WorkOrderFormSchemaValues>;
  technicians: Technician[];
  technicianLoading: boolean;
  technicianError: string | null;
}

export const AssignmentFields: React.FC<AssignmentFieldsProps> = ({
  form,
  technicians,
  technicianLoading,
  technicianError
}) => {
  // Remove duplicates by creating a Map with unique names
  const uniqueTechnicians = React.useMemo(() => {
    const techMap = new Map();
    technicians.forEach((tech, index) => {
      const key = tech.name || `tech-${index}`;
      if (!techMap.has(key)) {
        techMap.set(key, {
          ...tech,
          id: tech.id || `tech-${index}`, // Ensure unique ID
        });
      }
    });
    return Array.from(techMap.values());
  }, [technicians]);

  return (
    <Card className="mb-4 border-purple-100">
      <CardHeader className="pb-3 bg-gradient-to-r from-purple-50 to-transparent">
        <CardTitle className="text-lg flex items-center">
          <User className="h-5 w-5 mr-2 text-purple-600" />
          Assignment & Scheduling
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="technician"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Technician</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={
                        technicianLoading 
                          ? "Loading technicians..." 
                          : technicianError 
                            ? "Error loading technicians" 
                            : "Select technician"
                      } />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {uniqueTechnicians.map((technician) => (
                      <SelectItem 
                        key={technician.id} 
                        value={technician.name}
                      >
                        {technician.name}
                        {technician.jobTitle && (
                          <span className="text-gray-500 text-sm ml-2">
                            ({technician.jobTitle})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  Location
                </FormLabel>
                <FormControl>
                  <Input placeholder="Enter work location" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  Due Date
                </FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
};
