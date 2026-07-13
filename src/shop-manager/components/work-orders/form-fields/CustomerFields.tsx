
import React, { useState, useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { User, Car, Plus } from "lucide-react";
import { CustomerSelect } from "../customer-select/CustomerSelect";
import { VehicleSelect } from "../customer-select/VehicleSelect";
import { QuickAddVehicleDialog } from "../vehicle/QuickAddVehicleDialog";
import { VehicleInfoDisplay } from "./VehicleInfoDisplay";
import { Customer, CustomerVehicle } from "@/types/customer";
import { useSearchParams } from "react-router-dom";
import { WorkOrderFormSchemaValues } from "@/schemas/workOrderSchema";

interface CustomerFieldsProps {
  form: UseFormReturn<WorkOrderFormSchemaValues>;
  prePopulatedCustomer?: {
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    customerAddress?: string;
    vehicleMake?: string;
    vehicleModel?: string;
    vehicleYear?: string;
    vehicleLicensePlate?: string;
    vehicleVin?: string;
  };
}

export const CustomerFields: React.FC<CustomerFieldsProps> = ({ 
  form, 
  prePopulatedCustomer 
}) => {
  const [searchParams] = useSearchParams();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<CustomerVehicle | null>(null);
  const [showManualVehicleEntry, setShowManualVehicleEntry] = useState(false);
  const [vehicles, setVehicles] = useState<CustomerVehicle[]>([]);
  const [showAddVehicleDialog, setShowAddVehicleDialog] = useState(false);

  // Check if we have customer ID from URL (coming from customer page)
  const customerIdFromUrl = searchParams.get('customerId');
  const customerNameFromUrl = searchParams.get('customerName');
  const isFromCustomerPage = !!customerIdFromUrl;

  // Auto-populate form when component mounts or when pre-populated data changes
  useEffect(() => {
    if (prePopulatedCustomer) {
      // Set customer information
      if (prePopulatedCustomer.customerName) {
        form.setValue('customer', prePopulatedCustomer.customerName);
      }
      if (prePopulatedCustomer.customerEmail) {
        form.setValue('customerEmail', prePopulatedCustomer.customerEmail);
      }
      if (prePopulatedCustomer.customerPhone) {
        form.setValue('customerPhone', prePopulatedCustomer.customerPhone);
      }
      if (prePopulatedCustomer.customerAddress) {
        form.setValue('customerAddress', prePopulatedCustomer.customerAddress);
      }

      // Set vehicle information
      if (prePopulatedCustomer.vehicleMake) {
        form.setValue('vehicleMake', prePopulatedCustomer.vehicleMake);
      }
      if (prePopulatedCustomer.vehicleModel) {
        form.setValue('vehicleModel', prePopulatedCustomer.vehicleModel);
      }
      if (prePopulatedCustomer.vehicleYear) {
        form.setValue('vehicleYear', prePopulatedCustomer.vehicleYear);
      }
      if (prePopulatedCustomer.vehicleLicensePlate) {
        form.setValue('licensePlate', prePopulatedCustomer.vehicleLicensePlate);
      }
      if (prePopulatedCustomer.vehicleVin) {
        form.setValue('vin', prePopulatedCustomer.vehicleVin);
      }
    }
  }, [prePopulatedCustomer, form]);

  // Handle customer selection
  const handleCustomerSelect = (customer: Customer | null) => {
    setSelectedCustomer(customer);
    setSelectedVehicle(null); // Reset vehicle when customer changes
    
    if (customer) {
      // Set customer ID for database reference
      form.setValue('customerId', customer.id);
      form.setValue('customer', `${customer.first_name} ${customer.last_name}`.trim());
      form.setValue('customerEmail', customer.email || '');
      form.setValue('customerPhone', customer.phone || '');
      form.setValue('customerAddress', customer.address || '');
    } else {
      // Clear customer fields
      form.setValue('customerId', '');
      form.setValue('customer', '');
      form.setValue('customerEmail', '');
      form.setValue('customerPhone', '');
      form.setValue('customerAddress', '');
    }
  };

  // Handle vehicle selection
  const handleVehicleSelect = (vehicle: CustomerVehicle | null, vehiclesList?: CustomerVehicle[]) => {
    setSelectedVehicle(vehicle);
    setShowManualVehicleEntry(false); // Hide manual entry when vehicle is selected
    
    // Update vehicles list if provided
    if (vehiclesList) {
      setVehicles(vehiclesList);
    }
    
    if (vehicle) {
      // Set vehicle ID for database reference
      form.setValue('vehicleId', vehicle.id);
      form.setValue('vehicleMake', vehicle.make || '');
      form.setValue('vehicleModel', vehicle.model || '');
      form.setValue('vehicleYear', vehicle.year?.toString() || '');
      form.setValue('licensePlate', vehicle.license_plate || '');
      form.setValue('vin', vehicle.vin || '');
    } else {
      // Clear vehicle fields
      form.setValue('vehicleId', '');
      form.setValue('vehicleMake', '');
      form.setValue('vehicleModel', '');
      form.setValue('vehicleYear', '');
      form.setValue('licensePlate', '');
      form.setValue('vin', '');
    }
  };

  // Handle manual vehicle entry toggle
  const handleManualVehicleEntry = () => {
    setShowAddVehicleDialog(true);
  };

  // Handle vehicle added from dialog
  const handleVehicleAdded = (vehicle: CustomerVehicle, saveToCustomer: boolean) => {
    setSelectedVehicle(vehicle);
    setShowManualVehicleEntry(false);
    
    // Update vehicles list if vehicle was saved to customer
    if (saveToCustomer && vehicle.id && !vehicle.id.startsWith('temp-')) {
      setVehicles(prev => [...prev, vehicle]);
    }
    
    // Set form values
    form.setValue('vehicleId', vehicle.id);
    form.setValue('vehicleMake', vehicle.make || '');
    form.setValue('vehicleModel', vehicle.model || '');
    form.setValue('vehicleYear', vehicle.year?.toString() || '');
    form.setValue('licensePlate', vehicle.license_plate || '');
    form.setValue('vin', vehicle.vin || '');
  };

  return (
    <div className="space-y-4">
      {/* Customer Information Card */}
      <Card className="border-green-100">
        <CardHeader className="pb-3 bg-gradient-to-r from-green-50 to-transparent">
          <CardTitle className="text-lg flex items-center">
            <User className="h-5 w-5 mr-2 text-green-600" />
            Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {!isFromCustomerPage ? (
            // Show customer selection when not coming from customer page
            <div>
              <FormLabel>Select Customer</FormLabel>
              <CustomerSelect
                onSelectCustomer={handleCustomerSelect}
                selectedCustomerId={selectedCustomer?.id}
              />
            </div>
          ) : (
            // Show auto-selected customer info when coming from customer page
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center">
                <User className="h-4 w-4 mr-2 text-green-600" />
                <span className="font-medium text-green-800">
                  Auto-selected: {customerNameFromUrl || 'Customer'}
                </span>
              </div>
              <p className="text-sm text-green-600 mt-1">
                Customer information has been pre-populated from the customer page.
              </p>
              {/* Hidden field to store customer ID */}
              <input type="hidden" {...form.register('customerId')} value={customerIdFromUrl} />
            </div>
          )}

          {/* Customer Details Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="customer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter customer name" {...field} />
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
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="customerPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter phone number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="customerAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Information Card */}
      <Card className="border-blue-100">
        <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-transparent">
          <CardTitle className="text-lg flex items-center">
            <Car className="h-5 w-5 mr-2 text-blue-600" />
            Vehicle Information
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {/* Vehicle Selection - only show if we have a customer (either selected or from URL) */}
          {(selectedCustomer || isFromCustomerPage) && !showManualVehicleEntry && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <FormLabel>Select Vehicle</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleManualVehicleEntry}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add New Vehicle
                </Button>
              </div>
              <VehicleSelect
                customerId={selectedCustomer?.id || customerIdFromUrl}
                onSelectVehicle={handleVehicleSelect}
                selectedVehicleId={selectedVehicle?.id}
              />
              
              {/* Helper text when no vehicles found */}
              <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
                <Car className="h-4 w-4" />
                <span>
                  {vehicles.length === 0 
                    ? "No vehicles found for this customer. Click 'Add New Vehicle' to enter details manually."
                    : `${vehicles.length} vehicle(s) available for selection.`
                  }
                </span>
              </p>
            </div>
          )}

          {/* Display comprehensive vehicle information when a vehicle is selected */}
          {selectedVehicle && !showManualVehicleEntry && (
            <VehicleInfoDisplay vehicle={selectedVehicle} />
          )}

          {/* Manual Vehicle Entry or when no customer selected */}
          {(showManualVehicleEntry || (!selectedCustomer && !isFromCustomerPage)) && (
            <div>
              {(selectedCustomer || isFromCustomerPage) && (
                <div className="flex items-center justify-between mb-4">
                  <FormLabel>Vehicle Details</FormLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowManualVehicleEntry(false)}
                  >
                    Select Existing Vehicle
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="vehicleMake"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Make</FormLabel>
                      <FormControl>
                        <Input placeholder="Vehicle make" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vehicleModel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model</FormLabel>
                      <FormControl>
                        <Input placeholder="Vehicle model" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vehicleYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year</FormLabel>
                      <FormControl>
                        <Input placeholder="Vehicle year" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="licensePlate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>License Plate</FormLabel>
                      <FormControl>
                        <Input placeholder="License plate" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>VIN</FormLabel>
                      <FormControl>
                        <Input placeholder="Vehicle VIN" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Add Vehicle Dialog */}
      <QuickAddVehicleDialog
        open={showAddVehicleDialog}
        onOpenChange={setShowAddVehicleDialog}
        customerId={selectedCustomer?.id || customerIdFromUrl}
        customerName={selectedCustomer ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}`.trim() : customerNameFromUrl}
        onVehicleAdded={handleVehicleAdded}
      />
    </div>
  );
};
