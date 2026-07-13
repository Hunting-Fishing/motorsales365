
import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Check } from "lucide-react";

interface CreateCustomerSuccessProps {
  customerId: string | null;
}

export const CreateCustomerSuccess: React.FC<CreateCustomerSuccessProps> = ({ 
  customerId 
}) => {
  if (!customerId) return null;
  
  return (
    <Alert variant="success" className="bg-green-50 border-green-200">
      <Check className="h-5 w-5 text-green-600" />
      <AlertTitle className="text-green-800 text-lg">Customer Created Successfully</AlertTitle>
      <AlertDescription className="text-green-700">
        The new customer has been added to the system. You will be redirected to the customer details page shortly.
      </AlertDescription>
    </Alert>
  );
};
