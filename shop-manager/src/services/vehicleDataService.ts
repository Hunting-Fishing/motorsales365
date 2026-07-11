
import { supabase } from '@/integrations/supabase/client';
import { CarMake, CarModel } from '@/types/vehicle';

/**
 * Fetch all available car makes from the database
 */
export const fetchMakes = async (): Promise<CarMake[]> => {
  try {
    console.log('🔄 Fetching vehicle makes from database...');
    const { data, error } = await supabase
      .from('vehicle_makes')
      .select('*')
      .order('make_display');

    if (error) {
      console.error('❌ Database error fetching makes:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return [];
    }

    console.log(`✅ Successfully fetched ${data?.length || 0} vehicle makes`);
    return data || [];
  } catch (error) {
    console.error('❌ Unexpected error fetching makes:', error);
    return [];
  }
};

/**
 * Fetch models for a specific make
 */
export const fetchModels = async (makeId: string): Promise<CarModel[]> => {
  try {
    if (!makeId) {
      console.log('⚠️ No makeId provided to fetchModels');
      return [];
    }

    console.log(`🔄 Fetching vehicle models for make: ${makeId}`);
    const { data, error } = await supabase
      .from('vehicle_models')
      .select('*')
      .eq('make_id', makeId)
      .order('model_display');

    if (error) {
      console.error('❌ Database error fetching models:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        makeId
      });
      return [];
    }

    console.log(`✅ Successfully fetched ${data?.length || 0} models for make: ${makeId}`);
    
    // Transform database fields to match CarModel interface
    return (data || []).map(model => ({
      id: model.id,
      make_id: model.make_id,
      model_id: model.model_id,
      model_name: model.model_display, // Use model_display as model_name
      model_display: model.model_display,
      created_at: model.created_at,
      updated_at: model.updated_at
    }));
  } catch (error) {
    console.error('❌ Unexpected error fetching models:', error);
    return [];
  }
};
