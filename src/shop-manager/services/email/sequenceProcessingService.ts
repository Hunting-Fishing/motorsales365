
import { supabase } from '@/lib/supabase';
import { EmailSequence } from '@/types/email';

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
  }) {
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
      
      // Invoke the edge function to process the sequences
      const { data, error } = await supabase.functions.invoke('process-email-sequences', {
        body: { 
          sequenceIds: typedSequences.map(seq => seq.id),
          force: options?.force || false 
        }
      });
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error triggering sequence processing:', error);
      return { success: false, error };
    }
  }
};
