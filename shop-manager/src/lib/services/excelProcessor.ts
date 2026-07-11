import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import type { MappedServiceData, ImportResult, ProcessedServiceData } from '@/types/service';

export async function processExcelFile(file: File, sectorName: string): Promise<ImportResult> {
  try {
    console.log(`Processing Excel file: ${file.name} for sector: ${sectorName}`);
    
    // Read the Excel file
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    
    // Get the first worksheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (!data || data.length < 2) {
      throw new Error('Excel file is empty or has no data rows');
    }
    
    // Process the data with the file name as category
    const categoryName = file.name.replace('.xlsx', '').replace('.xls', '');
    const processedData = await processServiceDataFromRows(data as any[][], sectorName, categoryName);
    
    return {
      success: true,
      message: `Successfully processed ${file.name}`,
      stats: {
        totalSectors: 1,
        totalCategories: 1,
        totalSubcategories: processedData.categories[0]?.subcategories?.length || 0,
        totalServices: processedData.categories[0]?.subcategories?.reduce((acc, sub) => acc + sub.services.length, 0) || 0,
        filesProcessed: 1
      }
    };
  } catch (error) {
    console.error('Error processing Excel file:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error processing Excel file'
    };
  }
}

export async function processExcelFileFromStorage(filePath: string, sectorName: string): Promise<ImportResult> {
  try {
    console.log(`Processing Excel file from storage: ${filePath} for sector: ${sectorName}`);
    
    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('service-data')
      .download(filePath);
    
    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }
    
    // Read the Excel file
    const buffer = await fileData.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    
    // Get the first worksheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (!data || data.length < 2) {
      throw new Error('Excel file is empty or has no data rows');
    }
    
    // Extract category name from file path
    const fileName = filePath.split('/').pop() || '';
    const categoryName = fileName.replace('.xlsx', '').replace('.xls', '');
    
    // Process the data
    const processedData = await processServiceDataFromRows(data as any[][], sectorName, categoryName);
    
    // Import to database
    await importProcessedDataToDatabase(processedData);
    
    return {
      success: true,
      message: `Successfully processed and imported ${fileName}`,
      stats: {
        totalSectors: 1,
        totalCategories: 1,
        totalSubcategories: processedData.categories[0]?.subcategories?.length || 0,
        totalServices: processedData.categories[0]?.subcategories?.reduce((acc, sub) => acc + sub.services.length, 0) || 0,
        filesProcessed: 1
      }
    };
  } catch (error) {
    console.error('Error processing Excel file from storage:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error processing Excel file from storage'
    };
  }
}

async function processServiceDataFromRows(rows: any[][], sectorName: string, categoryName: string): Promise<MappedServiceData> {
  console.log(`Processing ${rows.length} rows for sector: ${sectorName}, category: ${categoryName}`);
  
  // Skip header row and process data
  const dataRows = rows.slice(1);
  
  // Group services by subcategory
  const subcategoriesMap = new Map<string, any[]>();
  
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (!row || row.length < 2) continue;
    
    const subcategoryName = String(row[0] || '').trim();
    const serviceName = String(row[1] || '').trim();
    
    if (!subcategoryName || !serviceName) continue;
    
    const service = {
      name: serviceName,
      description: String(row[2] || '').trim(),
      estimatedTime: parseFloat(String(row[3] || '0')) || 0,
      price: parseFloat(String(row[4] || '0')) || 0
    };
    
    if (!subcategoriesMap.has(subcategoryName)) {
      subcategoriesMap.set(subcategoryName, []);
    }
    subcategoriesMap.get(subcategoryName)!.push(service);
  }
  
  // Convert to structured format
  const subcategories = Array.from(subcategoriesMap.entries()).map(([name, services]) => ({
    name,
    services
  }));
  
  return {
    sectorName,
    categories: [{
      name: categoryName,
      subcategories
    }]
  };
}

async function importProcessedDataToDatabase(data: MappedServiceData): Promise<void> {
  console.log('Importing processed data to database...');
  
  try {
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
    
    // Process categories
    for (const category of data.categories) {
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
    
    console.log('Successfully imported all data to database');
  } catch (error) {
    console.error('Error importing data to database:', error);
    throw error;
  }
}

export async function processMultipleExcelFiles(files: File[]): Promise<ImportResult> {
  let totalStats = {
    totalSectors: 0,
    totalCategories: 0,
    totalSubcategories: 0,
    totalServices: 0,
    filesProcessed: 0
  };
  
  const results: string[] = [];
  
  for (const file of files) {
    try {
      const result = await processExcelFile(file, 'General');
      if (result.success) {
        results.push(`✓ ${file.name}`);
        if (result.stats) {
          totalStats.totalCategories += result.stats.totalCategories;
          totalStats.totalSubcategories += result.stats.totalSubcategories;
          totalStats.totalServices += result.stats.totalServices;
          totalStats.filesProcessed += result.stats.filesProcessed;
        }
      } else {
        results.push(`✗ ${file.name}: ${result.message}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      results.push(`✗ ${file.name}: ${errorMessage}`);
    }
  }
  
  const successCount = results.filter(r => r.startsWith('✓')).length;
  
  return {
    success: successCount > 0,
    message: `Processed ${successCount}/${files.length} files successfully`,
    stats: totalStats
  };
}

export function mapExcelToServiceHierarchy(excelData: any[]): MappedServiceData {
  // This function is kept for backwards compatibility
  return {
    sectorName: 'Default',
    categories: []
  };
}

export function validateExcelData(data: any[]): boolean {
  return Array.isArray(data) && data.length > 1;
}
