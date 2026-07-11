
import React, { useState, useEffect } from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Customer } from "@/types/customer";
import { Loader2 } from "lucide-react";

interface CustomerInfoSectionProps {
  form: any;
  customers: Customer[];
  isLoading: boolean;
  selectedVehicleId?: string | null;
  preSelectedCustomerId?: string | null;
}

export const CustomerInfoSection: React.FC<CustomerInfoSectionProps> = ({ 
  form, 
  customers, 
  isLoading,
  selectedVehicleId,
  preSelectedCustomerId
}) => {
  const [selectedCustomerName, setSelectedCustomerName] = useState<string>("");
  const [customerAddress, setCustomerAddress] = useState<string>("");
  
  // When a customer is selected or pre-selected, find their name and address
  useEffect(() => {
    const customerId = preSelectedCustomerId || form.getValues().customer;
    if (customerId) {
      const customer = customers.find(c => c.id === customerId);
      if (customer) {
        setSelectedCustomerName(`${customer.first_name} ${customer.last_name}`);
        
        // Build address string from customer data
        const addressParts = [];
        if (customer.address) addressParts.push(customer.address);
        if (customer.city) addressParts.push(customer.city);
        if (customer.state) addressParts.push(customer.state);
        if (customer.postal_code) addressParts.push(customer.postal_code);
        
        setCustomerAddress(addressParts.join(", "));
        
        // If a customer is pre-selected, ensure it's set in the form
        if (preSelectedCustomerId && form.getValues().customer !== preSelectedCustomerId) {
          form.setValue('customer', preSelectedCustomerId);
        }
      }
    }
  }, [form, customers, preSelectedCustomerId]);
  
  return (
    <>
      {/* Customer Select Field */}
      <FormField
        control={form.control}
        name="customer"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Customer</FormLabel>
            <FormControl>
              <Select
                disabled={isLoading}
                onValueChange={(value) => {
                  field.onChange(value);
                  // Find customer name for the selected ID
                  const customer = customers.find(c => c.id === value);
                  if (customer) {
                    setSelectedCustomerName(`${customer.first_name} ${customer.last_name}`);
                    
                    // Update address
                    const addressParts = [];
                    if (customer.address) addressParts.push(customer.address);
                    if (customer.city) addressParts.push(customer.city);
                    if (customer.state) addressParts.push(customer.state);
                    if (customer.postal_code) addressParts.push(customer.postal_code);
                    
                    setCustomerAddress(addressParts.join(", "));
                  }
                }}
                value={field.value || preSelectedCustomerId || ""}
              >
                <SelectTrigger>
                  {isLoading ? (
                    <div className="flex items-center">
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      <span>Loading customers...</span>
                    </div>
                  ) : (
                    <SelectValue placeholder="Select a customer" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.first_name} {customer.last_name}
                      {customer.company ? ` (${customer.company})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Location Field */}
      <FormField
        control={form.control}
        name="location"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Location</FormLabel>
            <FormControl>
              <Input 
                placeholder="Service location" 
                {...field} 
                defaultValue={customerAddress}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Description Field */}
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem className="col-span-full">
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Input 
                placeholder="Brief description of the work" 
                {...field} 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Hidden field to track the selected vehicle */}
      {selectedVehicleId && (
        <input type="hidden" id="selected-vehicle-id" value={selectedVehicleId} />
      )}
    </>
  );
};
