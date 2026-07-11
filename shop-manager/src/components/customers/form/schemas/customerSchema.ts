
import { z } from "zod";
import { vehicleSchema } from "./vehicleSchema";
import { validateOtherBusinessIndustry } from "./validationRules";

// Define which fields are required
export const requiredFields = {
  first_name: true,
  last_name: true,
  shop_id: true,
};

// Define the main form schema
export const customerSchema = z.object({
  // Personal Info
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().nullish().transform(val => val || "").refine(
    (val) => !val || z.string().email().safeParse(val).success,
    "Please enter a valid email address"
  ),
  phone: z.string().nullish().transform(val => val || ""),
  
  // Address
  address: z.string().nullish().transform(val => val || ""),
  city: z.string().nullish().transform(val => val || ""),
  state: z.string().nullish().transform(val => val || ""),
  postal_code: z.string().nullish().transform(val => val || ""),
  country: z.string().nullish().transform(val => val || ""),
  
  // Business Info
  company: z.string().nullish().transform(val => val || ""),
  business_type: z.string().nullish().transform(val => val || ""),
  business_industry: z.string().nullish().transform(val => val || ""),
  other_business_industry: z.string().nullish().transform(val => val || ""),
  tax_id: z.string().nullish().transform(val => val || ""),
  business_email: z.string().nullish().transform(val => val || "").refine(
    (val) => !val || z.string().email().safeParse(val).success,
    "Please enter a valid business email address"
  ),
  business_phone: z.string().nullish().transform(val => val || ""),
  
  // Payment & Billing
  preferred_payment_method: z.string().nullish().transform(val => val || ""),
  auto_billing: z.boolean().optional().default(false),
  credit_terms: z.string().nullish().transform(val => val || ""),
  terms_agreed: z.boolean().optional().default(false),
  
  // Tax Exemption
  labor_tax_exempt: z.boolean().optional().default(false),
  parts_tax_exempt: z.boolean().optional().default(false),
  tax_exempt_certificate_number: z.string().nullish().transform(val => val || ""),
  tax_exempt_notes: z.string().nullish().transform(val => val || ""),
  
  // Fleet Management
  is_fleet: z.boolean().optional().default(false),
  fleet_company: z.string().nullish().transform(val => val || ""),
  fleet_manager: z.string().nullish().transform(val => val || ""),
  fleet_contact: z.string().nullish().transform(val => val || ""),
  preferred_service_type: z.string().nullish().transform(val => val || ""),
  
  // Notes
  notes: z.string().nullish().transform(val => val || ""),
  
  // Shop assignment
  shop_id: z.string().min(1, "Shop selection is required"),
  
  // Preferences
  preferred_technician_id: z.string().nullish().transform(val => val || ""),
  communication_preference: z.string().nullish().transform(val => val || ""),
  
  // Referral
  referral_source: z.string().nullish().transform(val => val || ""),
  referral_person_id: z.string().nullish().transform(val => val || ""),
  other_referral_details: z.string().nullish().transform(val => val || ""),
  
  // Household
  household_id: z.string().nullish().transform(val => val || ""),
  create_new_household: z.boolean().default(false),
  new_household_name: z.string().nullish().transform(val => val || ""),
  household_relationship: z.string().nullish().transform(val => val || ""),
  
  // Vehicles and Tags
  vehicles: z.array(vehicleSchema).default([]),
  tags: z.array(z.string()).default([]),
  segments: z.array(z.string()).default([]),
  
  // Remove role field since it's not part of the customers table schema
}).superRefine(validateOtherBusinessIndustry);

// Type definition for the form values
export type CustomerFormValues = z.infer<typeof customerSchema>;
