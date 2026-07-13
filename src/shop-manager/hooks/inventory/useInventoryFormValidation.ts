
import { useState } from "react";
import { InventoryItemExtended } from "@/types/inventory";

export function useInventoryFormValidation() {
  type FormErrors = {
    [key in keyof Omit<InventoryItemExtended, "id" | "status" | "description">]?: string;
  };
  
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  
  const validateForm = (data: Omit<InventoryItemExtended, "id">) => {
    const errors: FormErrors = {};
    let isValid = true;
    
    // All fields are now optional - no validation required
    
    setFormErrors(errors);
    return true; // Always return true since all fields are optional
  };
  
  const clearError = (field: string) => {
    if (formErrors[field as keyof FormErrors]) {
      setFormErrors({
        ...formErrors,
        [field]: undefined
      });
    }
  };
  
  return { formErrors, validateForm, clearError };
}
