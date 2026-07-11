
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { User } from "lucide-react";

interface CustomerDetailsFieldProps {
  form: any;
}

export const CustomerDetailsField: React.FC<CustomerDetailsFieldProps> = ({ form }) => {
  return (
    <Card className="mb-4 border-green-100">
      <CardHeader className="pb-3 bg-gradient-to-r from-green-50 to-transparent">
        <CardTitle className="text-lg flex items-center">
          <User className="h-5 w-5 mr-2 text-green-600" />
          Customer Details
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <FormField
          control={form.control}
          name="customer"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Customer</FormLabel>
              <FormControl>
                <Input placeholder="Enter customer name" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};
