import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useCreateDonation, usePrograms } from "@/services/nonprofitData";
import type { CreateDonationData } from "@/types/nonprofit";

const donationSchema = z.object({
  donor_name: z.string().min(1, "Donor name is required"),
  donor_email: z.string().email().optional().or(z.literal("")),
  donor_phone: z.string().optional(),
  donor_address: z.string().optional(),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  donation_type: z.enum(['monetary', 'in_kind', 'goods', 'services']).default('monetary'),
  payment_method: z.enum(['cash', 'check', 'credit_card', 'bank_transfer', 'paypal', 'other']).optional(),
  transaction_id: z.string().optional(),
  program_id: z.string().optional(),
  designation: z.string().optional(),
  is_recurring: z.boolean().default(false),
  recurrence_frequency: z.enum(['weekly', 'monthly', 'quarterly', 'annually']).optional(),
  tax_deductible: z.boolean().default(true),
  receipt_sent: z.boolean().default(false),
  receipt_number: z.string().optional(),
  anonymous: z.boolean().default(false),
  notes: z.string().optional(),
  donation_date: z.string().optional(),
});

type DonationFormData = z.infer<typeof donationSchema>;

interface DonationFormProps {
  onSuccess?: () => void;
}

export const DonationForm: React.FC<DonationFormProps> = ({ onSuccess }) => {
  const createDonation = useCreateDonation();
  const { data: programs } = usePrograms();

  const form = useForm<DonationFormData>({
    resolver: zodResolver(donationSchema),
    defaultValues: {
      donation_type: 'monetary',
      is_recurring: false,
      tax_deductible: true,
      receipt_sent: false,
      anonymous: false,
      donation_date: new Date().toISOString().split('T')[0],
    },
  });

  const onSubmit = async (data: DonationFormData) => {
    const donationData: CreateDonationData = {
      donor_name: data.donor_name,
      donor_email: data.donor_email || undefined,
      donor_phone: data.donor_phone,
      donor_address: data.donor_address,
      amount: data.amount,
      donation_type: data.donation_type,
      payment_method: data.payment_method,
      transaction_id: data.transaction_id,
      program_id: data.program_id,
      designation: data.designation,
      is_recurring: data.is_recurring,
      recurrence_frequency: data.recurrence_frequency,
      tax_deductible: data.tax_deductible,
      receipt_sent: data.receipt_sent,
      receipt_number: data.receipt_number,
      anonymous: data.anonymous,
      notes: data.notes,
      donation_date: data.donation_date,
    };

    createDonation.mutate(donationData, {
      onSuccess: () => {
        form.reset();
        onSuccess?.();
      },
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Record New Donation</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="donor_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Donor Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter donor name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount ($)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="donor_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (Optional)</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="donor@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="donor_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="donation_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Donation Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select donation type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="monetary">Monetary</SelectItem>
                        <SelectItem value="in_kind">In-Kind</SelectItem>
                        <SelectItem value="goods">Goods</SelectItem>
                        <SelectItem value="services">Services</SelectItem>
                      </SelectContent>
                    </Select>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="check">Check</SelectItem>
                        <SelectItem value="credit_card">Credit Card</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="paypal">PayPal</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="program_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Program (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select program" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">No specific program</SelectItem>
                      {programs?.map((program) => (
                        <SelectItem key={program.id} value={program.id}>
                          {program.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="donation_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Donation Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="transaction_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transaction ID (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Transaction reference" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="tax_deductible"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Tax Deductible</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Is this donation tax deductible?
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="anonymous"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Anonymous Donation</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Should this donation remain anonymous?
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional notes about the donation" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full" 
              disabled={createDonation.isPending}
            >
              {createDonation.isPending ? "Recording..." : "Record Donation"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};