import React from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { LicenseClassSelect } from '@/components/fuel-delivery/LicenseClassSelect';
import { StateProvinceSelect } from '@/components/shared/StateProvinceSelect';

const driverFormSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  license_number: z.string().optional(),
  license_class: z.string().optional(),
  license_state: z.string().optional(),
  license_expiry: z.string().optional(),
  water_quality_certified: z.boolean().default(false),
  water_quality_cert_expiry: z.string().optional(),
  tanker_endorsement: z.boolean().default(false),
  tanker_endorsement_expiry: z.string().optional(),
  hire_date: z.string().optional(),
  hourly_rate: z.string().optional(),
  notes: z.string().optional(),
});

type DriverFormData = z.infer<typeof driverFormSchema>;

interface AddWaterDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddWaterDriverDialog({ open, onOpenChange }: AddWaterDriverDialogProps) {
  const { shopId } = useShopId();
  const queryClient = useQueryClient();

  const form = useForm<DriverFormData>({
    resolver: zodResolver(driverFormSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      license_number: '',
      license_class: '',
      license_state: '',
      license_expiry: '',
      water_quality_certified: false,
      water_quality_cert_expiry: '',
      tanker_endorsement: false,
      tanker_endorsement_expiry: '',
      hire_date: '',
      hourly_rate: '',
      notes: '',
    },
  });

  // Watch license_state to update license_class options dynamically
  const licenseState = useWatch({ control: form.control, name: 'license_state' });


  const createDriver = useMutation({
    mutationFn: async (data: DriverFormData) => {
      if (!shopId) throw new Error('Shop ID is required');

      const { error } = await supabase.from('water_delivery_drivers').insert({
        shop_id: shopId,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email || null,
        phone: data.phone || null,
        license_number: data.license_number || null,
        license_class: data.license_class || null,
        license_state: data.license_state || null,
        license_expiry: data.license_expiry || null,
        water_quality_certified: data.water_quality_certified,
        water_quality_cert_expiry: data.water_quality_cert_expiry || null,
        tanker_endorsement: data.tanker_endorsement,
        tanker_endorsement_expiry: data.tanker_endorsement_expiry || null,
        hire_date: data.hire_date || null,
        hourly_rate: data.hourly_rate ? parseFloat(data.hourly_rate) : null,
        notes: data.notes || null,
        is_active: true,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Driver added successfully');
      queryClient.invalidateQueries({ queryKey: ['water-delivery-drivers'] });
      form.reset();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Failed to add driver: ' + error.message);
    },
  });

  const onSubmit = (data: DriverFormData) => {
    createDriver.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Water Delivery Driver</DialogTitle>
          <DialogDescription>
            Enter the driver's information and certifications below.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="(555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* License Info */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium mb-3">License Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="license_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>License Number</FormLabel>
                      <FormControl>
                        <Input placeholder="DL12345678" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="license_class"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>License Class</FormLabel>
                      <FormControl>
                        <LicenseClassSelect
                          value={field.value || ''}
                          onChange={field.onChange}
                          stateProvince={licenseState || ''}
                          placeholder="Select license class"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <FormField
                  control={form.control}
                  name="license_state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State/Province</FormLabel>
                      <FormControl>
                        <StateProvinceSelect
                          value={field.value || ''}
                          onChange={field.onChange}
                          placeholder="Select state/province"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="license_expiry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CDL Expiry Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Certifications */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium mb-3">Certifications</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <FormField
                    control={form.control}
                    name="water_quality_certified"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Water Quality Certified</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="water_quality_cert_expiry"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input type="date" placeholder="Expiry Date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex items-center gap-4">
                  <FormField
                    control={form.control}
                    name="tanker_endorsement"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Tanker Endorsement</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tanker_endorsement_expiry"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input type="date" placeholder="Expiry Date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Employment Info */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium mb-3">Employment</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="hire_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hire Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="hourly_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hourly Rate ($)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="25.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Additional notes..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-cyan-600 hover:bg-cyan-700"
                disabled={createDriver.isPending}
              >
                {createDriver.isPending ? 'Adding...' : 'Add Driver'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
