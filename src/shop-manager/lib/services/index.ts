
// Updated index with cleaner exports
export * from './serviceApi';
export * from './serviceUtils';

// Folder-based import functions
export { 
  importServicesFromStorage
} from './folderBasedImportService';

// Service data processor functions
export { 
  processServiceDataFromSheets,
  importProcessedDataToDatabase,
  validateServiceData,
  optimizeDatabasePerformance
} from './serviceDataProcessor';

// Database operations
export { 
  clearAllServiceData,
  getServiceCounts
} from './databaseOperations';

// Excel processing utilities - consolidated with proper exports
export { 
  mapExcelToServiceHierarchy,
  processExcelFile,
  processExcelFileFromStorage,
  processMultipleExcelFiles,
  validateExcelData
} from './excelProcessor';

// Storage utility functions
export { 
  getStorageBucketInfo,
  getFolderFiles,
  getAllSectorFiles
} from './storageUtils';

// Bucket viewer service
export { bucketViewerService } from './bucketViewerService';

// Export all types from the consolidated types file
export type * from '@/types/service';
