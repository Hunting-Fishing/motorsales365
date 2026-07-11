import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Upload, FileSpreadsheet } from 'lucide-react';
import { useInventoryImportExport } from '@/hooks/inventory/useInventoryImportExport';

export function ImportExportButtons() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isImporting, isExporting, exportToExcel, importFromExcel, downloadTemplate } = useInventoryImportExport();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await importFromExcel(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={downloadTemplate}
      >
        <FileSpreadsheet className="h-4 w-4 mr-2" />
        Template
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={isImporting}
      >
        <Upload className="h-4 w-4 mr-2" />
        {isImporting ? 'Importing...' : 'Import'}
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={exportToExcel}
        disabled={isExporting}
      >
        <Download className="h-4 w-4 mr-2" />
        {isExporting ? 'Exporting...' : 'Export'}
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
