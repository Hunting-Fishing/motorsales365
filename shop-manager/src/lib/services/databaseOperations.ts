
import { supabase } from '@/integrations/supabase/client';

export async function clearAllServiceData(): Promise<void> {
  try {
    console.log('Clearing all service data from database...');
    
    // Delete in reverse order of dependencies to avoid foreign key constraints
    console.log('Deleting service jobs...');
    const { error: jobsError } = await supabase
      .from('service_jobs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows
    
    if (jobsError) {
      console.error('Error deleting service jobs:', jobsError);
      throw new Error(`Failed to delete service jobs: ${jobsError.message}`);
    }
    
    console.log('Deleting service subcategories...');
    const { error: subcategoriesError } = await supabase
      .from('service_subcategories')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows
    
    if (subcategoriesError) {
      console.error('Error deleting service subcategories:', subcategoriesError);
      throw new Error(`Failed to delete service subcategories: ${subcategoriesError.message}`);
    }
    
    console.log('Deleting service categories...');
    const { error: categoriesError } = await supabase
      .from('service_categories')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows
    
    if (categoriesError) {
      console.error('Error deleting service categories:', categoriesError);
      throw new Error(`Failed to delete service categories: ${categoriesError.message}`);
    }
    
    console.log('Deleting service sectors...');
    const { error: sectorsError } = await supabase
      .from('service_sectors')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows
    
    if (sectorsError) {
      console.error('Error deleting service sectors:', sectorsError);
      throw new Error(`Failed to delete service sectors: ${sectorsError.message}`);
    }
    
    console.log('Successfully cleared all service data from database');
  } catch (error) {
    console.error('Error clearing service data:', error);
    throw error;
  }
}

export async function getServiceCounts(): Promise<{
  sectors: number;
  categories: number;
  subcategories: number;
  jobs: number;
}> {
  try {
    console.log('Getting service counts...');
    
    const [sectorsResult, categoriesResult, subcategoriesResult, jobsResult] = await Promise.all([
      supabase.from('service_sectors').select('id', { count: 'exact', head: true }),
      supabase.from('service_categories').select('id', { count: 'exact', head: true }),
      supabase.from('service_subcategories').select('id', { count: 'exact', head: true }),
      supabase.from('service_jobs').select('id', { count: 'exact', head: true })
    ]);
    
    const counts = {
      sectors: sectorsResult.count || 0,
      categories: categoriesResult.count || 0,
      subcategories: subcategoriesResult.count || 0,
      jobs: jobsResult.count || 0
    };
    
    console.log('Service counts:', counts);
    return counts;
  } catch (error) {
    console.error('Error getting service counts:', error);
    throw error;
  }
}

export async function testDatabaseConnection(): Promise<boolean> {
  try {
    console.log('Testing database connection...');
    
    // Simple test query
    const { data, error } = await supabase
      .from('service_sectors')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
    
    console.log('Database connection test successful');
    return true;
  } catch (error) {
    console.error('Database connection test error:', error);
    return false;
  }
}
