
import { supabase } from '@/lib/supabase';
import { EmailSequenceEnrollment } from '@/types/email';
import { parseJsonField } from '@/services/email/utils';

/**
 * Hook for fetching email sequence enrollments
 * This hook only handles the data fetching logic, separated from state management
 */
export const useFetchEnrollments = () => {
  /**
   * Fetches enrollments for a specific customer
   * @param customerId Customer ID to fetch enrollments for
   * @returns Promise with the fetched and transformed enrollments
   */
  const fetchCustomerEnrollments = async (customerId: string): Promise<EmailSequenceEnrollment[]> => {
    try {
      const { data, error } = await supabase
        .from('email_sequence_enrollments')
        .select(`
          *,
          sequence:email_sequences(id, name, description, created_at, updated_at),
          current_step:email_sequence_steps(id, name, template_id, position, sequence_id, created_at, updated_at)
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match the EmailSequenceEnrollment type
      const transformedData = data?.map(item => {
        // Process the metadata field using our utility function
        const metadata = parseJsonField<Record<string, any>>(item.metadata, {});
        
        return {
          id: item.id,
          sequence_id: item.sequence_id,
          sequenceId: item.sequence_id,
          customer_id: item.customer_id,
          customerId: item.customer_id,
          status: item.status as 'active' | 'paused' | 'completed' | 'cancelled',
          current_step_id: item.current_step_id,
          currentStepId: item.current_step_id,
          created_at: item.created_at,
          createdAt: item.created_at,
          updated_at: item.updated_at,
          updatedAt: item.updated_at,
          completed_at: item.completed_at,
          completedAt: item.completed_at,
          sequence: {
            ...item.sequence,
            steps: [], // Add empty steps array required by EmailSequence type
            createdAt: item.sequence?.created_at,
            updatedAt: item.sequence?.updated_at,
            isActive: false, // Set default values for required properties
            triggerType: 'manual' as 'manual' | 'event' | 'schedule'
          },
          current_step: item.current_step ? {
            ...item.current_step,
            sequence_id: item.current_step?.sequence_id || item.sequence_id,
            created_at: item.current_step?.created_at || item.created_at,
            updated_at: item.current_step?.updated_at || item.updated_at
          } : undefined,
          currentStep: item.current_step ? {
            ...item.current_step,
            sequence_id: item.current_step?.sequence_id || item.sequence_id,
            sequenceId: item.current_step?.sequence_id || item.sequence_id,
            created_at: item.current_step?.created_at || item.created_at,
            createdAt: item.current_step?.created_at || item.created_at,
            updated_at: item.current_step?.updated_at || item.updated_at,
            updatedAt: item.current_step?.updated_at || item.updated_at
          } : undefined,
          nextSendTime: item.next_send_time,
          next_send_time: item.next_send_time,
          startedAt: item.started_at,
          started_at: item.started_at,
          metadata
        };
      }) || [];
      
      return transformedData;
    } catch (error) {
      console.error('Error fetching enrollments:', error);
      return [];
    }
  };

  return {
    fetchCustomerEnrollments
  };
};
