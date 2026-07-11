
import { useInvoiceTemplates } from "@/hooks/useInvoiceTemplates";

// This file now re-exports the hook that fetches data from the database
export { useInvoiceTemplates };

// For backwards compatibility - no mock fallbacks
import { InvoiceTemplate } from "@/types/invoice";
export const invoiceTemplates: InvoiceTemplate[] = [];

export const updateTemplateUsage = async (templateId: string) => {
  console.warn('Using deprecated function. Please use useInvoiceTemplates hook instead.');
  // This is a no-op for compatibility
};

export const createTemplate = async () => {
  console.warn('Using deprecated function. Please use useInvoiceTemplates hook instead.');
  // Return a valid WorkOrderTemplate object for backward compatibility
  return null;
};
