import React, { useState, useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import { CustomerFormValues } from "./schemas/customerSchema";
import { checkDuplicateCustomers } from "@/services/customers";
import { CustomerCreate } from "@/types/customer";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/useDebounce";

interface DuplicateCustomerAlertProps {
  form: UseFormReturn<CustomerFormValues>;
}

export const DuplicateCustomerAlert: React.FC<DuplicateCustomerAlertProps> = ({ form }) => {
  const [duplicates, setDuplicates] = useState<CustomerCreate[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  const firstName = form.watch("first_name");
  const lastName = form.watch("last_name");
  const email = form.watch("email");
  const phone = form.watch("phone");
  
  const debouncedFirstName = useDebounce(firstName, 500);
  const debouncedLastName = useDebounce(lastName, 500);
  const debouncedEmail = useDebounce(email, 500);
  const debouncedPhone = useDebounce(phone, 500);

  useEffect(() => {
    if (debouncedFirstName && debouncedLastName) {
      checkForDuplicates();
    } else {
      setDuplicates([]);
      setShowResults(false);
    }
  }, [debouncedFirstName, debouncedLastName, debouncedEmail, debouncedPhone]);

  const checkForDuplicates = async () => {
    try {
      setIsChecking(true);
      const potentialDuplicates = await checkDuplicateCustomers(
        debouncedFirstName,
        debouncedLastName,
        debouncedEmail,
        debouncedPhone
      );
      
      setDuplicates(potentialDuplicates);
      setShowResults(potentialDuplicates.length > 0);
    } catch (error) {
      console.error("Error checking for duplicates:", error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleDismiss = () => {
    setShowResults(false);
  };

  if (!showResults || duplicates.length === 0) {
    return null;
  }

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Potential Duplicate Customer{duplicates.length > 1 ? 's' : ''} Found</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>
          We found {duplicates.length} existing customer{duplicates.length > 1 ? 's' : ''} with similar information.
        </p>
        
        <div className="rounded-md bg-destructive/20 p-2 mt-2 max-h-32 overflow-y-auto">
          <ul className="list-disc list-inside space-y-1">
            {duplicates.map((duplicate, index) => (
              <li key={index} className="text-sm">
                {duplicate.first_name} {duplicate.last_name}
                {duplicate.email && ` - ${duplicate.email}`}
                {duplicate.phone && ` - ${duplicate.phone}`}
              </li>
            ))}
          </ul>
        </div>
        
        <div className="flex justify-end space-x-2 mt-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDismiss}
          >
            Continue Anyway
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};
