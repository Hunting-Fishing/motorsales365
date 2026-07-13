
import { jsPDF } from "jspdf";

// Extend the jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

/**
 * Formats the current date as YYYY-MM-DD
 */
export const getFormattedDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

/**
 * Configure PDF document with company branding
 */
export const configurePdf = (doc: jsPDF, title: string) => {
  // Set default properties
  doc.setFontSize(20);
  doc.setTextColor(44, 62, 80); // Dark blue color for headings
  
  // Add title
  doc.text(title, 14, 22);
  
  // Add company info - this could be imported from a settings file in a real app
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("Auto Shop Management System", 14, 32);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 37);
  
  // Add a subtle header line
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.line(14, 40, 196, 40);
  
  return doc;
};

/**
 * Add footer with page numbers
 */
export const addFooter = (doc: jsPDF) => {
  // Access the page count directly from the internal pages array length
  const pageCount = doc.internal.pages.length - 1;
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${pageCount} | Auto Shop Management System`, 
      doc.internal.pageSize.getWidth() / 2, 
      doc.internal.pageSize.getHeight() - 10, 
      { align: "center" }
    );
  }
  
  return doc;
};

/**
 * Save or open a PDF document with proper name formatting
 */
export const savePdf = (doc: jsPDF, filename: string) => {
  const formattedFilename = `${filename}_${getFormattedDate()}.pdf`;
  doc.save(formattedFilename);
};
