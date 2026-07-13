
import { supabase } from '@/integrations/supabase/client';
import type { ServiceSector, ServiceMainCategory, ServiceSubcategory, ServiceJob } from '@/types/service';

export async function fetchServiceSectors(): Promise<ServiceSector[]> {
  try {
    console.log('Fetching service sectors from database...');
    
    const { data: sectors, error: sectorsError } = await supabase
      .from('service_sectors')
      .select(`
        id,
        name,
        description,
        position,
        is_active,
        service_categories (
          id,
          name,
          description,
          position,
          service_subcategories (
            id,
            name,
            description,
            service_jobs (
              id,
              name,
              description,
              estimated_time,
              price
            )
          )
        )
      `)
      .eq('is_active', true)
      .order('position', { ascending: true });
    
    if (sectorsError) {
      console.error('Error fetching service sectors:', sectorsError);
      throw new Error(`Failed to fetch service sectors: ${sectorsError.message}`);
    }
    
    if (!sectors) {
      console.log('No sectors found');
      return [];
    }
    
    // Transform the data to match our type structure
    const transformedSectors: ServiceSector[] = sectors.map(sector => ({
      id: sector.id,
      name: sector.name,
      description: sector.description || undefined,
      position: sector.position || undefined,
      is_active: sector.is_active,
      categories: (sector.service_categories || []).map(category => ({
        id: category.id,
        name: category.name,
        description: category.description || undefined,
        position: category.position || undefined,
        sector_id: sector.id,
        subcategories: (category.service_subcategories || []).map(subcategory => ({
          id: subcategory.id,
          name: subcategory.name,
          description: subcategory.description || undefined,
          category_id: category.id,
          jobs: (subcategory.service_jobs || []).map(job => ({
            id: job.id,
            name: job.name,
            description: job.description || undefined,
            estimatedTime: job.estimated_time || undefined,
            price: job.price || undefined,
            subcategory_id: subcategory.id
          }))
        }))
      }))
    }));
    
    console.log(`Fetched ${transformedSectors.length} service sectors`);
    return transformedSectors;
  } catch (error) {
    console.error('Error in fetchServiceSectors:', error);
    throw error;
  }
}

export async function fetchServiceCategories(): Promise<ServiceMainCategory[]> {
  try {
    console.log('Fetching service categories from database...');
    
    const { data: categories, error: categoriesError } = await supabase
      .from('service_categories')
      .select(`
        id,
        name,
        description,
        position,
        sector_id,
        service_subcategories (
          id,
          name,
          description,
          service_jobs (
            id,
            name,
            description,
            estimated_time,
            price
          )
        )
      `)
      .order('position', { ascending: true });
    
    if (categoriesError) {
      console.error('Error fetching service categories:', categoriesError);
      throw new Error(`Failed to fetch service categories: ${categoriesError.message}`);
    }
    
    if (!categories) {
      console.log('No categories found');
      return [];
    }
    
    // Transform the data to match our type structure
    const transformedCategories: ServiceMainCategory[] = categories.map(category => ({
      id: category.id,
      name: category.name,
      description: category.description || undefined,
      position: category.position || undefined,
      sector_id: category.sector_id || undefined,
      subcategories: (category.service_subcategories || []).map(subcategory => ({
        id: subcategory.id,
        name: subcategory.name,
        description: subcategory.description || undefined,
        category_id: category.id,
        jobs: (subcategory.service_jobs || []).map(job => ({
          id: job.id,
          name: job.name,
          description: job.description || undefined,
          estimatedTime: job.estimated_time || undefined,
          price: job.price || undefined,
          subcategory_id: subcategory.id
        }))
      }))
    }));
    
    console.log(`Fetched ${transformedCategories.length} service categories`);
    return transformedCategories;
  } catch (error) {
    console.error('Error in fetchServiceCategories:', error);
    throw error;
  }
}
