
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
import { Textarea } from "@/components/ui/textarea";
import { paymentTypeOptions, paymentStatusOptions, PaymentFormValues } from '@/types/payment';
import { usePaymentMethods } from '@/hooks/usePaymentMethods';
import { format } from 'date-fns';

// Define allowed values for payment_type and status
type PaymentType = "full" | "partial" | "deposit" | "refund";
type PaymentStatus = "pending" | "processed" | "failed" | "refunded";

const formSchema = z.object({
  amount: z.coerce.number().positive("Amount must be positive"),
  payment_method_id: z.string().optional(),
  payment_type: z.string() as z.ZodType<PaymentType>,
  status: z.string() as z.ZodType<PaymentStatus>,
  transaction_id: z.string().optional(),
  transaction_date: z.string().default(() => format(new Date(), 'yyyy-MM-dd')),
  notes: z.string().optional(),
});

type FormSchemaType = z.infer<typeof formSchema>;

interface PaymentFormProps {
  customerId: string;
  invoiceId?: string;
  initialData?: Partial<PaymentFormValues>;
  onSubmit: (data: PaymentFormValues) => Promise<boolean>;
}

export function PaymentForm({ customerId, invoiceId, initialData, onSubmit }: PaymentFormProps) {
  const { paymentMethods, isLoading: isLoadingMethods } = usePaymentMethods(customerId);

  const defaultValues = {
    amount: initialData?.amount || 0,
    payment_method_id: initialData?.payment_method_id || undefined,
    payment_type: (initialData?.payment_type as PaymentType) || 'full',
    status: (initialData?.status as PaymentStatus) || 'processed',
    transaction_id: initialData?.transaction_id || '',
    transaction_date: initialData?.transaction_date || format(new Date(), 'yyyy-MM-dd'),
    notes: initialData?.notes || '',
  };

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const handleFormSubmit = async (values: FormSchemaType) => {
    setIsSubmitting(true);
    try {
      // Ensure we have the correct typing for PaymentFormValues
      const paymentValues: PaymentFormValues = {
        amount: values.amount,
        payment_method_id: values.payment_method_id === 'none' ? undefined : values.payment_method_id,
        payment_type: values.payment_type as "full" | "partial" | "deposit" | "refund",
        status: values.status as "pending" | "processed" | "failed" | "refunded",
        transaction_id: values.transaction_id,
        transaction_date: values.transaction_date || format(new Date(), 'yyyy-MM-dd'),
        notes: values.notes,
      };
      
      await onSubmit(paymentValues);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
                  <Input type="number" step="0.01" min="0" className="pl-7" {...field} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="payment_method_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Payment Method</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingMethods}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a payment method" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">None / Other</SelectItem>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.id} value={method.id}>
                      {method.method_type === 'credit_card' && method.card_brand 
                        ? `${method.card_brand} •••• ${method.card_last_four}`
                        : method.method_type
                      }
                      {method.is_default && " (Default)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                {isLoadingMethods ? "Loading payment methods..." : "Select a payment method or leave blank for a manual entry"}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="payment_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {paymentTypeOptions.map((option) => (
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
          
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {paymentStatusOptions.map((option) => (
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
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="transaction_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Transaction ID</FormLabel>
                <FormControl>
                  <Input placeholder="Optional reference number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="transaction_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Transaction Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Any additional notes about this payment"
                  className="resize-none"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Processing..." : "Record Payment"}
        </Button>
      </form>
    </Form>
  );
}
