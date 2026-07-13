
import { supabase } from "@/lib/supabase";
import { Payment, PaymentMethod, PaymentType, PaymentStatus } from "@/types/payment";

/**
 * Fetch all payment methods for a customer
 */
export const getCustomerPaymentMethods = async (customerId: string): Promise<PaymentMethod[]> => {
  try {
    const { data, error } = await supabase
      .from("payment_methods")
      .select("*")
      .eq("customer_id", customerId)
      .order("is_default", { ascending: false });

    if (error) {
      console.error("Error fetching payment methods:", error);
      throw error;
    }

    return data as PaymentMethod[];
  } catch (error) {
    console.error("Error in getCustomerPaymentMethods:", error);
    return [];
  }
};

/**
 * Add a new payment method for a customer
 */
export const addPaymentMethod = async (paymentMethod: Omit<PaymentMethod, "id" | "created_at" | "updated_at">): Promise<PaymentMethod> => {
  const { data, error } = await supabase
    .from("payment_methods")
    .insert(paymentMethod)
    .select()
    .single();

  if (error) {
    console.error("Error adding payment method:", error);
    throw error;
  }

  return data as PaymentMethod;
};

/**
 * Update an existing payment method
 */
export const updatePaymentMethod = async (id: string, updates: Partial<PaymentMethod>): Promise<PaymentMethod> => {
  const { data, error } = await supabase
    .from("payment_methods")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating payment method:", error);
    throw error;
  }

  return data as PaymentMethod;
};

/**
 * Delete a payment method
 */
export const deletePaymentMethod = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("payment_methods")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting payment method:", error);
    throw error;
  }
};

/**
 * Set a payment method as default
 */
export const setDefaultPaymentMethod = async (customerId: string, paymentMethodId: string): Promise<void> => {
  // Start by unsetting all existing payment methods as default
  const { error: updateError } = await supabase
    .from("payment_methods")
    .update({ is_default: false })
    .eq("customer_id", customerId);

  if (updateError) {
    console.error("Error updating payment methods:", updateError);
    throw updateError;
  }

  // Then set the selected payment method as default
  const { error } = await supabase
    .from("payment_methods")
    .update({ is_default: true })
    .eq("id", paymentMethodId);

  if (error) {
    console.error("Error setting default payment method:", error);
    throw error;
  }
};

/**
 * Fetch payment history for a customer
 */
export const getCustomerPayments = async (customerId: string): Promise<Payment[]> => {
  try {
    const { data, error } = await supabase
      .from("payments")
      .select(`
        *,
        payment_methods(*)
      `)
      .eq("customer_id", customerId)
      .order("transaction_date", { ascending: false });

    if (error) {
      console.error("Error fetching payments:", error);
      throw error;
    }

    return data as Payment[];
  } catch (error) {
    console.error("Error in getCustomerPayments:", error);
    return [];
  }
};

/**
 * Record a new payment
 */
export const recordPayment = async (paymentData: {
  customer_id: string;
  invoice_id?: string;
  amount: number;
  payment_type: PaymentType;
  status: PaymentStatus;
  payment_method_id?: string;
  transaction_id?: string;
  transaction_date: string;
  notes?: string;
}): Promise<Payment> => {
  const { data, error } = await supabase
    .from("payments")
    .insert(paymentData)
    .select()
    .single();

  if (error) {
    console.error("Error recording payment:", error);
    throw error;
  }

  return data as Payment;
};

/**
 * Get payments for an invoice
 */
export const getInvoicePayments = async (invoiceId: string): Promise<Payment[]> => {
  try {
    const { data, error } = await supabase
      .from("payments")
      .select(`
        *,
        payment_methods(*)
      `)
      .eq("invoice_id", invoiceId)
      .order("transaction_date", { ascending: false });

    if (error) {
      console.error("Error fetching invoice payments:", error);
      throw error;
    }

    return data as Payment[];
  } catch (error) {
    console.error("Error in getInvoicePayments:", error);
    return [];
  }
};
