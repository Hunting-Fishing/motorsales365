
import React from 'react';
import { ServiceHierarchyExcelView } from '@/components/developer/service-management/ServiceHierarchyExcelView';
import { useServiceSectors } from '@/hooks/useServiceCategories';
import * as XLSX from 'xlsx';
import { toast } from '@/hooks/use-toast';

export function ServiceExcelViewPage() {
  const { sectors } = useServiceSectors();
  const allCategories = sectors.flatMap(sector => sector.categories);

  const handleDownload = () => {
    try {
      // Build data rows for Excel
      const rows: Array<Record<string, string | number | undefined>> = [];
      
      allCategories.forEach(category => {
        category.subcategories.forEach(subcategory => {
          subcategory.jobs.forEach(job => {
            rows.push({
              'Category': category.name,
              'Subcategory': subcategory.name,
              'Service Name': job.name,
              'Description': job.description || '',
              'Price': job.price || 'N/A',
              'Est. Time (min)': job.estimatedTime || 'N/A'
            });
          });
        });
      });

      // Create workbook and worksheet
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Services');

      // Auto-size columns
      const colWidths = [
        { wch: 20 }, // Category
        { wch: 20 }, // Subcategory
        { wch: 30 }, // Service Name
        { wch: 50 }, // Description
        { wch: 10 }, // Price
        { wch: 15 }  // Est. Time
      ];
      worksheet['!cols'] = colWidths;

      // Download file
      XLSX.writeFile(workbook, 'service-hierarchy.xlsx');
      
      toast({
        title: 'Download Complete',
        description: 'Service hierarchy exported to Excel successfully.',
      });
    } catch (error) {
      console.error('Excel download failed:', error);
      toast({
        title: 'Download Failed',
        description: 'Unable to export service hierarchy.',
        variant: 'destructive',
      });
    }
  };

  return (
    <ServiceHierarchyExcelView 
      categories={allCategories}
      onDownload={handleDownload}
    />
  );
}
