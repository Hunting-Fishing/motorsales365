import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { formatPaymentMethodForDisplay } from '@/constants/paymentMethods';

interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface InvoiceData {
  invoice_number: string;
  status: string;
  issue_date: string;
  due_date?: string | null;
  subtotal?: number;
  tax?: number;
  total: number;
  balance_due: number;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  property_address?: string;
  line_items?: InvoiceLineItem[];
  notes?: string;
  payment_method?: string | null;
}

interface BusinessInfo {
  name: string;
  address: string;
  phone: string;
  email?: string;
  license?: string;
}

export function generateInvoicePDF(invoice: InvoiceData, businessInfo?: BusinessInfo) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;
  
  const business = businessInfo || {
    name: 'Power Washing Services',
    address: '',
    phone: '',
  };

  // Header
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(business.name, 20, yPos);
  
  yPos += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  if (business.address) doc.text(business.address, 20, yPos);
  yPos += 5;
  if (business.phone) doc.text(`Phone: ${business.phone}`, 20, yPos);
  if (business.email) doc.text(`Email: ${business.email}`, 100, yPos);
  
  // Invoice title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('INVOICE', pageWidth - 20, 25, { align: 'right' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`#${invoice.invoice_number}`, pageWidth - 20, 32, { align: 'right' });
  
  // Status badge
  const statusColor = invoice.status === 'paid' ? [0, 128, 0] : 
                       invoice.status === 'overdue' ? [200, 0, 0] : [100, 100, 100];
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(invoice.status.toUpperCase(), pageWidth - 20, 40, { align: 'right' });
  
  doc.setTextColor(0);
  yPos += 20;
  
  // Dates
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Issue Date: ${format(new Date(invoice.issue_date), 'MMMM d, yyyy')}`, pageWidth - 20, 50, { align: 'right' });
  if (invoice.due_date) {
    doc.text(`Due Date: ${format(new Date(invoice.due_date), 'MMMM d, yyyy')}`, pageWidth - 20, 56, { align: 'right' });
  }
  
  // Divider
  yPos += 10;
  doc.setDrawColor(200);
  doc.line(20, yPos, pageWidth - 20, yPos);
  yPos += 15;
  
  // Bill To
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO', 20, yPos);
  yPos += 8;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if (invoice.customer_name) {
    doc.text(invoice.customer_name, 20, yPos);
    yPos += 5;
  }
  if (invoice.customer_phone) {
    doc.text(invoice.customer_phone, 20, yPos);
    yPos += 5;
  }
  if (invoice.customer_email) {
    doc.text(invoice.customer_email, 20, yPos);
    yPos += 5;
  }
  if (invoice.property_address) {
    yPos += 3;
    doc.text(invoice.property_address, 20, yPos);
    yPos += 5;
  }
  
  // Line Items Table
  yPos += 15;
  
  // Table Header
  doc.setFillColor(240, 240, 240);
  doc.rect(20, yPos - 5, pageWidth - 40, 10, 'F');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Description', 25, yPos);
  doc.text('Qty', 120, yPos, { align: 'center' });
  doc.text('Unit Price', 145, yPos, { align: 'right' });
  doc.text('Total', pageWidth - 25, yPos, { align: 'right' });
  
  yPos += 10;
  doc.setFont('helvetica', 'normal');
  
  // Line Items
  const subtotal = invoice.subtotal ?? invoice.total;
  const tax = invoice.tax ?? 0;
  
  const lineItems = invoice.line_items || [
    { description: 'Power Washing Service', quantity: 1, unit_price: subtotal, total: subtotal }
  ];
  
  lineItems.forEach((item) => {
    doc.text(item.description, 25, yPos);
    doc.text(item.quantity.toString(), 120, yPos, { align: 'center' });
    doc.text(`$${item.unit_price.toFixed(2)}`, 145, yPos, { align: 'right' });
    doc.text(`$${item.total.toFixed(2)}`, pageWidth - 25, yPos, { align: 'right' });
    yPos += 8;
  });
  
  // Totals
  yPos += 10;
  doc.setDrawColor(200);
  doc.line(120, yPos, pageWidth - 20, yPos);
  yPos += 8;
  
  doc.text('Subtotal:', 130, yPos);
  doc.text(`$${subtotal.toFixed(2)}`, pageWidth - 25, yPos, { align: 'right' });
  yPos += 6;
  
  doc.text('Tax:', 130, yPos);
  doc.text(`$${tax.toFixed(2)}`, pageWidth - 25, yPos, { align: 'right' });
  yPos += 8;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Total:', 130, yPos);
  doc.text(`$${invoice.total.toFixed(2)}`, pageWidth - 25, yPos, { align: 'right' });
  yPos += 10;
  
  // Balance Due Box
  if (invoice.balance_due > 0 && invoice.status !== 'paid') {
    yPos += 5;
    doc.setFillColor(255, 240, 240);
    doc.rect(120, yPos - 5, pageWidth - 140, 15, 'F');
    doc.setTextColor(200, 0, 0);
    doc.text('Balance Due:', 130, yPos + 4);
    doc.setFontSize(14);
    doc.text(`$${invoice.balance_due.toFixed(2)}`, pageWidth - 25, yPos + 4, { align: 'right' });
    doc.setTextColor(0);
  } else if (invoice.status === 'paid') {
    yPos += 5;
    doc.setFillColor(240, 255, 240);
    doc.rect(120, yPos - 5, pageWidth - 140, 15, 'F');
    doc.setTextColor(0, 128, 0);
    doc.setFontSize(14);
    doc.text('PAID IN FULL', pageWidth / 2 + 30, yPos + 4, { align: 'center' });
    doc.setTextColor(0);
  }
  
  // Notes
  if (invoice.notes) {
    yPos += 25;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('NOTES', 20, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(invoice.notes, pageWidth - 40);
    doc.text(lines, 20, yPos);
  }
  
  // Payment Terms
  yPos = doc.internal.pageSize.getHeight() - 60;
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text('PAYMENT INFORMATION', 20, yPos);
  yPos += 5;
  doc.text(`Payment Method: ${formatPaymentMethodForDisplay(invoice.payment_method)}`, 20, yPos);
  yPos += 6;
  doc.text('PAYMENT TERMS', 20, yPos);
  yPos += 5;
  doc.text('• Payment is due upon receipt unless otherwise specified.', 20, yPos);
  yPos += 4;
  doc.text('• Please include invoice number with payment.', 20, yPos);
  yPos += 4;
  doc.text('• Late payments may be subject to a 1.5% monthly service charge.', 20, yPos);
  
  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setDrawColor(200);
  doc.line(20, footerY - 5, pageWidth - 20, footerY - 5);
  doc.setFontSize(9);
  doc.text('Thank you for your business!', pageWidth / 2, footerY, { align: 'center' });
  
  return doc;
}

export function downloadInvoicePDF(invoice: InvoiceData, businessInfo?: BusinessInfo) {
  const doc = generateInvoicePDF(invoice, businessInfo);
  doc.save(`Invoice-${invoice.invoice_number}.pdf`);
}
