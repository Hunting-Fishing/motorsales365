import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CustomerFormValues } from './schemas/customerSchema';

interface ReferralFieldsProps {
  form: UseFormReturn<CustomerFormValues>;
}

export const ReferralFields: React.FC<ReferralFieldsProps> = ({ form }) => {
  const referralSource = form.watch("referral_source");

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="referral_source"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Referral Source</FormLabel>
            <Select
              onValueChange={field.onChange}
              value={field.value || ""}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="How did you hear about us?" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="online_search">Online Search</SelectItem>
                <SelectItem value="social_media">Social Media</SelectItem>
                <SelectItem value="friend_family">Friend or Family</SelectItem>
                <SelectItem value="advertisement">Advertisement</SelectItem>
                <SelectItem value="existing_customer">Existing Customer</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="referral_person_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Referring Person</FormLabel>
            <FormControl>
              <Input
                placeholder="Name of person who referred you"
                {...field}
                value={field.value || ""}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {referralSource === "other" && (
        <FormField
          control={form.control}
          name="other_referral_details"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Other Referral Details</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Please provide details about how you heard about us"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  );
};
