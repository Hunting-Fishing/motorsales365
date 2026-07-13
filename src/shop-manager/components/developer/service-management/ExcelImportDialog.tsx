
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import * as XLSX from 'xlsx';

interface ExcelImportDialogProps {
  onImportComplete: (data: any[]) => void;
}

interface ImportProgress {
  stage: string;
  progress: number;
  message: string;
}

export function ExcelImportDialog({ onImportComplete }: ExcelImportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [importResults, setImportResults] = useState<any>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportProgress({ stage: 'reading', progress: 10, message: 'Reading Excel file...' });

    try {
      const arrayBuffer = await file.arrayBuffer();
      
      setImportProgress({ stage: 'parsing', progress: 30, message: 'Parsing Excel structure...' });
      
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetsData: any[] = [];
      
      let totalSheets = workbook.SheetNames.length;
      
      for (let i = 0; i < totalSheets; i++) {
        const sheetName = workbook.SheetNames[i];
        
        setImportProgress({
          stage: 'processing',
          progress: 30 + (i / totalSheets) * 50,
          message: `Processing sheet: ${sheetName}...`
        });
        
        const worksheet = workbook.Sheets[sheetName];
        const sheetData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
          blankrows: false
        }) as any[][];
        
        if (sheetData.length > 0) {
          // Parse the sheet data into our service hierarchy format
          const parsedData = parseServiceSheet(sheetData, sheetName);
          if (parsedData) {
            sheetsData.push(parsedData);
          }
        }
      }
      
      setImportProgress({ stage: 'complete', progress: 100, message: 'Import completed successfully!' });
      
      setImportResults({
        totalSheets: sheetsData.length,
        totalServices: sheetsData.reduce((acc, sheet) => acc + sheet.services.length, 0),
        data: sheetsData
      });
      
      onImportComplete(sheetsData);
      
    } catch (error) {
      console.error('Import failed:', error);
      setImportProgress({ 
        stage: 'error', 
        progress: 0, 
        message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    } finally {
      setTimeout(() => {
        setIsImporting(false);
        setImportProgress(null);
      }, 2000);
    }
  };

  const parseServiceSheet = (data: any[][], sheetName: string) => {
    if (data.length < 2) return null;
    
    const headers = data[0] as string[];
    const services: any[] = [];
    
    // Find the column indices for our expected columns
    const categoryIndex = headers.findIndex(h => h && h.toLowerCase().includes('category'));
    const subcategoryIndex = headers.findIndex(h => h && h.toLowerCase().includes('subcategory'));
    const serviceIndex = headers.findIndex(h => h && (h.toLowerCase().includes('service') || h.toLowerCase().includes('name')));
    const priceIndex = headers.findIndex(h => h && h.toLowerCase().includes('price'));
    const timeIndex = headers.findIndex(h => h && (h.toLowerCase().includes('time') || h.toLowerCase().includes('hour')));
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;
      
      const service = {
        id: `${sheetName}-${i}`,
        sector: sheetName,
        category: categoryIndex >= 0 ? row[categoryIndex] || '' : '',
        subcategory: subcategoryIndex >= 0 ? row[subcategoryIndex] || '' : '',
        serviceName: serviceIndex >= 0 ? row[serviceIndex] || '' : '',
        description: '',
        estimatedTime: timeIndex >= 0 ? parseFloat(row[timeIndex]) || 0 : 0,
        price: priceIndex >= 0 ? parseFloat(row[priceIndex]) || 0 : 0
      };
      
      // Only add if we have at least a service name
      if (service.serviceName.trim()) {
        services.push(service);
      }
    }
    
    return {
      sheetName,
      services,
      totalRows: data.length - 1
    };
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center space-x-2">
          <Upload className="h-4 w-4" />
          <span>Import Excel Data</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileSpreadsheet className="h-5 w-5" />
            <span>Import Service Hierarchy</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {!isImporting && !importResults && (
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                Upload your Excel file containing the service hierarchy data. The system will automatically parse and import your service structure.
              </div>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="excel-upload"
                />
                <label htmlFor="excel-upload" className="cursor-pointer">
                  <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <div className="text-sm font-medium">Click to upload Excel file</div>
                  <div className="text-xs text-gray-500 mt-1">Supports .xlsx and .xls files</div>
                </label>
              </div>
            </div>
          )}
          
          {isImporting && importProgress && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                {importProgress.stage === 'error' ? (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                ) : (
                  <FileSpreadsheet className="h-5 w-5 text-blue-500" />
                )}
                <span className="text-sm font-medium">{importProgress.message}</span>
              </div>
              
              {importProgress.stage !== 'error' && (
                <Progress value={importProgress.progress} className="w-full" />
              )}
            </div>
          )}
          
          {importResults && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm font-medium">Import Successful!</span>
              </div>
              
              <div className="bg-green-50 rounded-lg p-4 space-y-2">
                <div className="text-sm">
                  <strong>Imported:</strong> {importResults.totalSheets} sheets
                </div>
                <div className="text-sm">
                  <strong>Total services:</strong> {importResults.totalServices}
                </div>
              </div>
              
              <Button onClick={() => setIsOpen(false)} className="w-full">
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
