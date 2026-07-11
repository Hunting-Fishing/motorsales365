
// Re-export all PDF utility functions
export * from './pdfConfig';
export * from './invoicePdf';

// Import jsPDF to use for document creation
import { jsPDF } from "jspdf";
import 'jspdf-autotable';
import { configurePdf, addFooter, getFormattedDate } from './pdfConfig';

/**
 * Generate a report PDF with enhanced formatting
 */
export const generateReportPdf = (
  title: string, 
  data: any[], 
  columns: { header: string, dataKey: string }[],
  summaryData?: Record<string, any>,
  chartImageUrl?: string
) => {
  // Create new PDF document
  const doc = new jsPDF();
  
  // Configure document with branding
  configurePdf(doc, title);
  
  // Add chart if provided
  let startY = 45;
  if (chartImageUrl) {
    doc.addImage(chartImageUrl, 'PNG', 14, startY, 180, 80);
    startY += 85;
  }
  
  // Add summary data if provided
  if (summaryData && Object.keys(summaryData).length > 0) {
    doc.setFontSize(12);
    doc.text("Summary", 14, startY);
    startY += 5;
    
    const summaryRows = Object.entries(summaryData).map(([key, value]) => [
      key, 
      typeof value === 'number' ? value.toFixed(2) : String(value)
    ]);
    
    doc.autoTable({
      startY,
      head: [['Metric', 'Value']],
      body: summaryRows,
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202] },
      margin: { left: 14, right: 14 },
      styles: { fontSize: 10 }
    });
    
    startY = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // Add data table
  doc.setFontSize(12);
  doc.text("Data", 14, startY);
  
  // Create table with data
  doc.autoTable({
    startY: startY + 5,
    head: [columns.map(col => col.header)],
    body: data.map(row => columns.map(col => row[col.dataKey])),
    theme: 'grid',
    headStyles: { fillColor: [66, 139, 202] },
    alternateRowStyles: { fillColor: [240, 240, 240] },
    margin: { left: 14, right: 14 },
    styles: { fontSize: 9, cellPadding: 3 }
  });
  
  // Add footer
  addFooter(doc);
  
  return doc;
};

/**
 * Generate a work order PDF with better formatting
 */
export const generateWorkOrderPdf = (workOrder: any) => {
  // Create new PDF document
  const doc = new jsPDF();
  
  // Configure document with branding
  configurePdf(doc, `Work Order #${workOrder.id}`);
  
  // Add customer information
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text("Customer:", 14, 50);
  doc.setFontSize(10);
  doc.text(workOrder.customer, 14, 55);
  
  // Add work order details
  doc.setFontSize(11);
  doc.text("Work Order Details:", 14, 65);
  doc.setFontSize(10);
  doc.text(`Date: ${workOrder.date}`, 14, 70);
  doc.text(`Due Date: ${workOrder.dueDate}`, 14, 75);
  doc.text(`Status: ${workOrder.status}`, 14, 80);
  doc.text(`Priority: ${workOrder.priority}`, 14, 85);
  doc.text(`Technician: ${workOrder.technician}`, 14, 90);
  
  if (workOrder.location) {
    doc.text(`Location: ${workOrder.location}`, 14, 95);
  }
  
  // Add description
  if (workOrder.description) {
    doc.setFontSize(11);
    doc.text("Description:", 14, 105);
    doc.setFontSize(9);
    
    // Wrap the description text to ensure it fits within the page
    const splitDescription = doc.splitTextToSize(workOrder.description, 180);
    doc.text(splitDescription, 14, 110);
  }
  
  let yPosition = 130;
  
  // Add inventory items if they exist
  if (workOrder.inventoryItems && workOrder.inventoryItems.length > 0) {
    doc.setFontSize(11);
    doc.text("Parts & Materials:", 14, yPosition);
    
    doc.autoTable({
      startY: yPosition + 5,
      head: [['Item', 'SKU', 'Quantity', 'Unit Price', 'Total']],
      body: workOrder.inventoryItems.map((item: any) => [
        item.name,
        item.sku,
        item.quantity.toString(),
        `$${item.unitPrice.toFixed(2)}`,
        `$${(item.quantity * item.unitPrice).toFixed(2)}`
      ]),
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202] },
      styles: { fontSize: 9 }
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }
  
  // Add time entries if they exist
  if (workOrder.timeEntries && workOrder.timeEntries.length > 0) {
    doc.setFontSize(11);
    doc.text("Time Entries:", 14, yPosition);
    
    doc.autoTable({
      startY: yPosition + 5,
      head: [['Technician', 'Date', 'Duration', 'Billable', 'Notes']],
      body: workOrder.timeEntries.map((entry: any) => [
        entry.employeeName,
        new Date(entry.startTime).toLocaleDateString(),
        `${entry.duration} mins`,
        entry.billable ? 'Yes' : 'No',
        entry.notes || ''
      ]),
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202] },
      styles: { fontSize: 9 }
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }
  
  // Add notes if they exist
  if (workOrder.notes) {
    doc.setFontSize(11);
    doc.text("Notes:", 14, yPosition);
    doc.setFontSize(9);
    
    // Wrap the notes text to ensure it fits within the page
    const splitNotes = doc.splitTextToSize(workOrder.notes, 180);
    doc.text(splitNotes, 14, yPosition + 5);
  }
  
  // Add footer
  addFooter(doc);
  
  return doc;
};

/**
 * Save or open a PDF document with proper name formatting
 */
export const savePdf = (doc: jsPDF, filename: string) => {
  const formattedFilename = `${filename}_${getFormattedDate()}.pdf`;
  doc.save(formattedFilename);
};
