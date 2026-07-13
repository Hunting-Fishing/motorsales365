
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Invoice } from "@/types/invoice";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function useInvoiceSave() {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const saveInvoice = async (
    invoice: Invoice,
    status: "draft" | "pending" | "paid" | "overdue" | "cancelled"
  ) => {
    setIsSaving(true);
    setSaveError(null);

    try {
      const invoiceId = invoice.id || `INV-${Date.now().toString().slice(-6)}`;
      
      const invoiceData = {
        id: invoiceId,
        customer: invoice.customer || '',
        customer_address: invoice.customer_address || null,
        customer_email: invoice.customer_email || null,
        customer_id: invoice.customer_id || null,
        description: invoice.description || null,
        notes: invoice.notes || null,
        date: formatDate(invoice.issue_date),
        due_date: formatDate(invoice.due_date),
        status,
        work_order_id: invoice.work_order_id || null,
        subtotal: invoice.subtotal || 0,
        tax: invoice.tax || 0,
        total: invoice.total || 0,
        payment_method: invoice.payment_method || null,
      };

      // Check if invoice exists
      const { data: existing } = await supabase
        .from('invoices')
        .select('id')
        .eq('id', invoiceId)
        .single();

      let error;
      if (existing) {
        // Update existing invoice
        const { error: updateError } = await supabase
          .from('invoices')
          .update({
            ...invoiceData,
            last_updated_at: new Date().toISOString(),
          })
          .eq('id', invoiceId);
        error = updateError;
      } else {
        // Insert new invoice
        const { error: insertError } = await supabase
          .from('invoices')
          .insert(invoiceData);
        error = insertError;
      }

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: `Invoice ${status === "draft" ? "saved as draft" : "created"} successfully.`,
      });

      navigate("/invoices");
      return true;
    } catch (error) {
      console.error("Failed to save invoice:", error);
      
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      setSaveError(errorMessage);
      
      toast({
        title: "Error",
        description: `Failed to save invoice: ${errorMessage}`,
        variant: "destructive",
      });
      
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return { saveInvoice, isSaving, saveError };
}

// Helper functions
function formatDate(date: string): string {
  try {
    return new Date(date).toISOString().split('T')[0];
  } catch (e) {
    return new Date().toISOString().split('T')[0];
  }
}
