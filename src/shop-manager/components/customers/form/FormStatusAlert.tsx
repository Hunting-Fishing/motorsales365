
import React from "react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Check } from "lucide-react";

export const FormStatusAlert: React.FC = () => {
  return (
    <Alert variant="success" className="mt-4">
      <Check className="h-4 w-4" />
      <AlertTitle>Form Ready</AlertTitle>
      <AlertDescription>
        All required fields are completed correctly.
      </AlertDescription>
    </Alert>
  );
};
