
import React, { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Invoice } from "@/types/invoice";
import { PaymentMethodSelect } from "@/components/shared/PaymentMethodSelect";

const invoiceFormSchema = z.object({
  customer: z.string().min(1, { message: "Customer is required" }),
  customer_email: z.string().email({ message: "Invalid email" }).optional().or(z.literal('')),
  customer_address: z.string().optional(),
  description: z.string().optional(),
  payment_method: z.string().optional(),
  notes: z.string().optional(),
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

interface InvoiceFormProps {
  invoice: Invoice;
  onUpdate: (invoice: Invoice) => void;
  onSave: () => Promise<void>;
  isLoading: boolean;
}

export const InvoiceForm: React.FC<InvoiceFormProps> = ({
  invoice,
  onUpdate,
  onSave,
  isLoading
}) => {
  const [isSaving, setIsSaving] = useState(false);
  
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      customer: invoice.customer || "",
      customer_email: invoice.customer_email || "",
      customer_address: invoice.customer_address || "",
      description: invoice.description || "",
      payment_method: invoice.payment_method || "",
      notes: invoice.notes || ""
    },
    mode: "onChange"
  });
  
  const handleSubmit = async (values: InvoiceFormValues) => {
    try {
      setIsSaving(true);
      onUpdate({
        ...invoice,
        ...values
      });
      await onSave();
    } catch (error) {
      console.error("Error saving invoice:", error);
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Invoice Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="customer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Customer name" 
                      {...field} 
                      onChange={(e) => {
                        field.onChange(e);
                        onUpdate({
                          ...invoice,
                          customer: e.target.value
                        });
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="customer_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Customer email" 
                      type="email"
                      {...field} 
                      onChange={(e) => {
                        field.onChange(e);
                        onUpdate({
                          ...invoice,
                          customer_email: e.target.value
                        });
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="customer_address"
              render={({ field }) => (
                <FormItem className="col-span-1 md:col-span-2">
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Customer address" 
                      rows={2}
                      {...field} 
                      onChange={(e) => {
                        field.onChange(e);
                        onUpdate({
                          ...invoice,
                          customer_address: e.target.value
                        });
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Invoice description" 
                      {...field} 
                      onChange={(e) => {
                        field.onChange(e);
                        onUpdate({
                          ...invoice,
                          description: e.target.value
                        });
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="payment_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method</FormLabel>
                  <FormControl>
                    <PaymentMethodSelect
                      value={field.value || ''}
                      onChange={(value) => {
                        field.onChange(value);
                        onUpdate({
                          ...invoice,
                          payment_method: value
                        });
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="col-span-1 md:col-span-2">
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional notes" 
                      rows={3}
                      {...field} 
                      onChange={(e) => {
                        field.onChange(e);
                        onUpdate({
                          ...invoice,
                          notes: e.target.value
                        });
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button 
              type="submit"
              disabled={isLoading || isSaving}
            >
              {isLoading || isSaving ? "Saving..." : "Save Invoice"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
};
