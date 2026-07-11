
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface InventoryReportItem {
  Name: string;
  SKU: string;
  Description?: string;
  Price: number | string;
  Category?: string;
  Supplier?: string;
  Status?: string;
  Quantity: number | string;
  ReorderPoint?: number | string;
  [key: string]: any; // Allow for additional fields
}

export const generateInventoryReport = async (data: InventoryReportItem[]): Promise<void> => {
  try {
    // Create a new workbook
    const workbook = XLSX.utils.book_new();
    
    // Convert data to worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Set column widths
    const columnWidths = [
      { wch: 30 }, // Name
      { wch: 15 }, // SKU
      { wch: 40 }, // Description
      { wch: 10 }, // Price
      { wch: 15 }, // Category
      { wch: 20 }, // Supplier
      { wch: 15 }, // Status
      { wch: 10 }, // Quantity
      { wch: 15 }, // ReorderPoint
    ];
    
    worksheet['!cols'] = columnWidths;
    
    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');
    
    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    
    // Save file
    const fileName = `inventory-report-${new Date().toISOString().split('T')[0]}.xlsx`;
    const fileBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    saveAs(fileBlob, fileName);
    
    return Promise.resolve();
  } catch (error) {
    console.error('Error generating inventory report:', error);
    return Promise.reject(error);
  }
};

// CSV Export function
export const exportToCSV = (data: InventoryReportItem[], filename: string): void => {
  try {
    // Get headers from first object
    const headers = Object.keys(data[0]);
    
    // Convert data to CSV format
    let csvContent = headers.join(',') + '\r\n';
    
    // Add rows
    data.forEach(item => {
      const row = headers.map(header => {
        // Handle values that need to be quoted (contain commas, quotes, or newlines)
        let cell = item[header]?.toString() || '';
        if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
          // Escape quotes and wrap in quotes
          cell = '"' + cell.replace(/"/g, '""') + '"';
        }
        return cell;
      });
      csvContent += row.join(',') + '\r\n';
    });
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${filename}.csv`);
    
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    throw error;
  }
};

// PDF Export function using jsPDF
export const exportToPDF = (data: InventoryReportItem[], filename: string): void => {
  try {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text('Inventory Report', 14, 22);
    
    // Add date
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
    
    // Prepare table data
    const headers = ['Name', 'SKU', 'Category', 'Price', 'Qty', 'Status'];
    const tableData = data.map(item => [
      item.Name || '',
      item.SKU || '',
      item.Category || '',
      typeof item.Price === 'number' ? `$${item.Price.toFixed(2)}` : item.Price || '',
      item.Quantity?.toString() || '',
      item.Status || ''
    ]);
    
    // Add table using autoTable
    (doc as any).autoTable({
      head: [headers],
      body: tableData,
      startY: 40,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 139, 202] },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });
    
    // Save the PDF
    doc.save(`${filename}.pdf`);
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw error;
  }
};
