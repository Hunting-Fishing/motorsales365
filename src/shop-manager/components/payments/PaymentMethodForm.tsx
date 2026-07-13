import React from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { paymentMethodOptions, PaymentMethod, PaymentMethodType } from '@/types/payment';

// Define the form schema
const formSchema = z.object({
  method_type: z.string() as z.ZodType<PaymentMethodType>,
  card_last_four: z.string().optional(),
  card_brand: z.string().optional(),
  expiry_month: z.string()
    .refine(val => !val || (!isNaN(parseInt(val)) && parseInt(val) >= 1 && parseInt(val) <= 12), {
      message: "Expiry month must be between 1 and 12",
    })
    .optional(),
  expiry_year: z.string()
    .refine(val => !val || (!isNaN(parseInt(val)) && parseInt(val) >= new Date().getFullYear()), {
      message: "Expiry year must be current or future year",
    })
    .optional(),
  billing_name: z.string().optional(),
  billing_address: z.string().optional(),
  billing_city: z.string().optional(),
  billing_state: z.string().optional(),
  billing_postal_code: z.string().optional(),
  billing_country: z.string().optional(),
  is_default: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

interface PaymentMethodFormProps {
  initialData?: Partial<PaymentMethod>;
  onSubmit: (data: Omit<PaymentMethod, 'id' | 'customer_id' | 'created_at' | 'updated_at'>) => Promise<boolean>;
}

export function PaymentMethodForm({ initialData, onSubmit }: PaymentMethodFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      method_type: initialData?.method_type as PaymentMethodType || 'credit_card',
      card_last_four: initialData?.card_last_four || '',
      card_brand: initialData?.card_brand || '',
      expiry_month: initialData?.expiry_month?.toString() || '',
      expiry_year: initialData?.expiry_year?.toString() || '',
      billing_name: initialData?.billing_name || '',
      billing_address: initialData?.billing_address || '',
      billing_city: initialData?.billing_city || '',
      billing_state: initialData?.billing_state || '',
      billing_postal_code: initialData?.billing_postal_code || '',
      billing_country: initialData?.billing_country || '',
      is_default: initialData?.is_default || false,
    },
  });

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const handleFormSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const formattedValues = {
        ...values,
        expiry_month: values.expiry_month ? parseInt(values.expiry_month) : undefined,
        expiry_year: values.expiry_year ? parseInt(values.expiry_year) : undefined,
        method_type: values.method_type as PaymentMethodType,
        is_default: values.is_default || false
      };
      
      await onSubmit(formattedValues as Omit<PaymentMethod, 'id' | 'customer_id' | 'created_at' | 'updated_at'>);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const selectedMethodType = form.watch('method_type');
  const isCreditCard = selectedMethodType === 'credit_card' || selectedMethodType === 'debit_card';

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="method_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Payment Method Type</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {paymentMethodOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {isCreditCard && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="card_brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Card Brand</FormLabel>
                    <FormControl>
                      <Input placeholder="Visa, Mastercard, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="card_last_four"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last 4 Digits</FormLabel>
                    <FormControl>
                      <Input maxLength={4} placeholder="Last 4 digits" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="expiry_month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiry Month</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={12} placeholder="MM" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expiry_year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiry Year</FormLabel>
                    <FormControl>
                      <Input type="number" min={new Date().getFullYear()} placeholder="YYYY" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </>
        )}
        
        <FormField
          control={form.control}
          name="billing_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Billing Name</FormLabel>
              <FormControl>
                <Input placeholder="Name on billing" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="billing_address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Billing Address</FormLabel>
              <FormControl>
                <Input placeholder="Street address" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="billing_city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl>
                  <Input placeholder="City" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="billing_state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>State/Province</FormLabel>
                <FormControl>
                  <Input placeholder="State/Province" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="billing_postal_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Postal Code</FormLabel>
                <FormControl>
                  <Input placeholder="Postal code" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="billing_country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country</FormLabel>
                <FormControl>
                  <Input placeholder="Country" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="is_default"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Set as Default Payment Method</FormLabel>
                <FormDescription>
                  This payment method will be used as your default for future payments.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />
        
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Payment Method"}
        </Button>
      </form>
    </Form>
  );
}
