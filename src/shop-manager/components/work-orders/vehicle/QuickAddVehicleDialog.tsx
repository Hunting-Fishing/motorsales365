import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Form } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CustomerVehicle } from '@/types/customer';
import { Car, Plus, Save } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { VinDecoderField } from '@/components/work-orders/fields/VinDecoderField';
import { VinDecodeResult } from '@/types/vehicle';

const vehicleSchema = z.object({
  vehicleMake: z.string().min(1, 'Make is required'),
  vehicleModel: z.string().min(1, 'Model is required'),
  vehicleYear: z.string().min(4, 'Year must be 4 digits').max(4, 'Year must be 4 digits'),
  vin: z.string().optional(),
  license_plate: z.string().optional(),
  saveToCustomer: z.boolean().default(true),
});

type VehicleFormData = z.infer<typeof vehicleSchema>;

interface QuickAddVehicleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string | null;
  customerName?: string;
  onVehicleAdded: (vehicle: CustomerVehicle, saveToCustomer: boolean) => void;
}

export function QuickAddVehicleDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
  onVehicleAdded
}: QuickAddVehicleDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      vehicleMake: '',
      vehicleModel: '',
      vehicleYear: '',
      vin: '',
      license_plate: '',
      saveToCustomer: true,
    },
  });

  const handleVehicleDecoded = (vehicleData: VinDecodeResult) => {
    console.log('Vehicle decoded:', vehicleData);
    // The VinDecoderField already updates the form fields automatically
    // This callback is for additional actions if needed
  };

  const onSubmit = async (data: VehicleFormData) => {
    setIsSubmitting(true);
    try {
      let savedVehicle: CustomerVehicle | null = null;

      if (data.saveToCustomer && customerId) {
        // Save to database
        const { data: vehicleData, error } = await supabase
          .from('vehicles')
          .insert({
            customer_id: customerId,
            make: data.vehicleMake,
            model: data.vehicleModel,
            year: parseInt(data.vehicleYear),
            vin: data.vin || null,
            license_plate: data.license_plate || null,
          })
          .select()
          .single();

        if (error) throw error;
        savedVehicle = vehicleData;

        toast({
          title: 'Vehicle Added',
          description: `${data.vehicleYear} ${data.vehicleMake} ${data.vehicleModel} has been added to ${customerName || 'the customer'}'s account.`,
        });
      } else {
        // Create temporary vehicle object for work order only
        savedVehicle = {
          id: `temp-${Date.now()}`,
          customer_id: customerId,
          make: data.vehicleMake,
          model: data.vehicleModel,
          year: parseInt(data.vehicleYear),
          vin: data.vin || null,
          license_plate: data.license_plate || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        toast({
          title: 'Vehicle Details Added',
          description: `Vehicle details will be used for this work order only.`,
        });
      }

      if (savedVehicle) {
        onVehicleAdded(savedVehicle, data.saveToCustomer);
        onOpenChange(false);
        form.reset();
      }
    } catch (error) {
      console.error('Error adding vehicle:', error);
      toast({
        title: 'Error',
        description: 'Failed to add vehicle. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Add Vehicle Details
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {customerName && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  Adding vehicle for: <strong>{customerName}</strong>
                </p>
              </div>
            )}

            {/* VIN Decoder Field - placed first for auto-population */}
            <VinDecoderField 
              form={form} 
              onVehicleDecoded={handleVehicleDecoded} 
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="vehicleMake"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Make *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Toyota" {...field} />
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
                    <FormLabel>Model *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Camry" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="vehicleYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Year *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., 2020" 
                      maxLength={4}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="license_plate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>License Plate</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., ABC-1234" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {customerId && (
              <FormField
                control={form.control}
                name="saveToCustomer"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Save vehicle to customer account
                      </FormLabel>
                      <p className="text-sm text-muted-foreground">
                        If checked, this vehicle will be saved to the customer's account for future use.
                        If unchecked, vehicle details will only be used for this work order.
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Plus className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Add Vehicle
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}