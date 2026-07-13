
import { supabase } from '@/lib/supabase';
import { EmailSequenceStep } from '@/types/email';
import { GenericResponse } from '../utils/supabaseHelper';

/**
 * Service for email sequence step operations
 */
export const sequenceStepService = {
  /**
   * Get all steps for a sequence
   * @param sequenceId The ID of the sequence
   * @returns Array of steps for the sequence
   */
  async getSequenceSteps(sequenceId: string): Promise<GenericResponse<EmailSequenceStep[]>> {
    try {
      const { data, error } = await supabase
        .from('email_sequence_steps')
        .select('*')
        .eq('sequence_id', sequenceId)
        .order('position', { ascending: true });
        
      if (error) throw error;
      
      return { 
        data: (data || []).map(step => ({
          id: step.id,
          sequence_id: step.sequence_id,
          name: step.name,
          template_id: step.template_id,
          position: step.position,
          order: step.position,
          delay_hours: step.delay_hours,
          delayHours: step.delay_hours,
          delay_type: step.delay_type,
          delayType: step.delay_type,
          isActive: step.is_active,
          created_at: step.created_at,
          updated_at: step.updated_at,
          // Add a default type since it doesn't exist in the database
          type: 'email', // Default to email type
          email_template_id: step.template_id,
          templateId: step.template_id,
          condition: step.condition_type ? {
            type: step.condition_type as 'event' | 'property',
            value: step.condition_value,
            operator: step.condition_operator as '=' | '!=' | '>' | '<' | '>=' | '<='
          } : undefined
        })), 
        error: null 
      };
    } catch (error) {
      console.error(`Error getting sequence steps for sequence ${sequenceId}:`, error);
      return { data: null, error };
    }
  },

  /**
   * Create a new sequence step
   * @param step The step to create
   * @returns The created step
   */
  async createSequenceStep(step: Partial<EmailSequenceStep>): Promise<GenericResponse<EmailSequenceStep>> {
    try {
      // Ensure required fields are present
      if (!step.sequence_id) {
        return {
          data: null,
          error: new Error('Sequence ID is required')
        };
      }
      
      // Prepare step data for insertion, mapping UI property names to database field names
      const stepData = {
        sequence_id: step.sequence_id,
        position: step.position || step.order || 0,
        delay_hours: step.delay_hours || step.delayHours || 0,
        delay_type: step.delay_type || step.delayType || 'hours',
        template_id: step.template_id || step.email_template_id || step.templateId,
        name: step.name,
        is_active: step.isActive !== undefined ? step.isActive : true // Change from is_active to isActive
      };
      
      const { data, error } = await supabase
        .from('email_sequence_steps')
        .insert(stepData)
        .select()
        .single();
        
      if (error) throw error;
      
      // Convert database record to EmailSequenceStep
      const createdStep: EmailSequenceStep = {
        id: data.id,
        sequence_id: data.sequence_id,
        order: data.position, // Map position to order
        delay_hours: data.delay_hours,
        delay_type: data.delay_type,
        email_template_id: data.template_id, // Map template_id to email_template_id
        template_id: data.template_id,
        created_at: data.created_at,
        updated_at: data.updated_at,
        // UI support
        name: data.name,
        // Add a default type since it doesn't exist in the database
        type: 'email', // Default to email type 
        templateId: data.template_id,
        delayHours: data.delay_hours,
        delayType: data.delay_type,
        position: data.position,
        isActive: data.is_active // Map is_active to isActive
      };
      
      return { data: createdStep, error: null };
    } catch (error) {
      console.error('Error creating sequence step:', error);
      return { data: null, error };
    }
  },

  /**
   * Update a sequence step
   * @param stepId The ID of the step to update
   * @param step The updated step data
   * @returns The updated step
   */
  async updateSequenceStep(
    stepId: string, 
    step: Partial<EmailSequenceStep>
  ): Promise<GenericResponse<EmailSequenceStep>> {
    try {
      const { data, error } = await supabase
        .from('email_sequence_steps')
        .update({
          name: step.name,
          template_id: step.template_id || step.templateId || step.email_template_id,
          position: step.position || step.order,
          delay_hours: step.delay_hours || step.delayHours,
          delay_type: step.delay_type || step.delayType,
          is_active: step.isActive, // Only use isActive property
          condition_type: step.condition?.type,
          condition_value: step.condition?.value,
          condition_operator: step.condition?.operator
        })
        .eq('id', stepId)
        .select()
        .single();
        
      if (error) throw error;
      
      return {
        data: {
          id: data.id,
          sequence_id: data.sequence_id,
          name: data.name,
          template_id: data.template_id,
          position: data.position,
          order: data.position,
          delay_hours: data.delay_hours,
          delayHours: data.delay_hours,
          delay_type: data.delay_type,
          delayType: data.delay_type,
          isActive: data.is_active,
          created_at: data.created_at,
          updated_at: data.updated_at,
          // Add a default type since it doesn't exist in the database
          type: 'email', // Default to email type
          email_template_id: data.template_id,
          templateId: data.template_id,
          condition: data.condition_type ? {
            type: data.condition_type as 'event' | 'property',
            value: data.condition_value,
            operator: data.condition_operator as '=' | '!=' | '>' | '<' | '>=' | '<='
          } : undefined
        },
        error: null
      };
    } catch (error) {
      console.error(`Error updating sequence step ${stepId}:`, error);
      return { data: null, error };
    }
  },

  /**
   * Delete a sequence step
   * @param stepId The ID of the step to delete
   * @returns Whether the deletion was successful
   */
  async deleteSequenceStep(stepId: string): Promise<GenericResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('email_sequence_steps')
        .delete()
        .eq('id', stepId);
        
      if (error) throw error;
      
      return { data: true, error: null };
    } catch (error) {
      console.error(`Error deleting sequence step ${stepId}:`, error);
      return { data: false, error };
    }
  },

  /**
   * Update a sequence step's active status
   * @param stepId The ID of the step to update
   * @param isActive Whether the step should be active
   */
  async updateStepActiveStatus(stepId: string, isActive: boolean): Promise<GenericResponse<EmailSequenceStep>> {
    try {
      const { data, error } = await supabase
        .from('email_sequence_steps')
        .update({ is_active: isActive }) // Using is_active for database field name
        .eq('id', stepId)
        .select()
        .single();
        
      if (error) throw error;
      
      // Convert database record to EmailSequenceStep
      const step: EmailSequenceStep = {
        id: data.id,
        sequence_id: data.sequence_id,
        order: data.position, // Map position to order
        delay_hours: data.delay_hours,
        delay_type: data.delay_type,
        email_template_id: data.template_id, // Map template_id to email_template_id
        template_id: data.template_id,
        created_at: data.created_at,
        updated_at: data.updated_at,
        // UI component support
        name: data.name,
        // Add a default type since it doesn't exist in the database
        type: 'email', // Default to email type
        templateId: data.template_id,
        delayHours: data.delay_hours,
        delayType: data.delay_type,
        position: data.position,
        isActive: data.is_active // Map is_active to isActive
      };
      
      return { data: step, error: null };
    } catch (error) {
      console.error('Error updating step active status:', error);
      return { data: null, error };
    }
  }
};
