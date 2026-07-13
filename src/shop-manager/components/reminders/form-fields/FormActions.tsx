
import React from "react";
import { Button } from "@/components/ui/button";

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
