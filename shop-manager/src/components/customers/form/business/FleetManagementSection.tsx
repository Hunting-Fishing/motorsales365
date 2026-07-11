
import React from "react";
import { UseFormReturn } from "react-hook-form";
import { ChevronDown, Truck, CheckCircle } from "lucide-react";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { CustomerFormValues } from "../schemas/customerSchema";
import { cn } from "@/lib/utils";

interface FleetManagementSectionProps {
  form: UseFormReturn<CustomerFormValues>;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isFleet: boolean;
}

export const FleetManagementSection: React.FC<FleetManagementSectionProps> = ({ 
  form, 
  isOpen, 
  setIsOpen,
  isFleet
}) => {
  // Watch fleet-related fields
  const fleetCompany = form.watch("fleet_company");
  const fleetManager = form.watch("fleet_manager");
  const fleetContact = form.watch("fleet_contact");

  // Count filled fleet fields
  const filledFleetFields = [fleetCompany, fleetManager, fleetContact].filter(Boolean).length;
  const totalFleetFields = 3;

  // Auto-expand if fleet is enabled and section is closed
  React.useEffect(() => {
    if (isFleet && !isOpen) {
      setIsOpen(true);
    }
  }, [isFleet, isOpen, setIsOpen]);

  const getSectionStyle = () => {
    if (isFleet) {
      return "border-blue-200 bg-blue-50";
    }
    return "border-gray-200 bg-white";
  };

  const getStatusBadge = () => {
    if (isFleet) {
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-300">
          <Truck className="w-3 h-3 mr-1" />
          Fleet Enabled
        </Badge>
      );
    }
    return null;
  };

  const getCompletionBadge = () => {
    if (isFleet && filledFleetFields > 0) {
      return (
        <Badge variant="outline" className="text-xs">
          <CheckCircle className="w-3 h-3 mr-1" />
          {filledFleetFields}/{totalFleetFields} completed
        </Badge>
      );
    }
    return null;
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={cn(
        "rounded-lg border transition-all duration-200",
        getSectionStyle()
      )}>
        <CollapsibleTrigger className="w-full p-4 hover:bg-opacity-80 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-medium">Fleet Management</h3>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge()}
                {getCompletionBadge()}
              </div>
            </div>
            <ChevronDown className={cn(
              "h-5 w-5 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180"
            )} />
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent className="px-4 pb-4">
          <div className="space-y-4 pt-2 border-t border-gray-100">
            {/* Fleet Toggle */}
            <FormField
              control={form.control}
              name="is_fleet"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Fleet Customer</FormLabel>
                    <FormDescription>
                      Mark this customer as a fleet with multiple vehicles
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Fleet Details - Only show when fleet is enabled */}
            {isFleet && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {/* Fleet Company */}
                <FormField
                  control={form.control}
                  name="fleet_company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fleet Company</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter fleet company name" 
                          {...field} 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Fleet Manager */}
                <FormField
                  control={form.control}
                  name="fleet_manager"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fleet Manager</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter fleet manager name" 
                          {...field} 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Fleet Contact */}
                <FormField
                  control={form.control}
                  name="fleet_contact"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Fleet Contact Information</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter fleet contact details (phone, email, etc.)" 
                          {...field} 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};
