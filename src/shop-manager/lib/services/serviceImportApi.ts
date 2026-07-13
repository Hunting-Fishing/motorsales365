
import { supabase } from '@/integrations/supabase/client';

interface ExcelSheetData {
  sheetName: string;
  data: any[];
}

interface ImportResult {
  totalImported: number;
  categories: number;
  subcategories: number;
  jobs: number;
  errors: string[];
}

export const importServiceHierarchy = async (sheetsData: ExcelSheetData[]): Promise<ImportResult> => {
  const result: ImportResult = {
    totalImported: 0,
    categories: 0,
    subcategories: 0,
    jobs: 0,
    errors: []
  };

  try {
    console.log(`Starting import of ${sheetsData.length} categories from Excel data`);

    // Ensure we have the "Automotive Services" sector
    let { data: sector, error: sectorError } = await supabase
      .from('service_sectors')
      .select('id')
      .eq('name', 'Automotive Services')
      .single();

    if (sectorError || !sector) {
      console.log('Creating Automotive Services sector...');
      const { data: newSector, error: createError } = await supabase
        .from('service_sectors')
        .insert({
          name: 'Automotive Services',
          description: 'Professional automotive repair and maintenance services',
          position: 1,
          is_active: true
        })
        .select('id')
        .single();

      if (createError) {
        throw new Error(`Failed to create sector: ${createError.message}`);
      }
      sector = newSector;
    }

    const sectorId = sector.id;
    console.log(`Using sector ID: ${sectorId}`);

    // Process each sheet as a category
    for (const sheet of sheetsData) {
      try {
        console.log(`Processing category: ${sheet.sheetName}`);
        
        if (!sheet.data || sheet.data.length === 0) {
          console.log(`Skipping empty sheet: ${sheet.sheetName}`);
          continue;
        }

        // Create or get the category
        let { data: category, error: categoryError } = await supabase
          .from('service_categories')
          .select('id')
          .eq('name', sheet.sheetName)
          .eq('sector_id', sectorId)
          .single();

        if (categoryError || !category) {
          const { data: newCategory, error: createCategoryError } = await supabase
            .from('service_categories')
            .insert({
              name: sheet.sheetName,
              description: `${sheet.sheetName} services and repairs`,
              sector_id: sectorId,
              position: result.categories + 1
            })
            .select('id')
            .single();

          if (createCategoryError) {
            result.errors.push(`Failed to create category ${sheet.sheetName}: ${createCategoryError.message}`);
            continue;
          }
          category = newCategory;
          result.categories++;
        }

        const categoryId = category.id;

        // Process the sheet data
        const headers = sheet.data[0] || [];
        const dataRows = sheet.data.slice(1);

        console.log(`Processing ${headers.length} subcategories with ${dataRows.length} service rows`);

        // Create subcategories from headers
        for (let colIndex = 0; colIndex < headers.length; colIndex++) {
          const subcategoryName = headers[colIndex];
          if (!subcategoryName || subcategoryName.trim() === '') continue;

          // Create or get subcategory
          let { data: subcategory, error: subcategoryError } = await supabase
            .from('service_subcategories')
            .select('id')
            .eq('name', subcategoryName)
            .eq('category_id', categoryId)
            .single();

          if (subcategoryError || !subcategory) {
            const { data: newSubcategory, error: createSubcategoryError } = await supabase
              .from('service_subcategories')
              .insert({
                name: subcategoryName,
                description: `${subcategoryName} services`,
                category_id: categoryId,
                position: colIndex + 1
              })
              .select('id')
              .single();

            if (createSubcategoryError) {
              result.errors.push(`Failed to create subcategory ${subcategoryName}: ${createSubcategoryError.message}`);
              continue;
            }
            subcategory = newSubcategory;
            result.subcategories++;
          }

          const subcategoryId = subcategory.id;

          // Process service jobs in this column
          for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
            const jobName = dataRows[rowIndex]?.[colIndex];
            if (!jobName || jobName.trim() === '') continue;

            // Check if job already exists
            const { data: existingJob } = await supabase
              .from('service_jobs')
              .select('id')
              .eq('name', jobName)
              .eq('subcategory_id', subcategoryId)
              .single();

            if (!existingJob) {
              const { error: jobError } = await supabase
                .from('service_jobs')
                .insert({
                  name: jobName,
                  description: `${jobName} service`,
                  subcategory_id: subcategoryId,
                  position: rowIndex + 1,
                  estimated_time: 60, // Default 1 hour
                  price: 100 // Default price
                });

              if (jobError) {
                result.errors.push(`Failed to create job ${jobName}: ${jobError.message}`);
              } else {
                result.jobs++;
                result.totalImported++;
              }
            }
          }
        }

        console.log(`Completed processing category: ${sheet.sheetName}`);
      } catch (sheetError) {
        console.error(`Error processing sheet ${sheet.sheetName}:`, sheetError);
        result.errors.push(`Failed to process ${sheet.sheetName}: ${sheetError instanceof Error ? sheetError.message : 'Unknown error'}`);
      }
    }

    console.log(`Import completed. Total imported: ${result.totalImported}`);
    return result;

  } catch (error) {
    console.error('Import failed:', error);
    throw error;
  }
};
