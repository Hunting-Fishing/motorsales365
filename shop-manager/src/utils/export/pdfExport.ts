
import { generateReportPdf, savePdf } from '../pdf';

/**
 * Export data as PDF with enhanced formatting
 */
export const exportToPDF = (data: any[], title: string, columns: { header: string, dataKey: string }[]) => {
  try {
    // Generate the PDF using our enhanced generator
    const doc = generateReportPdf(title, data, columns);
    
    // Save the PDF
    savePdf(doc, title);
  } catch (err) {
    console.error('Failed to export as PDF:', err);
    throw new Error('Failed to export as PDF');
  }
};
