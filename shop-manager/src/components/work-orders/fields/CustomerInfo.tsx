
import { useState } from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomerSearchInput } from "@/components/customers/CustomerSearchInput";
import { Customer } from "@/types/customer";
import { Button } from "@/components/ui/button";
import { UserPlus, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

interface CustomerInfoProps {
  form: any;
}

export function CustomerInfo({ form }: CustomerInfoProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const handleSelectCustomer = (customer: Customer | null) => {
    setSelectedCustomer(customer);
    
    if (customer) {
      form.setValue("customer", `${customer.first_name} ${customer.last_name}`);
      
      // If customer has address fields, set location
      if (customer.address) {
        form.setValue("location", customer.address);
      }
    } else {
      form.setValue("customer", "");
    }
  };

  return (
    <>
      <CardHeader className="bg-slate-50 border-b">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-bold">Customer Information</CardTitle>
          <Button variant="outline" size="sm" className="h-8">
            <UserPlus className="h-4 w-4 mr-1" />
            New Customer
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-4">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="customer"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Customer</FormLabel>
                <FormControl>
                  <CustomerSearchInput
                    onSelectCustomer={handleSelectCustomer}
                    selectedCustomer={selectedCustomer}
                    placeholderText="Search customers by name, email or phone..."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {selectedCustomer ? (
            <div className="border rounded-md p-3 bg-slate-50">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-semibold">
                    {selectedCustomer.first_name} {selectedCustomer.last_name}
                  </h4>
                  {selectedCustomer.company && (
                    <p className="text-sm text-muted-foreground">{selectedCustomer.company}</p>
                  )}
                </div>
              </div>
              
              <Separator className="my-3" />
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {selectedCustomer.email && (
                  <div>
                    <span className="text-muted-foreground">Email:</span>{" "}
                    <span className="font-medium">{selectedCustomer.email}</span>
                  </div>
                )}
                
                {selectedCustomer.phone && (
                  <div className="flex items-center">
                    <Phone className="h-3 w-3 mr-1 text-muted-foreground" />
                    <span className="font-medium">{selectedCustomer.phone}</span>
                  </div>
                )}
                
                {selectedCustomer.address && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Address:</span>{" "}
                    <span className="font-medium">
                      {selectedCustomer.address}, 
                      {selectedCustomer.city && ` ${selectedCustomer.city},`}
                      {selectedCustomer.state && ` ${selectedCustomer.state}`}
                      {selectedCustomer.postal_code && ` ${selectedCustomer.postal_code}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="border border-dashed rounded-md p-4 text-center text-muted-foreground">
              <p>No customer selected</p>
              <p className="text-sm">Search for a customer above or create a new one</p>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="customerPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Phone Number</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Phone number" 
                    className="bg-white"
                    value={selectedCustomer?.phone || ""}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="customerEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Email</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Email address" 
                    className="bg-white"
                    value={selectedCustomer?.email || ""}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </>
  );
}
