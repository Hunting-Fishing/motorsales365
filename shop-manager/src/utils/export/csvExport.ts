
import { Parser } from "@json2csv/plainjs";
import { getFormattedDate } from './utils';

/**
 * Export data as CSV
 */
export const exportToCSV = (data: any[], title: string) => {
  try {
    const parser = new Parser();
    const csv = parser.parse(data);
    
    // Create a blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${title}_${getFormattedDate()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error('Failed to export as CSV:', err);
    throw new Error('Failed to export as CSV');
  }
};
