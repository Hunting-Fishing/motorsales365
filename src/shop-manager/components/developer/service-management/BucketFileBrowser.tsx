
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Folder, FileText, Download } from 'lucide-react';
import { bucketViewerService } from '@/lib/services/bucketViewerService';
import type { SectorFiles, StorageFile } from '@/types/service';

interface BucketFileBrowserProps {
  onImportSelected: (selectedData: { sectorName: string; files: StorageFile[] }[]) => void;
  isImporting: boolean;
}

export function BucketFileBrowser({ onImportSelected, isImporting }: BucketFileBrowserProps) {
  const [sectorFiles, setSectorFiles] = useState<SectorFiles[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  const loadSectorFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading sector files from bucket...');
      
      const files = await bucketViewerService.getAllSectorFiles();
      console.log('Loaded sector files:', files);
      
      setSectorFiles(files);
    } catch (err) {
      console.error('Error loading sector files:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load bucket files';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSectorFiles();
  }, []);

  const toggleFileSelection = (sectorName: string, fileName: string) => {
    const fileKey = `${sectorName}/${fileName}`;
    const newSelection = new Set(selectedFiles);
    
    if (newSelection.has(fileKey)) {
      newSelection.delete(fileKey);
    } else {
      newSelection.add(fileKey);
    }
    
    setSelectedFiles(newSelection);
  };

  const toggleSectorSelection = (sectorName: string, files: StorageFile[]) => {
    const newSelection = new Set(selectedFiles);
    const sectorFileKeys = files.map(file => `${sectorName}/${file.name}`);
    
    const allSelected = sectorFileKeys.every(key => newSelection.has(key));
    
    if (allSelected) {
      // Deselect all files in this sector
      sectorFileKeys.forEach(key => newSelection.delete(key));
    } else {
      // Select all files in this sector
      sectorFileKeys.forEach(key => newSelection.add(key));
    }
    
    setSelectedFiles(newSelection);
  };

  const handleImport = () => {
    const selectedData: { sectorName: string; files: StorageFile[] }[] = [];
    
    sectorFiles.forEach(sector => {
      const selectedSectorFiles = sector.excelFiles.filter(file => 
        selectedFiles.has(`${sector.sectorName}/${file.name}`)
      );
      
      if (selectedSectorFiles.length > 0) {
        selectedData.push({
          sectorName: sector.sectorName,
          files: selectedSectorFiles
        });
      }
    });
    
    if (selectedData.length > 0) {
      onImportSelected(selectedData);
    }
  };

  const getSelectedCount = () => selectedFiles.size;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading bucket files...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <Alert variant="destructive">
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
          <Button 
            onClick={loadSectorFiles}
            className="mt-4"
            variant="outline"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (sectorFiles.length === 0) {
    return (
      <Card>
        <CardContent className="py-6">
          <Alert>
            <AlertDescription>
              No files found in the service-data bucket. Upload Excel files organized by sector folders to get started.
            </AlertDescription>
          </Alert>
          <Button 
            onClick={loadSectorFiles}
            className="mt-4"
            variant="outline"
          >
            Refresh
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            Storage Files ({sectorFiles.length} sectors)
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {getSelectedCount()} files selected
            </span>
            <Button 
              onClick={handleImport}
              disabled={getSelectedCount() === 0 || isImporting}
              size="sm"
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Importing...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Import Selected
                </>
              )}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 max-h-96 overflow-y-auto">
        {sectorFiles.map((sector) => (
          <div key={sector.sectorName} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={sector.excelFiles.every(file => 
                    selectedFiles.has(`${sector.sectorName}/${file.name}`)
                  )}
                  onCheckedChange={() => toggleSectorSelection(sector.sectorName, sector.excelFiles)}
                />
                <Folder className="h-4 w-4 text-blue-500" />
                <span className="font-medium">{sector.sectorName}</span>
                <span className="text-sm text-muted-foreground">
                  ({sector.totalFiles} files)
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-6">
              {sector.excelFiles.map((file) => (
                <div 
                  key={file.name}
                  className="flex items-center gap-2 p-2 rounded border bg-slate-50 hover:bg-slate-100"
                >
                  <Checkbox
                    checked={selectedFiles.has(`${sector.sectorName}/${file.name}`)}
                    onCheckedChange={() => toggleFileSelection(sector.sectorName, file.name)}
                  />
                  <FileText className="h-3 w-3 text-green-600" />
                  <span className="text-sm truncate flex-1" title={file.name}>
                    {file.name}
                  </span>
                  {file.size && (
                    <span className="text-xs text-muted-foreground">
                      {Math.round(file.size / 1024)}KB
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
