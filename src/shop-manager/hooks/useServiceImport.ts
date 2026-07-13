
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ImportProgress } from '@/types/service';

export const useServiceImport = () => {
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress>({
    stage: 'initial',
    message: '',
    progress: 0,
    completed: false,
    error: null
  });
  const { toast } = useToast();

  const startImport = () => {
    setIsImporting(true);
    setImportProgress({
      stage: 'starting',
      message: 'Starting import...',
      progress: 0,
      completed: false,
      error: null
    });
  };

  const updateProgress = (progress: ImportProgress) => {
    setImportProgress(progress);
  };

  const completeImport = (message: string) => {
    setImportProgress({
      stage: 'complete',
      message,
      progress: 100,
      completed: true,
      error: null
    });
    setIsImporting(false);
    
    toast({
      title: "Import Completed",
      description: message,
      variant: "default",
    });
  };

  const failImport = (error: string) => {
    setImportProgress({
      stage: 'error',
      message: error,
      progress: 0,
      completed: false,
      error
    });
    setIsImporting(false);
    
    toast({
      title: "Import Failed",
      description: error,
      variant: "destructive",
    });
  };

  const cancelImport = () => {
    setIsImporting(false);
    setImportProgress({
      stage: 'initial',
      message: '',
      progress: 0,
      completed: false,
      error: null
    });
  };

  return {
    isImporting,
    importProgress,
    startImport,
    updateProgress,
    completeImport,
    failImport,
    cancelImport
  };
};
