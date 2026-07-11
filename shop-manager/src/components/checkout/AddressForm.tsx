import React from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { CreateAddressRequest } from '@/services/addressService';

interface AddressFormProps {
  onSubmit: (data: CreateAddressRequest) => void;
  onCancel: () => void;
  defaultValues?: Partial<CreateAddressRequest>;
  title?: string;
  submitLabel?: string;
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

export const AddressForm: React.FC<AddressFormProps> = ({
  onSubmit,
  onCancel,
  defaultValues,
  title = "Add Address",
  submitLabel = "Save Address"
}) => {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<CreateAddressRequest>({
    defaultValues: {
      address_type: 'both',
      country: 'US',
      is_default: false,
      ...defaultValues
    }
  });

  const addressType = watch('address_type');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="address_type">Address Type</Label>
            <Select 
              defaultValue={addressType} 
              onValueChange={(value) => setValue('address_type', value as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="shipping">Shipping Only</SelectItem>
                <SelectItem value="billing">Billing Only</SelectItem>
                <SelectItem value="both">Both Shipping & Billing</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              {...register('full_name', { required: 'Full name is required' })}
              placeholder="John Doe"
            />
            {errors.full_name && (
              <p className="text-sm text-destructive mt-1">{errors.full_name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="address_line1">Address Line 1</Label>
            <Input
              id="address_line1"
              {...register('address_line1', { required: 'Address is required' })}
              placeholder="123 Main Street"
            />
            {errors.address_line1 && (
              <p className="text-sm text-destructive mt-1">{errors.address_line1.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="address_line2">Address Line 2 (Optional)</Label>
            <Input
              id="address_line2"
              {...register('address_line2')}
              placeholder="Apt, Suite, Unit, etc."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                {...register('city', { required: 'City is required' })}
                placeholder="New York"
              />
              {errors.city && (
                <p className="text-sm text-destructive mt-1">{errors.city.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="state">State</Label>
              <Select onValueChange={(value) => setValue('state', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map(state => (
                    <SelectItem key={state} value={state}>{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.state && (
                <p className="text-sm text-destructive mt-1">{errors.state.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="postal_code">ZIP Code</Label>
              <Input
                id="postal_code"
                {...register('postal_code', { 
                  required: 'ZIP code is required',
                  pattern: {
                    value: /^\d{5}(-\d{4})?$/,
                    message: 'Invalid ZIP code format'
                  }
                })}
                placeholder="12345"
              />
              {errors.postal_code && (
                <p className="text-sm text-destructive mt-1">{errors.postal_code.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="phone">Phone (Optional)</Label>
              <Input
                id="phone"
                {...register('phone')}
                placeholder="(555) 123-4567"
                type="tel"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_default"
              onCheckedChange={(checked) => setValue('is_default', !!checked)}
            />
            <Label htmlFor="is_default">Set as default address</Label>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1">
              {submitLabel}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};