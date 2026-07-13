
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { processExcelFileFromStorage } from '@/lib/services/excelProcessor';
import { clearAllServiceData, testDatabaseConnection } from '@/lib/services/databaseOperations';
import type { StorageFile } from '@/types/service';

export const useFileBasedServiceImport = () => {
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  const importSelectedFiles = async (files: File[] | StorageFile[]) => {
    setIsImporting(true);
    
    try {
      console.log('Starting file-based import for', files.length, 'files');
      
      // Test database connection first
      const connectionOk = await testDatabaseConnection();
      if (!connectionOk) {
        throw new Error('Database connection failed. Please check your connection and try again.');
      }
      
      // Process each file
      for (const file of files) {
        const fileName = file instanceof File ? file.name : (file as StorageFile).name;
        console.log(`Processing file: ${fileName}`);
        
        // Process the file using the excel processor if it's from storage
        if (!(file instanceof File) && (file as StorageFile).path) {
          await processExcelFileFromStorage((file as StorageFile).path || fileName, 'default');
        }
      }
      
      toast({
        title: "Import Successful",
        description: `Successfully processed ${files.length} file(s).`,
        variant: "default",
      });
      
    } catch (error) {
      console.error('File import failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'File import failed';
      
      toast({
        title: "Import Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw error;
    } finally {
      setIsImporting(false);
    }
  };

  const importFromBucket = async (selectedData: { sectorName: string; files: StorageFile[] }[]) => {
    setIsImporting(true);
    
    try {
      console.log('Starting bucket import for', selectedData.length, 'sectors');
      
      // Test database connection first
      const connectionOk = await testDatabaseConnection();
      if (!connectionOk) {
        throw new Error('Database connection failed. Please check your connection and try again.');
      }
      
      let totalFiles = 0;
      let processedFiles = 0;
      let successfulFiles = 0;
      
      // Calculate total files
      selectedData.forEach(sector => {
        totalFiles += sector.files.length;
        console.log(`Sector: ${sector.sectorName}, Files: ${sector.files.length}`);
      });
      
      if (totalFiles === 0) {
        throw new Error('No files selected for import');
      }
      
      // Clear existing data before importing
      console.log('Clearing existing service data...');
      await clearAllServiceData();
      
      // Show progress for clearing
      toast({
        title: "Preparing Import",
        description: "Cleared existing data, starting file processing...",
        variant: "default",
      });
      
      // Process each sector and file
      for (const sectorData of selectedData) {
        console.log(`Processing sector: ${sectorData.sectorName}`);
        
        for (const file of sectorData.files) {
          processedFiles++;
          
          try {
            console.log(`Processing file: ${file.name} in sector ${sectorData.sectorName}`);
            
            // Process the Excel file from storage
            const result = await processExcelFileFromStorage(file.path || file.name, sectorData.sectorName);
            
            if (result.success) {
              successfulFiles++;
              console.log(`Successfully processed ${file.name}:`, result);
            } else {
              console.error(`Failed to process ${file.name}:`, result.message);
            }
            
            // Show progress every few files
            if (processedFiles % 3 === 0 || processedFiles === totalFiles) {
              toast({
                title: "Processing Files",
                description: `Processed ${processedFiles}/${totalFiles} files (${successfulFiles} successful)...`,
                variant: "default",
              });
            }
            
          } catch (fileError) {
            console.error(`Error processing file ${file.name}:`, fileError);
            const errorMessage = fileError instanceof Error ? fileError.message : 'Unknown error';
            
            // Don't show toast for individual file errors, just log them
            console.error(`File processing error for ${file.name}: ${errorMessage}`);
          }
        }
      }
      
      if (successfulFiles > 0) {
        toast({
          title: "Bucket Import Completed",
          description: `Successfully imported ${successfulFiles}/${totalFiles} file(s) from ${selectedData.length} sector(s) to live database.`,
          variant: "default",
        });
      } else {
        throw new Error('No files were successfully processed. Check console for detailed error messages.');
      }
      
    } catch (error) {
      console.error('Bucket import failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Bucket import failed';
      
      toast({
        title: "Import Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw error;
    } finally {
      setIsImporting(false);
    }
  };

  return {
    importSelectedFiles,
    importFromBucket,
    isImporting
  };
};
