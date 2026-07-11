
import { useBusinessConstants } from "@/hooks/useBusinessConstants";

// This file now re-exports the hooks that fetch data from the database
export { useBusinessConstants };

// Export types for backwards compatibility
export type BusinessConstant = {
  value: string;
  label: string;
};

// For backwards compatibility with any code that imports directly from this file
// All data should come from the database
export const businessTypes: BusinessConstant[] = [];
export const businessIndustries: BusinessConstant[] = [];
export const paymentMethods: BusinessConstant[] = [];
