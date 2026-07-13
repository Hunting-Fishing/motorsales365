
import { useServiceImport } from './useServiceImport';
import { useServiceData } from './useServiceData';
import { useServiceDatabase } from './useServiceDatabase';
import { useFileBasedServiceImport } from '@/hooks/useFileBasedServiceImport';
import { importServicesFromStorage } from '@/lib/services';

export const useServiceManagement = () => {
  const { sectors, isRefreshing, refreshData } = useServiceData();
  const { isClearing, clearDatabase } = useServiceDatabase();
  const { 
    isImporting, 
    importProgress, 
    startImport, 
    updateProgress, 
    completeImport, 
    failImport, 
    cancelImport 
  } = useServiceImport();
  const { importSelectedFiles } = useFileBasedServiceImport();

  const handleServiceImport = async () => {
    startImport();

    try {
      const result = await importServicesFromStorage(updateProgress);
      
      if (result.success) {
        completeImport(result.message);
        
        // Wait a bit then refresh live data
        setTimeout(async () => {
          await refreshData();
        }, 1000);
      } else {
        failImport(result.message);
      }
    } catch (error) {
      console.error('Live service import failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Live service import failed';
      failImport(errorMessage);
    }
  };

  const importFromStorage = async (files: File[]) => {
    if (files.length === 0) return;

    startImport();

    try {
      await importSelectedFiles(files);
      
      completeImport(`Processed ${files.length} file(s) and saved to live database.`);

      setTimeout(async () => {
        await refreshData();
      }, 1000);

    } catch (error) {
      console.error('Live file import failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Live file import failed';
      failImport(errorMessage);
    }
  };

  const handleClearDatabase = async () => {
    await clearDatabase();
  };

  const handleCancel = () => {
    cancelImport();
  };

  const handleRefreshData = async () => {
    await refreshData();
  };

  return {
    sectors,
    isImporting,
    isClearing,
    importProgress,
    handleServiceImport,
    importFromStorage,
    handleClearDatabase,
    handleCancel,
    handleRefreshData
  };
};
