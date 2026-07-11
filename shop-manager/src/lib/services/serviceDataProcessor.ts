
import { supabase } from '@/integrations/supabase/client';
import type { MappedServiceData, ImportProgress, ProcessedServiceData, ImportStats } from '@/types/service';

export async function processServiceDataFromSheets(sheetsData: any[], updateProgress?: (progress: ImportProgress) => void): Promise<ProcessedServiceData> {
  const sectors = [];
  const stats: ImportStats = {
    totalSectors: 0,
    totalCategories: 0,
    totalSubcategories: 0,
    totalServices: 0,
    filesProcessed: 0
  };

  try {
    updateProgress?.({
      stage: 'processing',
      message: 'Processing Excel sheets...',
      progress: 10,
      completed: false,
      error: null
    });

    // Process each sheet
    for (let i = 0; i < sheetsData.length; i++) {
      const sheetData = sheetsData[i];
      const progress = 10 + (i / sheetsData.length) * 70;
      
      updateProgress?.({
        stage: 'processing',
        message: `Processing sheet ${i + 1} of ${sheetsData.length}...`,
        progress,
        completed: false,
        error: null
      });

      // Process the sheet data and add to sectors
      // This is a simplified version - you might need to adapt based on your Excel structure
      if (sheetData && Array.isArray(sheetData) && sheetData.length > 0) {
        stats.filesProcessed++;
        // Add processing logic here
      }
    }

    updateProgress?.({
      stage: 'complete',
      message: 'Service data processing completed',
      progress: 100,
      completed: true,
      error: null
    });

    return {
      sectors,
      stats
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during processing';
    updateProgress?.({
      stage: 'error',
      message: errorMessage,
      progress: 0,
      completed: false,
      error: errorMessage
    });
    throw error;
  }
}

export async function importProcessedDataToDatabase(data: MappedServiceData, updateProgress?: (progress: ImportProgress) => void): Promise<void> {
  try {
    updateProgress?.({
      stage: 'importing',
      message: 'Starting database import...',
      progress: 0,
      completed: false,
      error: null
    });

    console.log('Importing processed data to database...');
    
    // Create or get sector
    let sectorId: string;
    const { data: existingSector, error: sectorSelectError } = await supabase
      .from('service_sectors')
      .select('id')
      .eq('name', data.sectorName)
      .maybeSingle();
    
    if (sectorSelectError) {
      throw new Error(`Error checking for existing sector: ${sectorSelectError.message}`);
    }
    
    if (existingSector) {
      sectorId = existingSector.id;
      console.log(`Using existing sector: ${data.sectorName} (${sectorId})`);
    } else {
      const { data: newSector, error: sectorInsertError } = await supabase
        .from('service_sectors')
        .insert({ name: data.sectorName, description: `Services for ${data.sectorName}` })
        .select('id')
        .single();
      
      if (sectorInsertError) {
        throw new Error(`Error creating sector: ${sectorInsertError.message}`);
      }
      
      sectorId = newSector.id;
      console.log(`Created new sector: ${data.sectorName} (${sectorId})`);
    }

    updateProgress?.({
      stage: 'importing',
      message: 'Processing categories...',
      progress: 20,
      completed: false,
      error: null
    });
    
    // Process categories
    for (let catIndex = 0; catIndex < data.categories.length; catIndex++) {
      const category = data.categories[catIndex];
      const categoryProgress = 20 + (catIndex / data.categories.length) * 60;
      
      updateProgress?.({
        stage: 'importing',
        message: `Processing category: ${category.name}...`,
        progress: categoryProgress,
        completed: false,
        error: null
      });
      
      // Create or get category
      let categoryId: string;
      const { data: existingCategory, error: categorySelectError } = await supabase
        .from('service_categories')
        .select('id')
        .eq('name', category.name)
        .eq('sector_id', sectorId)
        .maybeSingle();
      
      if (categorySelectError) {
        throw new Error(`Error checking for existing category: ${categorySelectError.message}`);
      }
      
      if (existingCategory) {
        categoryId = existingCategory.id;
        console.log(`Using existing category: ${category.name} (${categoryId})`);
      } else {
        const { data: newCategory, error: categoryInsertError } = await supabase
          .from('service_categories')
          .insert({ 
            sector_id: sectorId,
            name: category.name, 
            description: `Services in ${category.name}` 
          })
          .select('id')
          .single();
        
        if (categoryInsertError) {
          throw new Error(`Error creating category: ${categoryInsertError.message}`);
        }
        
        categoryId = newCategory.id;
        console.log(`Created new category: ${category.name} (${categoryId})`);
      }
      
      // Process subcategories
      for (const subcategory of category.subcategories) {
        // Create or get subcategory
        let subcategoryId: string;
        const { data: existingSubcategory, error: subcategorySelectError } = await supabase
          .from('service_subcategories')
          .select('id')
          .eq('name', subcategory.name)
          .eq('category_id', categoryId)
          .maybeSingle();
        
        if (subcategorySelectError) {
          throw new Error(`Error checking for existing subcategory: ${subcategorySelectError.message}`);
        }
        
        if (existingSubcategory) {
          subcategoryId = existingSubcategory.id;
          console.log(`Using existing subcategory: ${subcategory.name} (${subcategoryId})`);
        } else {
          const { data: newSubcategory, error: subcategoryInsertError } = await supabase
            .from('service_subcategories')
            .insert({ 
              category_id: categoryId,
              name: subcategory.name, 
              description: `Services in ${subcategory.name}` 
            })
            .select('id')
            .single();
          
          if (subcategoryInsertError) {
            throw new Error(`Error creating subcategory: ${subcategoryInsertError.message}`);
          }
          
          subcategoryId = newSubcategory.id;
          console.log(`Created new subcategory: ${subcategory.name} (${subcategoryId})`);
        }
        
        // Process services/jobs
        for (const service of subcategory.services) {
          if (!service.name.trim()) continue;
          
          // Check if service already exists
          const { data: existingService, error: serviceSelectError } = await supabase
            .from('service_jobs')
            .select('id')
            .eq('name', service.name)
            .eq('subcategory_id', subcategoryId)
            .maybeSingle();
          
          if (serviceSelectError) {
            console.warn(`Error checking for existing service: ${serviceSelectError.message}`);
          }
          
          if (existingService) {
            console.log(`Service already exists: ${service.name} (${existingService.id})`);
            continue;
          }
          
          // Create new service
          const { error: serviceInsertError } = await supabase
            .from('service_jobs')
            .insert({
              subcategory_id: subcategoryId,
              name: service.name,
              description: service.description || null,
              estimated_time: service.estimatedTime > 0 ? service.estimatedTime : null,
              price: service.price > 0 ? service.price : null
            });
          
          if (serviceInsertError) {
            console.error(`Error creating service ${service.name}:`, serviceInsertError.message);
          } else {
            console.log(`Created new service: ${service.name}`);
          }
        }
      }
    }

    updateProgress?.({
      stage: 'complete',
      message: 'Database import completed successfully',
      progress: 100,
      completed: true,
      error: null
    });
    
    console.log('Successfully imported all data to database');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during import';
    updateProgress?.({
      stage: 'error',
      message: errorMessage,
      progress: 0,
      completed: false,
      error: errorMessage
    });
    console.error('Error importing data to database:', error);
    throw error;
  }
}

export function validateServiceData(data: any): boolean {
  if (!data || typeof data !== 'object') return false;
  if (!data.sectorName || typeof data.sectorName !== 'string') return false;
  if (!Array.isArray(data.categories)) return false;
  
  return data.categories.every((category: any) => {
    if (!category.name || typeof category.name !== 'string') return false;
    if (!Array.isArray(category.subcategories)) return false;
    
    return category.subcategories.every((subcategory: any) => {
      if (!subcategory.name || typeof subcategory.name !== 'string') return false;
      if (!Array.isArray(subcategory.services)) return false;
      
      return subcategory.services.every((service: any) => {
        return service.name && typeof service.name === 'string';
      });
    });
  });
}

export async function optimizeDatabasePerformance(): Promise<void> {
  // Database optimization is handled at the Supabase infrastructure level
  // This function is available for future custom optimization queries if needed
}
