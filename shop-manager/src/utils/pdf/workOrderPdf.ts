
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { WorkOrder, TimeEntry, WorkOrderInventoryItem } from "@/types/workOrder";
import { formatDate, formatCurrency } from "@/utils/formatters";

export const generateWorkOrderPdf = (workOrder: WorkOrder): jsPDF => {
  const doc = new jsPDF();
  
  // Add header
  doc.setFontSize(20);
  doc.text("Work Order", 14, 20);
  
  doc.setFontSize(10);
  doc.text(`ID: ${workOrder.id}`, 14, 30);
  doc.text(`Date: ${formatDate(workOrder.date)}`, 14, 35);
  doc.text(`Due Date: ${formatDate(workOrder.dueDate || "")}`, 14, 40);
  
  // Add status and priority
  doc.text(`Status: ${workOrder.status}`, 120, 30);
  doc.text(`Priority: ${workOrder.priority}`, 120, 35);
  
  // Add customer and vehicle info
  doc.setFontSize(14);
  doc.text("Customer Information", 14, 55);
  doc.setFontSize(10);
  doc.text(`Customer: ${workOrder.customer}`, 14, 65);
  doc.text(`Location: ${workOrder.location || "N/A"}`, 14, 70);
  
  // Add description and notes
  doc.setFontSize(14);
  doc.text("Description", 14, 85);
  doc.setFontSize(10);
  doc.text(workOrder.description || "No description provided", 14, 95);
  
  doc.setFontSize(14);
  doc.text("Notes", 14, 110);
  doc.setFontSize(10);
  doc.text(workOrder.notes || "No notes provided", 14, 120);
  
  // Add inventory items table
  if (workOrder.inventoryItems && workOrder.inventoryItems.length > 0) {
    doc.setFontSize(14);
    doc.text("Parts & Materials", 14, 135);
    
    const inventoryHeaders = [["Name", "SKU", "Category", "Quantity", "Price", "Total"]];
    const inventoryData = workOrder.inventoryItems.map((item) => [
      item.name,
      item.sku,
      item.category,
      item.quantity.toString(),
      formatCurrency(item.unit_price),
      formatCurrency(item.quantity * item.unit_price)
    ]);
    
    (doc as any).autoTable({
      head: inventoryHeaders,
      body: inventoryData,
      startY: 140,
      headStyles: { fillColor: [66, 139, 202] }
    });
  }
  
  // Add time entries table
  const timeEntriesY = (doc as any).lastAutoTable ? 
    (doc as any).lastAutoTable.finalY + 20 : 
    145;
  
  if (workOrder.timeEntries && workOrder.timeEntries.length > 0) {
    doc.setFontSize(14);
    doc.text("Labor & Time Entries", 14, timeEntriesY);
    
    const timeHeaders = [["Technician", "Start Time", "End Time", "Duration", "Notes", "Billable"]];
    const timeData = workOrder.timeEntries.map((entry) => [
      entry.employee_name || '',
      entry.start_time || '',
      entry.end_time || '',
      entry.duration ? `${entry.duration} min` : '',
      entry.notes || '',
      entry.billable ? "Yes" : "No"
    ]);
    
    (doc as any).autoTable({
      head: timeHeaders,
      body: timeData,
      startY: timeEntriesY + 5,
      headStyles: { fillColor: [66, 139, 202] }
    });
  }
  
  // Add signature section
  const signatureY = (doc as any).lastAutoTable ? 
    (doc as any).lastAutoTable.finalY + 20 : 
    timeEntriesY + 20;
  
  doc.setFontSize(12);
  doc.text("Customer Signature", 14, signatureY);
  doc.line(14, signatureY + 15, 100, signatureY + 15);
  doc.text("Technician Signature", 120, signatureY);
  doc.line(120, signatureY + 15, 196, signatureY + 15);
  
  // Add footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.text("Generated on " + new Date().toLocaleString(), 14, pageHeight - 10);
  
  return doc;
};
