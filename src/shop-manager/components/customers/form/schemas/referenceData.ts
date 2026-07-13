
// This file now imports data from hooks for real database data
import { useBusinessConstants, BusinessConstant } from "@/hooks/useBusinessConstants";

// Re-export the hooks for access to real data
export { useBusinessConstants };

// Export types for backwards compatibility
export type { BusinessConstant };

// For backwards compatibility with any code that imports directly from this file
// These are now placeholder values that get populated from the database

// Customer status options
export const customerStatusOptions = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "new", label: "New" },
  { value: "lead", label: "Lead" },
  { value: "archived", label: "Archived" }
];

// Communication preference options
export const communicationPreferenceOptions = [
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "text", label: "Text" },
  { value: "mail", label: "Mail" },
  { value: "none", label: "No Contact" }
];

// Referral source options
export const referralSourceOptions = [
  { value: "online_search", label: "Online Search" },
  { value: "social_media", label: "Social Media" },
  { value: "friend_family", label: "Friend or Family" },
  { value: "advertisement", label: "Advertisement" },
  { value: "other", label: "Other" }
];

// Placeholders that will be populated from the database
export const businessTypeOptions: BusinessConstant[] = [];
export const industryOptions: BusinessConstant[] = [];
export const paymentMethodOptions: BusinessConstant[] = [];

// Credit terms options
export const creditTermsOptions = [
  { value: "none", label: "None" },
  { value: "net_15", label: "Net 15" },
  { value: "net_30", label: "Net 30" },
  { value: "net_45", label: "Net 45" },
  { value: "net_60", label: "Net 60" }
];

// Empty predefined tags since we're using database tags now
export const predefinedTags: any[] = [];

// Export variables with names matching imports in CustomerFormSchema.ts
export const paymentMethods = paymentMethodOptions;
export const businessTypes = businessTypeOptions;
export const businessIndustries = industryOptions;
export const serviceTypes = [
  { value: "maintenance", label: "Regular Maintenance" },
  { value: "repair", label: "Repair" },
  { value: "emergency", label: "Emergency Service" },
  { value: "inspection", label: "Inspection" },
  { value: "upgrade", label: "Upgrade/Modification" }
];
