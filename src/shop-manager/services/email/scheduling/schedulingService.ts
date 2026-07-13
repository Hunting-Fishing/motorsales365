
import { supabase } from '@/lib/supabase';
import { GenericResponse, parseJsonField, prepareForSupabase } from '../utils/supabaseHelper';

export interface SequenceProcessingSchedule {
  enabled: boolean;
  cron: string;
  sequence_ids?: string[];
}

/**
 * Service for handling email processing schedules
 */
export const schedulingService = {
  /**
   * Get the sequence processing schedule
   * @returns Processing schedule configuration
   */
  async getSequenceProcessingSchedule(): Promise<GenericResponse<SequenceProcessingSchedule>> {
    try {
      // Use a direct query to the email_system_settings table
      const { data, error } = await supabase
        .from('email_system_settings')
        .select('value')
        .eq('key', 'processing_schedule')
        .maybeSingle();
        
      if (error) {
        console.error('Error fetching sequence processing schedule:', error);
        return {
          data: { enabled: false, cron: '0 * * * *' },
          error
        };
      }
      
      if (!data) {
        return {
          data: { enabled: false, cron: '0 * * * *' },
          error: null
        };
      }
      
      // Parse the settings from the value field
      const settings = parseJsonField<Record<string, any>>(data.value, {});
      
      return {
        data: {
          enabled: settings.enabled === true,
          cron: settings.cron || '0 * * * *',
          sequence_ids: settings.sequence_ids || []
        },
        error: null
      };
    } catch (error) {
      console.error('Error getting sequence processing schedule:', error);
      return {
        data: { enabled: false, cron: '0 * * * *' },
        error
      };
    }
  },

  /**
   * Update the sequence processing schedule
   * @param config Schedule configuration
   * @returns Success status
   */
  async updateSequenceProcessingSchedule(config: { 
    cron?: string; 
    enabled: boolean;
    sequence_ids?: string[];
  }): Promise<GenericResponse<SequenceProcessingSchedule>> {
    try {
      // Check for existing schedule
      const { data: existingData, error: fetchError } = await supabase
        .from('email_system_settings')
        .select('value')
        .eq('key', 'processing_schedule')
        .maybeSingle();
      
      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }
      
      // Get existing values or defaults
      const existingSettings = existingData ? parseJsonField<Record<string, any>>(existingData.value, {}) : {};
      
      // Prepare the value to store
      const valueToStore = {
        enabled: config.enabled,
        cron: config.cron || existingSettings.cron || '0 * * * *',
        sequence_ids: config.sequence_ids || existingSettings.sequence_ids || []
      };
      
      // Convert to Supabase-compatible format
      const jsonValue = prepareForSupabase(valueToStore);
      
      if (existingData) {
        // Update existing record
        const { data, error } = await supabase
          .from('email_system_settings')
          .update({ value: jsonValue })
          .eq('key', 'processing_schedule')
          .select()
          .single();
        
        if (error) throw error;
        
        return {
          data: valueToStore,
          error: null
        };
      } else {
        // Create new record
        const { data, error } = await supabase
          .from('email_system_settings')
          .insert({
            key: 'processing_schedule',
            value: jsonValue
          })
          .select()
          .single();
        
        if (error) throw error;
        
        return {
          data: valueToStore,
          error: null
        };
      }
    } catch (error) {
      console.error('Error updating sequence processing schedule:', error);
      return { 
        data: null, 
        error 
      };
    }
  }
};
