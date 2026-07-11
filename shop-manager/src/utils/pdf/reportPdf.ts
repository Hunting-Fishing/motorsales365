
import { jsPDF } from "jspdf";
import 'jspdf-autotable';
import { configurePdf, addFooter } from "./pdfConfig";
import { generateFallbackChart } from './chartGenerator';

/**
 * Generate a report PDF with better formatting and charts
 */
export const generateReportPdf = (
  title: string, 
  data: any[], 
  columns: { header: string, dataKey: string }[],
  summaryData?: Record<string, any>,
  chartUrl?: string
) => {
  // Create new PDF document
  const doc = new jsPDF();
  
  // Configure document with branding
  configurePdf(doc, title);
  
  // Add report summary if provided
  let startY = 50;
  if (summaryData) {
    doc.setFontSize(11);
    doc.text("Report Summary:", 14, startY);
    startY += 5;
    
    doc.setFontSize(10);
    Object.entries(summaryData).forEach(([key, value], index) => {
      const displayValue = typeof value === 'number' ? value.toFixed(2) : value.toString();
      doc.text(`${key}: ${displayValue}`, 14, startY + (index * 5));
    });
    
    startY += Object.keys(summaryData).length * 5 + 10;
  }
  
  // Add chart image if provided (from a base64 URL)
  if (chartUrl) {
    try {
      doc.addImage(chartUrl, 'PNG', 14, startY, 180, 80);
      startY += 90;
    } catch (err) {
      console.error('Failed to add chart image to PDF:', err);
      
      // If the provided chartUrl fails, try to generate a fallback chart
      try {
        // Create a simple fallback chart using the data
        const chartData = data.slice(0, 5).map(row => ({
          name: row[columns[0].dataKey] || 'Unknown',
          value: typeof row[columns[1].dataKey] === 'number' ? 
            row[columns[1].dataKey] : 
            Number(row[columns[1].dataKey]) || 0
        }));
        
        const fallbackChartUrl = generateFallbackChart(chartData, 'bar');
        doc.addImage(fallbackChartUrl, 'PNG', 14, startY, 180, 80);
        startY += 90;
      } catch (fallbackErr) {
        console.error('Failed to generate fallback chart:', fallbackErr);
        // Continue without chart if fallback also fails
      }
    }
  }
  
  // Add data table
  doc.autoTable({
    startY: startY,
    head: [columns.map(col => col.header)],
    body: data.map(row => columns.map(col => 
      row[col.dataKey] !== undefined ? 
        (typeof row[col.dataKey] === 'number' ? 
          row[col.dataKey].toFixed(2) : 
          row[col.dataKey].toString()) : 
        ''
    )),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [66, 139, 202] },
    alternateRowStyles: { fillColor: [249, 249, 249] },
    margin: { top: startY, right: 14, bottom: 20, left: 14 },
  });
  
  // Add generation metadata
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`Report generated on: ${new Date().toLocaleString()}`, 14, finalY);
  
  // Add footer
  addFooter(doc);
  
  return doc;
};
