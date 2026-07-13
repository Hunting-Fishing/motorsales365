import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload, 
  Download, 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  X,
  FileSpreadsheet,
  Database
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImportExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (file: File, options: ImportOptions) => Promise<ImportResult>;
  onExport: (options: ExportOptions) => Promise<void>;
  selectedItemIds?: string[];
}

interface ImportOptions {
  overwriteExisting: boolean;
  validateData: boolean;
  skipInvalid: boolean;
}

interface ExportOptions {
  format: 'csv' | 'xlsx' | 'json';
  includeImages: boolean;
  selectedOnly: boolean;
}

interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: string[];
}

export function ImportExportDialog({
  isOpen,
  onClose,
  onImport,
  onExport,
  selectedItemIds = []
}: ImportExportDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  
  // Import state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importOptions, setImportOptions] = useState<ImportOptions>({
    overwriteExisting: false,
    validateData: true,
    skipInvalid: true
  });
  
  // Export state
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    includeImages: false,
    selectedOnly: selectedItemIds.length > 0
  });

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];
      
      if (validTypes.includes(file.type)) {
        setSelectedFile(file);
        setImportResult(null);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please select a CSV or Excel file",
          variant: "destructive"
        });
      }
    }
  }, [toast]);

  const handleImport = async () => {
    if (!selectedFile) return;
    
    setImporting(true);
    setProgress(0);
    
    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);
      
      const result = await onImport(selectedFile, importOptions);
      
      clearInterval(progressInterval);
      setProgress(100);
      setImportResult(result);
      
      if (result.success) {
        toast({
          title: "Import completed",
          description: `Successfully imported ${result.imported} items`,
        });
      } else {
        toast({
          title: "Import completed with errors",
          description: `Imported ${result.imported} items, ${result.failed} failed`,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Import failed",
        description: "An error occurred during import",
        variant: "destructive"
      });
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setProgress(0);
    
    try {
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 15, 90));
      }, 100);
      
      await onExport(exportOptions);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      toast({
        title: "Export completed",
        description: "Your file has been downloaded",
      });
      
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error) {
      toast({
        title: "Export failed",
        description: "An error occurred during export",
        variant: "destructive"
      });
    } finally {
      setExporting(false);
    }
  };

  const resetDialog = () => {
    setSelectedFile(null);
    setImportResult(null);
    setProgress(0);
    setImporting(false);
    setExporting(false);
  };

  const handleClose = () => {
    resetDialog();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Import & Export Inventory
          </DialogTitle>
          <DialogDescription>
            Import inventory data from files or export your current inventory
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'import' | 'export')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="import" className="gap-2">
              <Upload className="h-4 w-4" />
              Import
            </TabsTrigger>
            <TabsTrigger value="export" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="space-y-4">
            <div className="space-y-4">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm font-medium">
                    {selectedFile ? selectedFile.name : 'Click to select a file'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports CSV, XLS, XLSX files
                  </p>
                </label>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium">Import Options</h4>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={importOptions.overwriteExisting}
                      onChange={(e) => setImportOptions(prev => ({ 
                        ...prev, 
                        overwriteExisting: e.target.checked 
                      }))}
                      className="rounded border border-input"
                    />
                    <span className="text-sm">Overwrite existing items</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={importOptions.validateData}
                      onChange={(e) => setImportOptions(prev => ({ 
                        ...prev, 
                        validateData: e.target.checked 
                      }))}
                      className="rounded border border-input"
                    />
                    <span className="text-sm">Validate data before import</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={importOptions.skipInvalid}
                      onChange={(e) => setImportOptions(prev => ({ 
                        ...prev, 
                        skipInvalid: e.target.checked 
                      }))}
                      className="rounded border border-input"
                    />
                    <span className="text-sm">Skip invalid rows</span>
                  </label>
                </div>
              </div>

              {importing && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Importing...</span>
                    <span className="text-sm font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}

              {importResult && (
                <Alert className={importResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                  {importResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription>
                    {importResult.success ? (
                      `Successfully imported ${importResult.imported} items`
                    ) : (
                      <>
                        Imported {importResult.imported} items, {importResult.failed} failed
                        {importResult.errors.length > 0 && (
                          <ul className="mt-2 text-xs">
                            {importResult.errors.slice(0, 3).map((error, index) => (
                              <li key={index}>• {error}</li>
                            ))}
                          </ul>
                        )}
                      </>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>

          <TabsContent value="export" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Export Options</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Format</label>
                    <div className="flex gap-2 mt-1">
                      {(['csv', 'xlsx', 'json'] as const).map((format) => (
                        <Button
                          key={format}
                          variant={exportOptions.format === format ? "default" : "outline"}
                          size="sm"
                          onClick={() => setExportOptions(prev => ({ ...prev, format }))}
                        >
                          {format.toUpperCase()}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={exportOptions.includeImages}
                        onChange={(e) => setExportOptions(prev => ({ 
                          ...prev, 
                          includeImages: e.target.checked 
                        }))}
                        className="rounded border border-input"
                      />
                      <span className="text-sm">Include image URLs</span>
                    </label>
                    
                    {selectedItemIds.length > 0 && (
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={exportOptions.selectedOnly}
                          onChange={(e) => setExportOptions(prev => ({ 
                            ...prev, 
                            selectedOnly: e.target.checked 
                          }))}
                          className="rounded border border-input"
                        />
                        <span className="text-sm">
                          Export selected items only ({selectedItemIds.length} items)
                        </span>
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {exporting && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Exporting...</span>
                    <span className="text-sm font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          
          {activeTab === 'import' ? (
            <Button
              onClick={handleImport}
              disabled={!selectedFile || importing}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {importing ? 'Importing...' : 'Import'}
            </Button>
          ) : (
            <Button
              onClick={handleExport}
              disabled={exporting}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {exporting ? 'Exporting...' : 'Export'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}