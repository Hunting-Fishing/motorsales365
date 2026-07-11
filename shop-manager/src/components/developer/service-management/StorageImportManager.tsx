
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Database, Upload, Folder } from 'lucide-react';
import { BucketFileBrowser } from './BucketFileBrowser';
import { FileBasedImportSelector } from './FileBasedImportSelector';
import { ImportProgressIndicator } from './ImportProgressIndicator';
import { useFileBasedServiceImport } from '@/hooks/useFileBasedServiceImport';
import type { StorageFile } from '@/types/service';

interface StorageImportManagerProps {
  onImportComplete?: () => void;
  isImporting: boolean;
}

export function StorageImportManager({ onImportComplete, isImporting }: StorageImportManagerProps) {
  const { importSelectedFiles, importFromBucket } = useFileBasedServiceImport();
  const [importProgress, setImportProgress] = useState({
    currentStep: '',
    progress: 0,
    error: null as string | null,
    completed: false
  });

  const handleBucketImport = async (selectedData: { sectorName: string; files: StorageFile[] }[]) => {
    try {
      console.log('Importing selected bucket data:', selectedData);
      
      setImportProgress({
        currentStep: 'Starting import from bucket...',
        progress: 0,
        error: null,
        completed: false
      });
      
      await importFromBucket(selectedData);
      
      setImportProgress({
        currentStep: 'Import completed successfully!',
        progress: 100,
        error: null,
        completed: true
      });
      
      onImportComplete?.();
    } catch (error) {
      console.error('Error importing from bucket:', error);
      const errorMessage = error instanceof Error ? error.message : 'Import failed';
      
      setImportProgress({
        currentStep: 'Import failed',
        progress: 0,
        error: errorMessage,
        completed: false
      });
      
      throw error;
    }
  };

  const handleFileUpload = async (files: File[]) => {
    try {
      setImportProgress({
        currentStep: 'Processing uploaded files...',
        progress: 0,
        error: null,
        completed: false
      });
      
      await importSelectedFiles(files);
      
      setImportProgress({
        currentStep: 'File upload completed successfully!',
        progress: 100,
        error: null,
        completed: true
      });
      
      onImportComplete?.();
    } catch (error) {
      console.error('Error importing files:', error);
      const errorMessage = error instanceof Error ? error.message : 'File import failed';
      
      setImportProgress({
        currentStep: 'File import failed',
        progress: 0,
        error: errorMessage,
        completed: false
      });
      
      throw error;
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Import Services from Storage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <Database className="h-4 w-4" />
            <AlertDescription>
              Choose your import method below. Both methods will save services directly to the database.
            </AlertDescription>
          </Alert>

          <Tabs defaultValue="bucket" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="bucket" className="flex items-center gap-2">
                <Folder className="h-4 w-4" />
                Import from Bucket
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload Files
              </TabsTrigger>
            </TabsList>

            <TabsContent value="bucket" className="mt-6 space-y-4">
              <Alert>
                <Folder className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <div><strong>Bucket Import:</strong> Import all Excel files from the storage bucket</div>
                    <div><strong>Structure:</strong> service-data/ → sectors → Excel files → categories → services</div>
                    <div><strong>Processing:</strong> All files are processed and saved to the database</div>
                  </div>
                </AlertDescription>
              </Alert>
              
              <BucketFileBrowser 
                onImportSelected={handleBucketImport}
                isImporting={isImporting}
              />
            </TabsContent>

            <TabsContent value="upload" className="mt-6 space-y-4">
              <Alert>
                <Upload className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <div><strong>File Upload:</strong> Upload Excel files directly from your computer</div>
                    <div><strong>Processing:</strong> Each file becomes a service category</div>
                    <div><strong>Structure:</strong> Column A = subcategory, rows 2-1000 = services</div>
                  </div>
                </AlertDescription>
              </Alert>
              
              <FileBasedImportSelector 
                onImportFiles={handleFileUpload}
                isImporting={isImporting}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <ImportProgressIndicator 
        isImporting={isImporting}
        currentStep={importProgress.currentStep}
        progress={importProgress.progress}
        error={importProgress.error}
        completed={importProgress.completed}
      />
    </>
  );
}
