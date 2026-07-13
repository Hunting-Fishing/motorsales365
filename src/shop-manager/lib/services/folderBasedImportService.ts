
import { supabase } from '@/integrations/supabase/client';
import { processExcelFileFromStorage } from './excelProcessor';
import { SectorFiles, ImportProgress, ImportResult, ImportStats } from '@/types/service';
import { getAllSectorFiles } from './storageUtils';
import { clearAllServiceData } from './databaseOperations';

// Export the function that was missing
export { processExcelFileFromStorage };

export async function importServicesFromStorage(
  setProgress: (progress: ImportProgress) => void
): Promise<ImportResult> {
  try {
    setProgress({
      stage: 'initial',
      message: 'Starting service import from storage...',
      progress: 0,
      completed: false,
      error: null
    });

    // 1. Clear existing service data
    setProgress({
      stage: 'clearing',
      message: 'Clearing existing service data...',
      progress: 5,
      completed: false,
      error: null
    });
    await clearAllServiceData();

    // 2. Fetch all sector files
    setProgress({
      stage: 'fetching',
      message: 'Fetching sector files from storage...',
      progress: 10,
      completed: false,
      error: null
    });
    const sectorFiles: SectorFiles[] = await getAllSectorFiles();
    const totalFiles = sectorFiles.reduce((acc, sector) => acc + sector.totalFiles, 0);
    let filesProcessed = 0;

    if (!sectorFiles || sectorFiles.length === 0) {
      return {
        success: false,
        message: 'No sector files found in storage. Ensure files are properly organized.',
      };
    }

    let totalSectors = sectorFiles.length;
    let sectorsProcessed = 0;
    let categoriesProcessed = 0;
    let subcategoriesProcessed = 0;
    let jobsProcessed = 0;

    let stats: ImportStats = {
      totalSectors: 0,
      totalCategories: 0,
      totalSubcategories: 0,
      totalServices: 0,
      filesProcessed: 0
    };

    // Initialize stats
    stats.totalSectors = sectorFiles.length;
    stats.totalCategories = sectorFiles.length; // Each file becomes a category
    stats.totalSubcategories = 0;
    stats.totalServices = 0;

    // 3. Process each sector file
    for (const sectorFile of sectorFiles) {
      sectorsProcessed++;
      console.log(`Processing sector: ${sectorFile.sectorName}`);

      for (const file of sectorFile.excelFiles) {
        filesProcessed++;
        try {
          setProgress({
            stage: 'processing',
            message: `Processing file: ${file.name} in sector ${sectorFile.sectorName}...`,
            progress: 10 + (filesProcessed / totalFiles) * 80,
            completed: false,
            error: null,
            details: {
              sectorsProcessed,
              categoriesProcessed,
              subcategoriesProcessed,
              jobsProcessed,
              totalSectors,
              totalCategories: stats.totalCategories,
              totalSubcategories: stats.totalSubcategories,
              totalJobs: stats.totalServices
            }
          });

          const processedResult = await processExcelFileFromStorage(file.name, sectorFile.sectorName);

          if (processedResult.success) {
            // Update counters based on successful processing
            categoriesProcessed += 1; // Each file is one category
            // We'll estimate subcategories and services based on the stats if available
            if (processedResult.stats) {
              subcategoriesProcessed += processedResult.stats.totalSubcategories;
              jobsProcessed += processedResult.stats.totalServices;
            }
          } else {
            console.error(`Failed to process file ${file.name}:`, processedResult.message);
          }

        } catch (error: any) {
          console.error(`Error processing file ${file.name}:`, error);
          return {
            success: false,
            message: `Error processing file ${file.name}: ${error.message || error}`,
          };
        }
      }
    }

    // 4. Update progress to complete
    setProgress({
      stage: 'complete',
      message: 'Service import completed successfully!',
      progress: 100,
      completed: true,
      error: null,
      details: {
        sectorsProcessed,
        categoriesProcessed,
        subcategoriesProcessed,
        jobsProcessed,
        totalSectors,
        totalCategories: stats.totalCategories,
        totalSubcategories: stats.totalSubcategories,
        totalJobs: stats.totalServices
      }
    });

    stats.filesProcessed = filesProcessed;
    return {
      success: true,
      message: `Successfully imported services from ${sectorFiles.length} sectors, processing ${filesProcessed} files.`,
      stats: {
        totalSectors,
        totalCategories: categoriesProcessed,
        totalSubcategories: subcategoriesProcessed,
        totalServices: jobsProcessed,
        filesProcessed: filesProcessed
      }
    };

  } catch (error: any) {
    console.error('Service import failed:', error);
    setProgress({
      stage: 'error',
      message: `Service import failed: ${error.message || error}`,
      progress: 0,
      completed: false,
      error: error.message || 'Service import failed'
    });
    return {
      success: false,
      message: `Service import failed: ${error.message || error}`,
    };
  }
}
