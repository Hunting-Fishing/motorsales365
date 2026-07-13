
import React from "react";
import { Button } from "@sm/components/ui/button";

interface FormActionsProps {
  isSubmitting: boolean;
}

export function FormActions({ isSubmitting }: FormActionsProps) {
  return (
    <div className="flex justify-end">
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create Reminder"}
      </Button>
    </div>
  );
}
