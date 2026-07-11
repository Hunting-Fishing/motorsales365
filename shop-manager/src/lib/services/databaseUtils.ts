
import { supabase } from '@/integrations/supabase/client';

export async function validateDatabaseStructure() {
  try {
    console.log('Validating database structure for service tables...');
    
    const results = [];
    
    // Check service_sectors table
    try {
      const { data, error } = await supabase
        .from('service_sectors')
        .select('*')
        .limit(1);
      
      if (error) {
        console.error('Error accessing table service_sectors:', error);
        results.push({ table: 'service_sectors', accessible: false, error: error.message });
      } else {
        console.log('Table service_sectors is accessible');
        results.push({ table: 'service_sectors', accessible: true, error: null });
      }
    } catch (err) {
      console.error('Exception accessing table service_sectors:', err);
      results.push({ table: 'service_sectors', accessible: false, error: err instanceof Error ? err.message : 'Unknown error' });
    }

    // Check service_categories table
    try {
      const { data, error } = await supabase
        .from('service_categories')
        .select('*')
        .limit(1);
      
      if (error) {
        console.error('Error accessing table service_categories:', error);
        results.push({ table: 'service_categories', accessible: false, error: error.message });
      } else {
        console.log('Table service_categories is accessible');
        results.push({ table: 'service_categories', accessible: true, error: null });
      }
    } catch (err) {
      console.error('Exception accessing table service_categories:', err);
      results.push({ table: 'service_categories', accessible: false, error: err instanceof Error ? err.message : 'Unknown error' });
    }

    // Check service_subcategories table
    try {
      const { data, error } = await supabase
        .from('service_subcategories')
        .select('*')
        .limit(1);
      
      if (error) {
        console.error('Error accessing table service_subcategories:', error);
        results.push({ table: 'service_subcategories', accessible: false, error: error.message });
      } else {
        console.log('Table service_subcategories is accessible');
        results.push({ table: 'service_subcategories', accessible: true, error: null });
      }
    } catch (err) {
      console.error('Exception accessing table service_subcategories:', err);
      results.push({ table: 'service_subcategories', accessible: false, error: err instanceof Error ? err.message : 'Unknown error' });
    }

    // Check service_jobs table
    try {
      const { data, error } = await supabase
        .from('service_jobs')
        .select('*')
        .limit(1);
      
      if (error) {
        console.error('Error accessing table service_jobs:', error);
        results.push({ table: 'service_jobs', accessible: false, error: error.message });
      } else {
        console.log('Table service_jobs is accessible');
        results.push({ table: 'service_jobs', accessible: true, error: null });
      }
    } catch (err) {
      console.error('Exception accessing table service_jobs:', err);
      results.push({ table: 'service_jobs', accessible: false, error: err instanceof Error ? err.message : 'Unknown error' });
    }
    
    return results;
  } catch (error) {
    console.error('Error validating database structure:', error);
    throw error;
  }
}

export async function testDatabaseOperations() {
  try {
    console.log('Testing basic database operations...');
    
    // Test insert operation
    const testSector = {
      name: `test_sector_${Date.now()}`,
      description: 'Test sector for validation',
      position: 999
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('service_sectors')
      .insert(testSector)
      .select()
      .single();
    
    if (insertError) {
      console.error('Insert test failed:', insertError);
      return { success: false, error: insertError.message };
    }
    
    console.log('Insert test successful:', insertData);
    
    // Test delete operation to clean up
    const { error: deleteError } = await supabase
      .from('service_sectors')
      .delete()
      .eq('id', insertData.id);
    
    if (deleteError) {
      console.error('Delete test failed:', deleteError);
    } else {
      console.log('Delete test successful');
    }
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Error testing database operations:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
