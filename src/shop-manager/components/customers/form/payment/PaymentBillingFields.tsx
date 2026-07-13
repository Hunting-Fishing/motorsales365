import React from "react";
import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard } from "lucide-react";
import { CustomerFormValues } from "../schemas/customerSchema";

interface PaymentBillingFieldsProps {
  form: UseFormReturn<CustomerFormValues>;
}

export const PaymentBillingFields: React.FC<PaymentBillingFieldsProps> = ({ form }) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <CreditCard className="h-5 w-5 text-muted-foreground" />
        <CardTitle>Payment & Billing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="preferred_payment_method"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preferred Payment Method</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="debit_card">Debit Card</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="credit_terms"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Credit Terms</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Net 30, Net 15, etc."
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <FormField
            control={form.control}
            name="auto_billing"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Enable Auto Billing</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Automatically charge the customer's preferred payment method
                  </p>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="terms_agreed"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Terms & Conditions Agreed</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Customer has agreed to terms and conditions
                  </p>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="labor_tax_exempt"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Labor Tax Exempt</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Customer is exempt from labor tax charges
                  </p>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="parts_tax_exempt"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Parts Tax Exempt</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Customer is exempt from parts tax charges
                  </p>
                </div>
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="tax_exempt_certificate_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tax Exempt Certificate Number</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter certificate number"
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tax_exempt_notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tax Exempt Notes</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Additional tax exemption notes"
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
};
