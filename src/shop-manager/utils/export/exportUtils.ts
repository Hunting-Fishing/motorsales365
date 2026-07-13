
import { utils, write } from "xlsx";
import { getFormattedDate } from './utils';

/**
 * Generic data export interface
 */
export interface ExportOptions {
  filename?: string;
  sheetName?: string;
  includeTimestamp?: boolean;
}

/**
 * Export data as Excel with enhanced options
 */
export const exportToExcel = (data: any[], title: string, options: ExportOptions = {}) => {
  try {
    const {
      filename = title,
      sheetName = 'Sheet1',
      includeTimestamp = true
    } = options;

    const worksheet = utils.json_to_sheet(data);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, sheetName);
    
    // Generate file and trigger download
    const excelBuffer = write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const finalFilename = includeTimestamp 
      ? `${filename}_${getFormattedDate()}.xlsx`
      : `${filename}.xlsx`;
    
    link.download = finalFilename;
    link.click();
    
    // Cleanup
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Failed to export as Excel:', err);
    throw new Error('Failed to export as Excel');
  }
};

/**
 * Export data as CSV
 */
export const exportToCSV = (data: any[], title: string, options: ExportOptions = {}) => {
  try {
    const {
      filename = title,
      includeTimestamp = true
    } = options;

    // Convert to CSV
    const csvContent = convertToCSV(data);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const finalFilename = includeTimestamp 
      ? `${filename}_${getFormattedDate()}.csv`
      : `${filename}.csv`;
    
    link.download = finalFilename;
    link.click();
    
    // Cleanup
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Failed to export as CSV:', err);
    throw new Error('Failed to export as CSV');
  }
};

/**
 * Convert array of objects to CSV string
 */
const convertToCSV = (data: any[]): string => {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ];
  
  return csvRows.join('\n');
};

/**
 * Export multiple Excel worksheets with better organization
 */
export const exportMultiSheetExcel = (
  data: Record<string, any[]>, 
  title: string, 
  options: ExportOptions = {}
) => {
  try {
    const {
      filename = title,
      includeTimestamp = true
    } = options;

    const workbook = utils.book_new();
    
    // Add each data set as a separate worksheet
    Object.entries(data).forEach(([sheetName, sheetData]) => {
      if (sheetData.length > 0) {
        const worksheet = utils.json_to_sheet(sheetData);
        utils.book_append_sheet(workbook, worksheet, sheetName);
      }
    });
    
    // Generate file and trigger download
    const excelBuffer = write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const finalFilename = includeTimestamp 
      ? `${filename}_${getFormattedDate()}.xlsx`
      : `${filename}.xlsx`;
    
    link.download = finalFilename;
    link.click();
    
    // Cleanup
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Failed to export multi-sheet Excel:', err);
    throw new Error('Failed to export as Excel');
  }
};
