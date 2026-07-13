import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Invoice, StaffMember } from "@/types/invoice";

export function useInvoice() {
  const [invoice, setInvoice] = useState<Invoice>({
    id: uuidv4(),
    number: `INV-${Date.now().toString().slice(-6)}`,
    customer: "",
    customer_id: "", // Add required field
    customer_address: "",
    customer_email: "",
    status: "draft",
    date: new Date().toISOString().split('T')[0],
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    description: "",
    payment_method: "",
    subtotal: 0,
    tax: 0,
    tax_rate: 0.07,
    total: 0,
    created_by: "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    items: [], // Add required field
    assignedStaff: []
  });

  return {
    invoice,
    setInvoice,
  };
}
