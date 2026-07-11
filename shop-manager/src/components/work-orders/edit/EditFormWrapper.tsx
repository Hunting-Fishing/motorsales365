
import React, { ReactNode } from "react";
import { Form } from "@/components/ui/form";
import { UseFormReturn } from "react-hook-form";
import { WorkOrderFormSchemaValues } from "@/schemas/workOrderSchema";

interface EditFormWrapperProps {
  form: UseFormReturn<WorkOrderFormSchemaValues>;
  onSubmit: (values: WorkOrderFormSchemaValues) => Promise<void>;
  children: ReactNode;
}

export const EditFormWrapper: React.FC<EditFormWrapperProps> = ({
  form,
  onSubmit,
  children
}) => {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {children}
      </form>
    </Form>
  );
};
