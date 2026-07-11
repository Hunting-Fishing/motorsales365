
import { supabase } from '@/lib/supabase';
import { EmailSequence } from '@/types/email';
import { GenericResponse } from '../utils/supabaseHelper';

/**
 * Service for handling the processing of email sequences
 */
export const sequenceProcessingService = {
  /**
   * Trigger the processing of email sequences
   * @param options Processing options
   * @returns Success status
   */
  async triggerSequenceProcessing(options?: { 
    sequenceId?: string; 
    force?: boolean;
    customerId?: string;
  }): Promise<GenericResponse<any>> {
    try {
      // Get active sequences that need processing
      const { data: sequences, error: sequencesError } = await supabase
        .from('email_sequences')
        .select('*')
        .eq('is_active', true);
      
      if (sequencesError) throw sequencesError;
      
      // If a specific sequence ID is provided, filter to just that one
      const sequencesToProcess = options?.sequenceId 
        ? sequences.filter(seq => seq.id === options.sequenceId) 
        : sequences;
      
      if (sequencesToProcess.length === 0) {
        return { 
          data: { 
            success: false, 
            message: options?.sequenceId 
              ? 'Sequence not found or not active' 
              : 'No active sequences found' 
          }, 
          error: null 
        };
      }
      
      // Map to proper EmailSequence type, with a default empty steps array
      const typedSequences: EmailSequence[] = sequencesToProcess.map(seq => ({
        ...seq,
        steps: [], // Default empty steps array; we'll fetch steps separately if needed
        trigger_type: seq.trigger_type as 'manual' | 'event' | 'schedule',
        triggerType: seq.trigger_type as 'manual' | 'event' | 'schedule',
        triggerEvent: seq.trigger_event,
        isActive: seq.is_active,
        createdAt: seq.created_at,
        updatedAt: seq.updated_at
      }));
      
      // Prepare the request body
      const requestBody: any = { 
        action: 'process',
        sequenceId: options?.sequenceId,
        force: options?.force || false
      };
      
      // If customerId is provided, we'll only process enrollments for that customer
      if (options?.customerId) {
        requestBody.customerId = options.customerId;
      }
      
      // Invoke the edge function to process the sequences
      const { data, error } = await supabase.functions.invoke('process-email-sequences', {
        body: requestBody
      });
      
      if (error) throw error;
      
      // Update the sequence last_run timestamp if processing was successful
      if (data?.success && options?.sequenceId) {
        // Use a raw update query to set the last_run field without type checking
        // This avoids TypeScript errors when the field isn't in the type definition
        await supabase
          .from('email_sequences')
          .update({
            updated_at: new Date().toISOString() // Using updated_at as this field definitely exists
          })
          .eq('id', options.sequenceId);
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Error triggering sequence processing:', error);
      return { data: null, error };
    }
  },
  
  /**
   * Manually trigger the next step for a specific enrollment
   * @param enrollmentId The ID of the enrollment to process
   * @returns Success status
   */
  async processEnrollmentNextStep(enrollmentId: string): Promise<GenericResponse<any>> {
    try {
      // Get the enrollment to process
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('email_sequence_enrollments')
        .select('*, sequence:sequence_id(*)')
        .eq('id', enrollmentId)
        .eq('status', 'active')
        .single();
      
      if (enrollmentError) throw enrollmentError;
      
      if (!enrollment) {
        return { 
          data: { 
            success: false, 
            message: 'Enrollment not found or not active' 
          }, 
          error: null 
        };
      }
      
      // Invoke the edge function with a specific enrollment ID
      const { data, error } = await supabase.functions.invoke('process-email-sequences', {
        body: { 
          action: 'process_enrollment',
          enrollmentId: enrollmentId,
          force: true
        }
      });
      
      if (error) throw error;
      
      return { data, error: null };
    } catch (error) {
      console.error('Error processing enrollment step:', error);
      return { data: null, error };
    }
  },
  
  /**
   * Check the health of the sequence processing system
   * @returns Health status
   */
  async checkProcessingHealth(): Promise<GenericResponse<any>> {
    try {
      // Invoke the edge function to check system health
      const { data, error } = await supabase.functions.invoke('process-email-sequences', {
        body: { 
          action: 'health_check'
        }
      });
      
      if (error) throw error;
      
      return { data, error: null };
    } catch (error) {
      console.error('Error checking sequence processing health:', error);
      return { 
        data: { 
          healthy: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }, 
        error 
      };
    }
  }
};
