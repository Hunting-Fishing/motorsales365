import { supabase } from '@/lib/supabase';
import { EmailSequence, EmailSequenceStep, EmailSequenceAnalytics } from '@/types/email';
import { parseJsonField } from './utils';

export const emailSequenceService = {
  /**
   * Fetch all email sequences
   */
  getSequences: async () => {
    try {
      const { data, error } = await supabase
        .from('email_sequences')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return data?.map(sequence => ({
        ...sequence,
        steps: [], // Initialize with empty steps array
        // Add camelCase versions of properties for UI components
        triggerType: sequence.trigger_type,
        triggerEvent: sequence.trigger_event,
        isActive: sequence.is_active,
        createdAt: sequence.created_at,
        updatedAt: sequence.updated_at,
        // Default empty values for scheduling properties
        last_run: null,
        next_run: null,
        run_frequency: null
      })) as EmailSequence[] || [];
    } catch (error) {
      console.error('Error fetching email sequences:', error);
      return [];
    }
  },
  
  /**
   * Get a single sequence by ID
   */
  getSequenceById: async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('email_sequences')
        .select(`
          *,
          steps:email_sequence_steps(*)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      // Format steps to include camelCase properties
      const formattedSteps = (data.steps || []).map((step: any) => ({
        ...step,
        templateId: step.template_id,
        email_template_id: step.template_id,
        position: step.position || step.order || 0,
        order: step.position || step.order || 0,
        type: 'email',
        delayHours: step.delay_hours || 0,
        delayType: step.delay_type || 'fixed',
        // Default empty values for scheduling properties
        last_run: null,
        next_run: null,
        run_frequency: null
      }));
      
      return {
        ...data,
        steps: formattedSteps,
        // Add camelCase versions of properties for UI components
        triggerType: data.trigger_type,
        triggerEvent: data.trigger_event,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        // Default empty values for scheduling properties
        last_run: null,
        next_run: null,
        run_frequency: null
      } as EmailSequence;
    } catch (error) {
      console.error('Error fetching sequence by ID:', error);
      return null;
    }
  },
  
  /**
   * Create a new email sequence
   */
  createSequence: async (sequenceData: Partial<EmailSequence>) => {
    try {
      const { data, error } = await supabase
        .from('email_sequences')
        .insert({
          name: sequenceData.name || 'New Sequence',
          description: sequenceData.description || '',
          trigger_type: sequenceData.triggerType || sequenceData.trigger_type || 'manual',
          trigger_event: sequenceData.triggerEvent || sequenceData.trigger_event || null,
          is_active: sequenceData.isActive || sequenceData.is_active || false,
          created_by: sequenceData.created_by || null,
          shop_id: sequenceData.shop_id || null
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        ...data,
        steps: [],
        // Add camelCase versions of properties for UI components
        triggerType: data.trigger_type,
        triggerEvent: data.trigger_event,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        // Default empty values for scheduling properties
        last_run: null,
        next_run: null,
        run_frequency: null
      } as EmailSequence;
    } catch (error) {
      console.error('Error creating email sequence:', error);
      return null;
    }
  },
  
  /**
   * Update an existing email sequence
   */
  updateSequence: async (id: string, sequenceData: Partial<EmailSequence>) => {
    try {
      const { error } = await supabase
        .from('email_sequences')
        .update({
          name: sequenceData.name,
          description: sequenceData.description,
          trigger_type: sequenceData.triggerType || sequenceData.trigger_type,
          trigger_event: sequenceData.triggerEvent || sequenceData.trigger_event,
          is_active: sequenceData.isActive !== undefined ? sequenceData.isActive : sequenceData.is_active
        })
        .eq('id', id);
      
      if (error) throw error;
      
      // Fetch the updated sequence
      return await emailSequenceService.getSequenceById(id);
    } catch (error) {
      console.error('Error updating email sequence:', error);
      return null;
    }
  },
  
  /**
   * Delete an email sequence
   */
  deleteSequence: async (id: string) => {
    try {
      // Delete the sequence steps first
      const { error: stepsError } = await supabase
        .from('email_sequence_steps')
        .delete()
        .eq('sequence_id', id);
      
      if (stepsError) throw stepsError;
      
      // Then delete the sequence
      const { error } = await supabase
        .from('email_sequences')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error deleting email sequence:', error);
      return false;
    }
  },
  
  /**
   * Get sequence steps
   */
  getSequenceSteps: async (sequenceId: string): Promise<EmailSequenceStep[]> => {
    try {
      const { data, error } = await supabase
        .from('email_sequence_steps')
        .select('*')
        .eq('sequence_id', sequenceId)
        .order('position', { ascending: true });
      
      if (error) throw error;
      
      // Map the database records to the EmailSequenceStep type
      return (data || []).map(step => ({
        id: step.id,
        sequence_id: step.sequence_id,
        // Use position instead of order since the DB field is named position
        position: step.position,
        order: step.position, // Add order as an alias of position for backward compatibility
        delay_hours: step.delay_hours,
        delayHours: step.delay_hours,
        delay_type: step.delay_type,
        delayType: step.delay_type,
        template_id: step.template_id,
        templateId: step.template_id,
        email_template_id: step.template_id, // Add for backward compatibility
        created_at: step.created_at,
        updated_at: step.updated_at,
        name: step.name,
        // Derive type based on the presence of a template ID
        type: step.template_id ? 'email' : 'delay',
        isActive: step.is_active,
        condition: step.condition_type ? {
          type: step.condition_type as 'event' | 'property',
          value: step.condition_value,
          operator: step.condition_operator as '=' | '!=' | '>' | '<' | '>=' | '<='
        } : undefined,
        
        // Add missing properties
        last_run: null,
        next_run: null,
        run_frequency: null
      }));
    } catch (error) {
      console.error('Error fetching sequence steps:', error);
      return [];
    }
  },
  
  /**
   * Create or update a sequence step
   */
  upsertSequenceStep: async (sequenceId: string, step: Partial<EmailSequenceStep>): Promise<EmailSequenceStep | null> => {
    try {
      // If the step has an ID, update existing step
      if (step.id) {
        const updateData = {
          name: step.name,
          position: step.position || step.order,
          template_id: step.templateId || step.template_id,
          delay_hours: step.delayHours || step.delay_hours,
          delay_type: step.delayType || step.delay_type,
          condition_type: step.condition?.type,
          condition_value: step.condition?.value,
          condition_operator: step.condition?.operator
        };

        const { error } = await supabase
          .from('email_sequence_steps')
          .update(updateData)
          .eq('id', step.id);
        
        if (error) throw error;
        
        return { ...step, ...updateData } as EmailSequenceStep;
      } else {
        // Creating a new step
        const { data, error } = await supabase
          .from('email_sequence_steps')
          .insert({
            sequence_id: sequenceId,
            position: step.position || step.order,
            template_id: step.templateId || step.template_id || step.email_template_id,
            delay_hours: step.delayHours || step.delay_hours,
            delay_type: step.delayType || step.delay_type,
            name: step.name || 'New Step',
            condition_type: step.condition?.type,
            condition_value: step.condition?.value,
            condition_operator: step.condition?.operator
          })
          .select()
          .single();
        
        if (error) throw error;
        
        return {
          ...data,
          email_template_id: data.template_id,
          templateId: data.template_id,
          type: 'email',
          delayHours: data.delay_hours,
          delayType: data.delay_type,
          // Default empty values for scheduling properties
          last_run: null,
          next_run: null,
          run_frequency: null
        } as EmailSequenceStep;
      }
    } catch (error) {
      console.error('Error upserting sequence step:', error);
      return null;
    }
  },
  
  /**
   * Delete a sequence step
   */
  deleteSequenceStep: async (stepId: string) => {
    try {
      const { error } = await supabase
        .from('email_sequence_steps')
        .delete()
        .eq('id', stepId);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error deleting sequence step:', error);
      return false;
    }
  },
  
  /**
   * Get sequence analytics
   */
  getSequenceAnalytics: async (sequenceId: string) => {
    try {
      const { data, error } = await supabase
        .from('email_sequence_analytics')
        .select('*')
        .eq('sequence_id', sequenceId)
        .maybeSingle();
      
      if (error) throw error;
      
      if (!data) {
        return {
          id: '',
          sequence_id: sequenceId,
          sequenceId: sequenceId,
          total_enrollments: 0,
          totalEnrollments: 0,
          active_enrollments: 0,
          activeEnrollments: 0,
          completed_enrollments: 0,
          completedEnrollments: 0,
          cancelled_enrollments: 0,
          conversion_rate: 0,
          conversionRate: 0,
          average_time_to_complete: 0,
          averageTimeToComplete: 0,
          updated_at: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          created_at: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          total_emails_sent: 0,
          totalEmailsSent: 0,
          open_rate: 0,
          openRate: 0,
          click_rate: 0,
          clickRate: 0
        } as EmailSequenceAnalytics;
      }
      
      return {
        ...data,
        sequenceId: data.sequence_id,
        totalEnrollments: data.total_enrollments,
        activeEnrollments: data.active_enrollments,
        completedEnrollments: data.completed_enrollments,
        cancelled_enrollments: 0,
        conversionRate: data.conversion_rate,
        averageTimeToComplete: data.average_time_to_complete,
        updatedAt: data.updated_at,
        createdAt: data.updated_at, // Fallback if created_at is missing
        total_emails_sent: 0,
        totalEmailsSent: 0,
        open_rate: 0,
        openRate: 0,
        click_rate: 0,
        clickRate: 0
      } as EmailSequenceAnalytics;
    } catch (error) {
      console.error('Error fetching sequence analytics:', error);
      
      // Return default values if analytics don't exist yet
      return {
        id: '',
        sequence_id: sequenceId,
        sequenceId: sequenceId,
        total_enrollments: 0,
        totalEnrollments: 0,
        active_enrollments: 0,
        activeEnrollments: 0,
        completed_enrollments: 0,
        completedEnrollments: 0,
        cancelled_enrollments: 0,
        conversion_rate: 0,
        conversionRate: 0,
        average_time_to_complete: 0,
        averageTimeToComplete: 0,
        updated_at: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        created_at: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        total_emails_sent: 0,
        totalEmailsSent: 0,
        open_rate: 0,
        openRate: 0,
        click_rate: 0,
        clickRate: 0
      } as EmailSequenceAnalytics;
    }
  }
};
