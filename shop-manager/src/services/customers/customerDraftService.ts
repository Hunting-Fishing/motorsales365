
import { CustomerFormValues } from "@/components/customers/form/schemas/customerSchema";

// Local storage key for draft customer
const DRAFT_CUSTOMER_KEY = 'draft_customer';

// Save customer form data as a draft
export const saveDraftCustomer = async (formData: CustomerFormValues): Promise<void> => {
  try {
    localStorage.setItem(DRAFT_CUSTOMER_KEY, JSON.stringify(formData));
  } catch (error) {
    console.error("Error saving draft customer:", error);
    throw new Error("Failed to save draft customer");
  }
};

// Get draft customer data
export const getDraftCustomer = async (): Promise<CustomerFormValues | null> => {
  try {
    const draftData = localStorage.getItem(DRAFT_CUSTOMER_KEY);
    return draftData ? JSON.parse(draftData) : null;
  } catch (error) {
    console.error("Error getting draft customer:", error);
    return null;
  }
};

// Clear draft customer data
export const clearDraftCustomer = async (): Promise<void> => {
  try {
    localStorage.removeItem(DRAFT_CUSTOMER_KEY);
  } catch (error) {
    console.error("Error clearing draft customer:", error);
  }
};
