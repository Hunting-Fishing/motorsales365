import { supabase } from '@/integrations/supabase/client';
import { ServiceMainCategory, ServiceSubcategory, ServiceJob, ServiceSector } from '@/types/service';

export interface ServiceDatabaseOperations {
  fetchAllCategories: () => Promise<ServiceMainCategory[]>;
  importFromExcel: (data: any[]) => Promise<void>;
  searchServices: (query: string) => Promise<ServiceJob[]>;
  bulkUpdateServices: (updates: any[]) => Promise<void>;
}

export const fetchServiceCategories = async (): Promise<ServiceMainCategory[]> => {
  try {
    // Fetch all categories, subcategories, and jobs in separate optimized queries
    const [categoriesResult, subcategoriesResult, jobsResult] = await Promise.all([
      supabase
        .from('service_categories')
        .select('*')
        .order('position', { ascending: true }),
      supabase
        .from('service_subcategories')
        .select('*')
        .order('position', { ascending: true }),
      supabase
        .from('service_jobs')
        .select('*')
        .order('position', { ascending: true })
    ]);

    if (categoriesResult.error) throw categoriesResult.error;
    if (subcategoriesResult.error) throw subcategoriesResult.error;
    if (jobsResult.error) throw jobsResult.error;

    // Build the hierarchical structure efficiently
    const hierarchicalCategories: ServiceMainCategory[] = categoriesResult.data.map(category => {
      const categorySubcategories = subcategoriesResult.data
        .filter(sub => sub.category_id === category.id)
        .map(subcategory => {
          const subcategoryJobs = jobsResult.data
            .filter(job => job.subcategory_id === subcategory.id)
            .map(job => ({
              id: job.id,
              name: job.name,
              description: job.description,
              estimatedTime: job.estimated_time,
              price: job.price,
              subcategory_id: job.subcategory_id
            } as ServiceJob));

          return {
            id: subcategory.id,
            name: subcategory.name,
            description: subcategory.description,
            jobs: subcategoryJobs,
            category_id: subcategory.category_id
          } as ServiceSubcategory;
        });

      return {
        id: category.id,
        name: category.name,
        description: category.description,
        subcategories: categorySubcategories,
        position: category.position
      } as ServiceMainCategory;
    });

    return hierarchicalCategories;
  } catch (error) {
    console.error('Error fetching service categories:', error);
    throw error;
  }
};

export const searchServices = async (query: string, limit: number = 100): Promise<ServiceJob[]> => {
  try {
    const { data, error } = await supabase
      .from('service_jobs')
      .select(`
        *,
        service_subcategories!inner (
          name,
          service_categories!inner (
            name
          )
        )
      `)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .limit(limit);

    if (error) throw error;

    return data.map(job => ({
      id: job.id,
      name: job.name,
      description: job.description,
      estimatedTime: job.estimated_time,
      price: job.price,
      subcategory_id: job.subcategory_id
    }));
  } catch (error) {
    console.error('Error searching services:', error);
    throw error;
  }
};

export const importExcelData = async (excelData: any[]): Promise<void> => {
  try {
    // Process Excel data in batches to handle large datasets
    const BATCH_SIZE = 100;
    const categories = new Map<string, any>();
    const subcategories = new Map<string, any>();
    const jobs: any[] = [];

    // Parse Excel data and organize it
    excelData.forEach((row, index) => {
      if (!row.category || !row.job_name) return;

      const categoryKey = row.category.trim();
      const subcategoryKey = `${categoryKey}_${(row.subcategory || 'General').trim()}`;

      if (!categories.has(categoryKey)) {
        categories.set(categoryKey, {
          name: categoryKey,
          description: row.category_description || null,
          position: categories.size + 1
        });
      }

      if (!subcategories.has(subcategoryKey)) {
        subcategories.set(subcategoryKey, {
          name: (row.subcategory || 'General').trim(),
          description: row.subcategory_description || null,
          category_name: categoryKey,
          position: subcategories.size + 1
        });
      }

      jobs.push({
        name: row.job_name.trim(),
        description: row.job_description || null,
        estimated_time: row.estimated_time ? parseInt(row.estimated_time) : null,
        price: row.price ? parseFloat(row.price) : null,
        category_name: categoryKey,
        subcategory_name: (row.subcategory || 'General').trim(),
        position: index + 1
      });
    });

    // Insert categories first
    const categoryArray = Array.from(categories.values());
    const { data: insertedCategories, error: categoriesError } = await supabase
      .from('service_categories')
      .upsert(categoryArray, { onConflict: 'name' })
      .select();

    if (categoriesError) throw categoriesError;

    // Create category lookup map
    const categoryLookup = new Map(
      insertedCategories.map(cat => [cat.name, cat.id])
    );

    // Insert subcategories with category_id references
    const subcategoryArray = Array.from(subcategories.values()).map(sub => ({
      ...sub,
      category_id: categoryLookup.get(sub.category_name)
    }));

    const { data: insertedSubcategories, error: subcategoriesError } = await supabase
      .from('service_subcategories')
      .upsert(subcategoryArray, { onConflict: 'name,category_id' })
      .select();

    if (subcategoriesError) throw subcategoriesError;

    // Create subcategory lookup map
    const subcategoryLookup = new Map(
      insertedSubcategories.map(sub => [`${sub.name}_${categoryLookup.get(sub.category_id)}`, sub.id])
    );

    // Insert jobs in batches
    for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
      const batch = jobs.slice(i, i + BATCH_SIZE).map(job => ({
        ...job,
        subcategory_id: subcategoryLookup.get(`${job.subcategory_name}_${categoryLookup.get(job.category_name)}`)
      })).filter(job => job.subcategory_id); // Only include jobs with valid subcategory references

      const { error: jobsError } = await supabase
        .from('service_jobs')
        .upsert(batch, { onConflict: 'name,subcategory_id' });

      if (jobsError) throw jobsError;
    }

    console.log(`Successfully imported ${jobs.length} jobs across ${categoryArray.length} categories`);
  } catch (error) {
    console.error('Error importing Excel data:', error);
    throw error;
  }
};

export const updateServiceCategory = async (id: string, updates: Partial<ServiceMainCategory>) => {
  const { error } = await supabase
    .from('service_categories')
    .update(updates)
    .eq('id', id);
  
  if (error) throw error;
};

export const deleteServiceCategory = async (id: string) => {
  const { error } = await supabase
    .from('service_categories')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

export const bulkUpdateServices = async (updates: any[]): Promise<void> => {
  const BATCH_SIZE = 50;
  
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);
    
    for (const update of batch) {
      const { error } = await supabase
        .from('service_jobs')
        .update(update.data)
        .eq('id', update.id);
      
      if (error) throw error;
    }
  }
};
