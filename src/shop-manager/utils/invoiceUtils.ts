import { Invoice } from "@/types/invoice";

export const calculateSubtotal = (items: any[]) => {
  return items.reduce((total, item) => {
    const itemPrice = parseFloat(item.price) || 0;
    const itemQuantity = parseFloat(item.quantity) || 0;
    return total + (itemPrice * itemQuantity);
  }, 0);
};

export const calculateTax = (subtotal: number, taxRate: number) => {
  return subtotal * taxRate;
};

export const calculateTotal = (subtotal: number, tax: number) => {
  return subtotal + tax;
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const normalizeInvoice = (invoice: any): Invoice => {
  const normalized = {
    id: invoice.id,
    number: invoice.number,
    customer: invoice.customer,
    customer_id: invoice.customer_id,
    customer_email: invoice.customer_email,
    customer_address: invoice.customer_address,
    issue_date: invoice.date || invoice.issue_date || new Date().toISOString(), 
    date: invoice.date,
    due_date: invoice.due_date,
    status: invoice.status,
    subtotal: parseFloat(invoice.subtotal) || 0,
    tax_rate: parseFloat(invoice.tax_rate) || 0,
    tax: parseFloat(invoice.tax) || 0,
    total: parseFloat(invoice.total) || 0,
    notes: invoice.notes,
    work_order_id: invoice.work_order_id,
    created_by: invoice.created_by,
    payment_method: invoice.payment_method,
    created_at: invoice.created_at,
    updated_at: invoice.last_updated_at,
    items: invoice.items || [],
    assignedStaff: invoice.assignedStaff || []
  };
  return normalized;
};

export const formatApiInvoice = (apiInvoice: any): Invoice => {
  return normalizeInvoice(apiInvoice);
};

export const getInvoiceStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'paid':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'draft':
      return 'bg-gray-100 text-gray-800 border-gray-300';
    case 'overdue':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'cancelled':
      return 'bg-purple-100 text-purple-800 border-purple-300';
    default:
      return 'bg-blue-100 text-blue-800 border-blue-300';
  }
};
