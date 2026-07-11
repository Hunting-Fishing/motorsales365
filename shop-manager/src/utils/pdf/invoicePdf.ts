
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice } from '@/types/invoice';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { formatPaymentMethodForDisplay } from '@/constants/paymentMethods';

/**
 * Generate invoice PDF
 */
export const generateInvoicePdf = (invoice: Invoice & { 
  subtotal: number; 
  tax: number; 
  total: number; 
  paymentMethod?: string;
}) => {
  // Create new PDF document
  const doc = new jsPDF();
  
  // Set font
  doc.setFont('helvetica', 'normal');
  
  // Add header
  doc.setFontSize(20);
  doc.text('INVOICE', 14, 20);
  
  doc.setFontSize(10);
  doc.text(`Invoice #${invoice.id || ''}`, 14, 30);
  doc.text(`Date: ${formatDate(invoice.date)}`, 14, 35);
  
  // Customer info
  doc.setFontSize(12);
  doc.text('Bill To:', 14, 45);
  doc.setFontSize(10);
  doc.text(`${invoice.customer || ''}`, 14, 50);
  doc.text(`${invoice.customer_address || ''}`, 14, 55);
  doc.text(`${invoice.customer_email || ''}`, 14, 60);
  
  // Invoice details
  doc.setFontSize(10);
  doc.text('Invoice Details', 140, 45);
  doc.text(`Issue Date: ${formatDate(invoice.date)}`, 140, 50);
  doc.text(`Due Date: ${formatDate(invoice.due_date)}`, 140, 55);
  doc.text(`Payment Method: ${formatPaymentMethodForDisplay(invoice.payment_method)}`, 140, 60);
  
  if (invoice.work_order_id) {
    doc.text('Work Order Reference:', 140, 65);
    doc.text(`${invoice.work_order_id}`, 140, 70);
  }
  
  // Table header
  const tableColumn = ['Item', 'Description', 'Quantity', 'Price', 'Total'];
  
  // Table rows
  const tableRows = invoice.items?.map(item => {
    return [
      item.name || '',
      item.description || '',
      item.hours ? `${item.quantity} hr` : item.quantity.toString(),
      formatCurrency(item.price),
      formatCurrency(item.total || item.price * item.quantity)
    ];
  }) || [];
  
  // Add items table
  doc.setFontSize(12);
  doc.text('Invoice Items', 14, 75);
  
  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 80,
    theme: 'striped',
    headStyles: {
      fillColor: [100, 100, 100],
      textColor: [255, 255, 255]
    },
    styles: {
      lineColor: [220, 220, 220]
    }
  });
  
  // Get the y position after the table
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  
  // Add totals
  doc.setFontSize(10);
  doc.text('Subtotal:', 140, finalY);
  doc.text(formatCurrency(invoice.subtotal), 170, finalY, { align: 'right' });
  
  doc.text('Tax:', 140, finalY + 5);
  doc.text(formatCurrency(invoice.tax), 170, finalY + 5, { align: 'right' });
  
  doc.setFontSize(12);
  doc.text('Total:', 140, finalY + 15);
  doc.text(formatCurrency(invoice.total), 170, finalY + 15, { align: 'right' });
  
  // Add notes
  if (invoice.notes) {
    doc.setFontSize(10);
    doc.text('Notes:', 14, finalY + 25);
    doc.text(invoice.notes, 14, finalY + 30);
  }
  
  return doc;
};
