import jsPDF from 'jspdf';
import { format } from 'date-fns';

interface QuoteData {
  quote_number: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  property_address: string;
  property_type?: string;
  estimated_sqft?: number;
  services_requested?: string[];
  quoted_price?: number;
  preferred_date?: string;
  additional_details?: string;
  created_at: string;
}

interface BusinessInfo {
  name: string;
  address: string;
  phone: string;
  email?: string;
  license?: string;
}

export function generateQuotePDF(quote: QuoteData, businessInfo?: BusinessInfo) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;
  
  // Default business info if not provided
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
  
  // Quote title
  yPos += 20;
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('QUOTE', pageWidth - 20, 25, { align: 'right' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`#${quote.quote_number}`, pageWidth - 20, 32, { align: 'right' });
  doc.text(`Date: ${format(new Date(quote.created_at), 'MMMM d, yyyy')}`, pageWidth - 20, 38, { align: 'right' });
  
  // Divider
  yPos += 5;
  doc.setDrawColor(200);
  doc.line(20, yPos, pageWidth - 20, yPos);
  yPos += 15;
  
  // Customer Info
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('CUSTOMER INFORMATION', 20, yPos);
  yPos += 8;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(quote.customer_name, 20, yPos);
  yPos += 5;
  if (quote.customer_phone) {
    doc.text(`Phone: ${quote.customer_phone}`, 20, yPos);
    yPos += 5;
  }
  if (quote.customer_email) {
    doc.text(`Email: ${quote.customer_email}`, 20, yPos);
    yPos += 5;
  }
  
  // Property Info
  yPos += 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('PROPERTY DETAILS', 20, yPos);
  yPos += 8;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Address: ${quote.property_address}`, 20, yPos);
  yPos += 5;
  if (quote.property_type) {
    doc.text(`Type: ${quote.property_type.replace(/_/g, ' ')}`, 20, yPos);
    yPos += 5;
  }
  if (quote.estimated_sqft) {
    doc.text(`Size: ${quote.estimated_sqft.toLocaleString()} sq ft`, 20, yPos);
    yPos += 5;
  }
  
  // Services
  if (quote.services_requested && quote.services_requested.length > 0) {
    yPos += 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('SERVICES REQUESTED', 20, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    quote.services_requested.forEach((service) => {
      doc.text(`• ${service.replace(/_/g, ' ')}`, 25, yPos);
      yPos += 5;
    });
  }
  
  // Pricing Box
  yPos += 15;
  doc.setFillColor(240, 240, 240);
  doc.rect(20, yPos - 5, pageWidth - 40, 30, 'F');
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('QUOTED PRICE', 30, yPos + 8);
  
  doc.setFontSize(24);
  doc.setTextColor(0, 128, 0);
  doc.text(
    quote.quoted_price ? `$${quote.quoted_price.toLocaleString()}` : 'TBD',
    pageWidth - 30,
    yPos + 12,
    { align: 'right' }
  );
  
  doc.setTextColor(0);
  yPos += 35;
  
  // Preferred Date
  if (quote.preferred_date) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Preferred Service Date: ${format(new Date(quote.preferred_date), 'MMMM d, yyyy')}`,
      20,
      yPos
    );
    yPos += 10;
  }
  
  // Notes
  if (quote.additional_details) {
    yPos += 5;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('NOTES', 20, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(quote.additional_details, pageWidth - 40);
    doc.text(lines, 20, yPos);
    yPos += lines.length * 5 + 10;
  }
  
  // Terms
  yPos += 10;
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text('TERMS & CONDITIONS', 20, yPos);
  yPos += 5;
  doc.text('• This quote is valid for 30 days from the date above.', 20, yPos);
  yPos += 4;
  doc.text('• Payment is due upon completion of service unless otherwise arranged.', 20, yPos);
  yPos += 4;
  doc.text('• We are fully licensed and insured.', 20, yPos);
  
  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.setDrawColor(200);
  doc.line(20, footerY - 10, pageWidth - 20, footerY - 10);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text('Thank you for your business!', pageWidth / 2, footerY, { align: 'center' });
  
  return doc;
}

export function downloadQuotePDF(quote: QuoteData, businessInfo?: BusinessInfo) {
  const doc = generateQuotePDF(quote, businessInfo);
  doc.save(`Quote-${quote.quote_number}.pdf`);
}
