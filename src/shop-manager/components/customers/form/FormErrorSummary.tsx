import React from "react";
import { FieldErrors } from "react-hook-form";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { CustomerFormValues } from "./schemas/customerSchema";

interface FormErrorSummaryProps {
  errors: FieldErrors<CustomerFormValues>;
}

// Field name mapping for better user experience
const fieldNameMap: Record<string, string> = {
  first_name: "First Name",
  last_name: "Last Name",
  email: "Email Address",
  phone: "Phone Number",
  address: "Street Address",
  city: "City",
  state: "State/Province",
  postal_code: "Postal Code",
  country: "Country",
  company: "Company Name",
  business_type: "Business Type",
  business_industry: "Business Industry",
  other_business_industry: "Other Business Industry",
  tax_id: "Tax ID",
  business_email: "Business Email",
  business_phone: "Business Phone",
  preferred_payment_method: "Preferred Payment Method",
  credit_terms: "Credit Terms",
  fleet_company: "Fleet Company",
  fleet_manager: "Fleet Manager",
  fleet_contact: "Fleet Contact",
  preferred_service_type: "Preferred Service Type",
  notes: "Notes",
  shop_id: "Shop",
  preferred_technician_id: "Preferred Technician",
  communication_preference: "Communication Preference",
  referral_source: "Referral Source",
  referral_person_id: "Referral Person",
  other_referral_details: "Other Referral Details",
  household_id: "Household",
  new_household_name: "New Household Name",
  household_relationship: "Household Relationship",
};

export const FormErrorSummary: React.FC<FormErrorSummaryProps> = ({ errors }) => {
  const errorEntries = Object.entries(errors);
  
  if (errorEntries.length === 0) return null;
  
  return (
    <Alert variant="destructive" className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Please Fix These Issues</AlertTitle>
      <AlertDescription>
        <p className="mb-2">The following fields need attention:</p>
        <ul className="list-disc list-inside space-y-1">
          {errorEntries.map(([field, error]) => {
            const fieldLabel = fieldNameMap[field] || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            const errorMessage = error?.message?.toString() || `${fieldLabel} has an error`;
            
            return (
              <li key={field} className="text-sm">
                <span className="font-medium">{fieldLabel}:</span> {errorMessage}
              </li>
            );
          })}
        </ul>
      </AlertDescription>
    </Alert>
  );
};
