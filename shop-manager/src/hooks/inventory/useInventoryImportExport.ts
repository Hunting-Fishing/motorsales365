import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

export function useInventoryImportExport() {
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      const { data: items, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      const worksheet = XLSX.utils.json_to_sheet(items || []);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');

      const fileName = `inventory_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast({
        title: "Export Successful",
        description: `Exported ${items?.length || 0} items to ${fileName}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export inventory data.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const importFromExcel = async (file: File) => {
    setIsImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Validate and transform data
      const itemsToImport = jsonData.map((row: any) => ({
        name: row.name || row.Name,
        sku: row.sku || row.SKU || row.part_number || row['Part Number'] || 'AUTO-' + Date.now(),
        description: row.description || row.Description,
        category: row.category || row.Category || 'General',
        supplier: row.supplier || row.Supplier || 'Unknown',
        quantity: Number(row.quantity || row.Quantity || 0),
        unit_price: Number(row.unit_price || row['Unit Price'] || 0),
        reorder_point: Number(row.reorder_point || row['Reorder Point'] || 0),
        location: row.location || row.Location,
        status: 'in_stock',
      }));

      // Insert items in batches
      const batchSize = 50;
      let imported = 0;

      for (let i = 0; i < itemsToImport.length; i += batchSize) {
        const batch = itemsToImport.slice(i, i + batchSize);
        const { error } = await supabase
          .from('inventory_items')
          .insert(batch);

        if (error) throw error;
        imported += batch.length;
      }

      toast({
        title: "Import Successful",
        description: `Imported ${imported} inventory items.`,
      });
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: "Failed to import inventory data. Check file format.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        name: 'Example Part',
        sku: 'P-12345',
        description: 'Example description',
        category: 'Engine Parts',
        supplier: 'NAPA',
        quantity: 10,
        unit_price: 25.99,
        reorder_point: 5,
        location: 'Shelf A1',
        status: 'in_stock'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');

    XLSX.writeFile(workbook, 'inventory_import_template.xlsx');

    toast({
      title: "Template Downloaded",
      description: "Import template has been downloaded.",
    });
  };

  return {
    isImporting,
    isExporting,
    exportToExcel,
    importFromExcel,
    downloadTemplate
  };
}
