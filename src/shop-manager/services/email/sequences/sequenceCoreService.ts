
import { supabase } from '@/lib/supabase';
import { EmailSequence } from '@/types/email';
import { GenericResponse } from '../utils/supabaseHelper';

/**
 * Core service for basic email sequence operations (CRUD)
 */
export const sequenceCoreService = {
  /**
   * Get all sequences
   * @returns Array of all sequences
   */
  async getSequences(): Promise<GenericResponse<EmailSequence[]>> {
    try {
      const { data, error } = await supabase
        .from('email_sequences')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      // Convert database records to EmailSequence objects with empty steps array
      const sequences: EmailSequence[] = data.map(record => ({
        id: record.id,
        name: record.name,
        description: record.description,
        steps: [], // Initialize with empty steps, can be populated later if needed
        created_at: record.created_at,
        updated_at: record.updated_at,
        shop_id: record.shop_id,
        created_by: record.created_by,
        trigger_type: record.trigger_type as 'manual' | 'event' | 'schedule',
        trigger_event: record.trigger_event,
        is_active: record.is_active,
        // UI support
        triggerType: record.trigger_type as 'manual' | 'event' | 'schedule',
        triggerEvent: record.trigger_event,
        isActive: record.is_active,
        createdAt: record.created_at,
        updatedAt: record.updated_at
      }));
      
      return { data: sequences, error: null };
    } catch (error) {
      console.error('Error getting sequences:', error);
      return { data: [], error };
    }
  },

  /**
   * Get a sequence by ID
   * @param id The sequence ID
   * @returns The sequence with its steps
   */
  async getSequenceById(id: string): Promise<GenericResponse<EmailSequence>> {
    try {
      // First get the sequence details
      const { data, error } = await supabase
        .from('email_sequences')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) throw error;
      
      // Convert database record to EmailSequence with empty steps array
      const sequence: EmailSequence = {
        id: data.id,
        name: data.name,
        description: data.description,
        steps: [], // Initialize with empty steps, to be populated next
        created_at: data.created_at,
        updated_at: data.updated_at,
        shop_id: data.shop_id,
        created_by: data.created_by,
        trigger_type: data.trigger_type as 'manual' | 'event' | 'schedule',
        trigger_event: data.trigger_event,
        is_active: data.is_active,
        // UI support
        triggerType: data.trigger_type as 'manual' | 'event' | 'schedule',
        triggerEvent: data.trigger_event,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
      
      return { data: sequence, error: null };
    } catch (error) {
      console.error('Error getting sequence by ID:', error);
      return { data: null, error };
    }
  },

  /**
   * Create a new email sequence
   * @param sequence The sequence to create
   * @returns The created sequence
   */
  async createSequence(sequence: Partial<EmailSequence>): Promise<GenericResponse<EmailSequence>> {
    try {
      const { data, error } = await supabase
        .from('email_sequences')
        .insert({
          name: sequence.name,
          description: sequence.description,
          trigger_type: sequence.trigger_type || sequence.triggerType || 'manual',
          trigger_event: sequence.trigger_event || sequence.triggerEvent,
          is_active: sequence.is_active !== undefined ? sequence.is_active : (sequence.isActive || false)
        })
        .select()
        .single();
        
      if (error) throw error;
      
      const formattedSequence = {
        id: data.id,
        name: data.name,
        description: data.description,
        steps: [], // Initialize with empty steps array
        created_at: data.created_at,
        updated_at: data.updated_at,
        shop_id: data.shop_id,
        created_by: data.created_by,
        trigger_type: data.trigger_type,
        trigger_event: data.trigger_event,
        is_active: data.is_active,
        // UI support
        triggerType: data.trigger_type,
        triggerEvent: data.trigger_event,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      } as EmailSequence;
      
      return { data: formattedSequence, error: null };
    } catch (error) {
      console.error('Error creating email sequence:', error);
      return { data: null, error };
    }
  },

  /**
   * Update an email sequence
   * @param sequenceId The ID of the sequence to update
   * @param sequence The updated sequence data
   * @returns The updated sequence
   */
  async updateSequence(
    sequenceId: string,
    sequence: Partial<EmailSequence>
  ): Promise<GenericResponse<EmailSequence>> {
    try {
      const { data, error } = await supabase
        .from('email_sequences')
        .update({
          name: sequence.name,
          description: sequence.description,
          trigger_type: sequence.trigger_type || sequence.triggerType,
          trigger_event: sequence.trigger_event || sequence.triggerEvent,
          is_active: sequence.is_active !== undefined ? sequence.is_active : sequence.isActive
        })
        .eq('id', sequenceId)
        .select()
        .single();
        
      if (error) throw error;
      
      const formattedSequence = {
        id: data.id,
        name: data.name,
        description: data.description,
        steps: [], // Initialize with empty steps array
        created_at: data.created_at,
        updated_at: data.updated_at,
        shop_id: data.shop_id,
        created_by: data.created_by,
        trigger_type: data.trigger_type,
        trigger_event: data.trigger_event,
        is_active: data.is_active,
        // UI support
        triggerType: data.trigger_type,
        triggerEvent: data.trigger_event,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      } as EmailSequence;
      
      return { data: formattedSequence, error: null };
    } catch (error) {
      console.error(`Error updating email sequence ${sequenceId}:`, error);
      return { data: null, error };
    }
  },

  /**
   * Delete an email sequence
   * @param sequenceId The ID of the sequence to delete
   * @returns Whether the deletion was successful
   */
  async deleteSequence(sequenceId: string): Promise<GenericResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('email_sequences')
        .delete()
        .eq('id', sequenceId);
        
      if (error) throw error;
      
      return { data: true, error: null };
    } catch (error) {
      console.error(`Error deleting email sequence ${sequenceId}:`, error);
      return { data: false, error };
    }
  }
};
