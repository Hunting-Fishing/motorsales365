
import { useEffect, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { CustomerFormValues } from "./schemas/customerSchema";

export const useFormValidation = (form: UseFormReturn<CustomerFormValues>) => {
  const [hasPersonalErrors, setHasPersonalErrors] = useState(false);
  const [hasBusinessErrors, setHasBusinessErrors] = useState(false);
  const [hasPaymentErrors, setHasPaymentErrors] = useState(false);
  const [hasPreferencesErrors, setHasPreferencesErrors] = useState(false);
  const [hasReferralErrors, setHasReferralErrors] = useState(false);
  const [hasVehicleErrors, setHasVehicleErrors] = useState(false);
  const [hasHouseholdErrors, setHasHouseholdErrors] = useState(false);
  const [hasSegmentErrors, setHasSegmentErrors] = useState(false);
  
  const errors = form.formState.errors;
  
  useEffect(() => {
    // Personal section errors
    const personalFields = ['first_name', 'last_name', 'email', 'phone', 'address', 'city', 'state', 'postal_code', 'country'];
    setHasPersonalErrors(personalFields.some(field => errors[field as keyof typeof errors]));
    
    // Business section errors
    const businessFields = ['company', 'shop_id', 'business_type', 'business_industry', 'other_business_industry', 'tax_id', 'business_email', 'business_phone'];
    setHasBusinessErrors(businessFields.some(field => errors[field as keyof typeof errors]));
    
    // Payment section errors
    const paymentFields = ['preferred_payment_method', 'auto_billing', 'credit_terms', 'terms_agreed'];
    setHasPaymentErrors(paymentFields.some(field => errors[field as keyof typeof errors]));
    
    // Preferences section errors
    const preferencesFields = ['preferred_technician_id', 'communication_preference', 'preferred_service_type'];
    setHasPreferencesErrors(preferencesFields.some(field => errors[field as keyof typeof errors]));
    
    // Referral section errors
    const referralFields = ['referral_source', 'referral_person_id', 'other_referral_details'];
    setHasReferralErrors(referralFields.some(field => errors[field as keyof typeof errors]));
    
    // Vehicle section errors
    setHasVehicleErrors(!!errors.vehicles);
    
    // Household section errors
    const householdFields = ['household_id', 'create_new_household', 'new_household_name', 'household_relationship'];
    setHasHouseholdErrors(householdFields.some(field => errors[field as keyof typeof errors]));
    
    // Segment section errors
    setHasSegmentErrors(!!errors.segments);
    
  }, [errors]);
  
  const hasErrors = 
    hasPersonalErrors || 
    hasBusinessErrors || 
    hasPaymentErrors ||
    hasPreferencesErrors || 
    hasReferralErrors || 
    hasVehicleErrors ||
    hasHouseholdErrors ||
    hasSegmentErrors;
    
  return {
    hasErrors,
    hasPersonalErrors,
    hasBusinessErrors,
    hasPaymentErrors,
    hasPreferencesErrors,
    hasReferralErrors,
    hasVehicleErrors,
    hasHouseholdErrors,
    hasSegmentErrors
  };
};
