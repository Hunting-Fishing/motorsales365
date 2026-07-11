
import { supabase } from '@/lib/supabase';
import { EmailSequenceEnrollment } from '@/types/email';
import { GenericResponse } from '../utils/supabaseHelper';

/**
 * Helper function to map database enrollment records to typed EmailSequenceEnrollment objects
 */
const mapDbEnrollmentToTyped = (record: any): EmailSequenceEnrollment => ({
  id: record.id,
  sequence_id: record.sequence_id,
  customer_id: record.customer_id,
  status: record.status as 'active' | 'paused' | 'completed' | 'cancelled',
  current_step_id: record.current_step_id,
  created_at: record.created_at,
  updated_at: record.updated_at,
  completed_at: record.completed_at,
  // Support for UI components
  sequenceId: record.sequence_id,
  customerId: record.customer_id,
  currentStepId: record.current_step_id,
  startedAt: record.started_at || record.created_at,
  completedAt: record.completed_at,
  nextSendTime: record.next_send_time,
  metadata: record.metadata || {}
});

/**
 * Service for email sequence enrollment operations
 */
export const sequenceEnrollmentService = {
  /**
   * Get all enrollments for a sequence
   * @param sequenceId The ID of the sequence
   * @returns Array of enrollments for the sequence
   */
  async getEnrollmentsBySequenceId(sequenceId: string): Promise<GenericResponse<EmailSequenceEnrollment[]>> {
    try {
      const { data, error } = await supabase
        .from('email_sequence_enrollments')
        .select('*')
        .eq('sequence_id', sequenceId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      // Map to EmailSequenceEnrollment type with proper status typing
      const enrollments: EmailSequenceEnrollment[] = (data || []).map(mapDbEnrollmentToTyped);
      
      return { data: enrollments, error: null };
    } catch (error) {
      console.error(`Error getting enrollments for sequence ${sequenceId}:`, error);
      return { data: [], error };
    }
  },

  /**
   * Get enrollments by customer ID
   * @param customerId The customer ID
   * @returns Array of enrollments for the customer
   */
  async getEnrollmentsByCustomerId(customerId: string): Promise<GenericResponse<EmailSequenceEnrollment[]>> {
    try {
      const { data, error } = await supabase
        .from('email_sequence_enrollments')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      // Map to EmailSequenceEnrollment type with proper status typing
      const enrollments: EmailSequenceEnrollment[] = (data || []).map(mapDbEnrollmentToTyped);
      
      return { data: enrollments, error: null };
    } catch (error) {
      console.error(`Error getting enrollments for customer ${customerId}:`, error);
      return { data: [], error };
    }
  },

  /**
   * Pause an enrollment
   * @param enrollmentId The ID of the enrollment to pause
   * @returns Whether the pause was successful
   */
  async pauseEnrollment(enrollmentId: string): Promise<GenericResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('email_sequence_enrollments')
        .update({ status: 'paused' })
        .eq('id', enrollmentId);
        
      if (error) throw error;
      
      return { data: true, error: null };
    } catch (error) {
      console.error(`Error pausing enrollment ${enrollmentId}:`, error);
      return { data: false, error };
    }
  },

  /**
   * Resume an enrollment
   * @param enrollmentId The ID of the enrollment to resume
   * @returns Whether the resume was successful
   */
  async resumeEnrollment(enrollmentId: string): Promise<GenericResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('email_sequence_enrollments')
        .update({ status: 'active' })
        .eq('id', enrollmentId);
        
      if (error) throw error;
      
      return { data: true, error: null };
    } catch (error) {
      console.error(`Error resuming enrollment ${enrollmentId}:`, error);
      return { data: false, error };
    }
  },

  /**
   * Cancel an enrollment
   * @param enrollmentId The ID of the enrollment to cancel
   * @returns Whether the cancellation was successful
   */
  async cancelEnrollment(enrollmentId: string): Promise<GenericResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('email_sequence_enrollments')
        .update({ status: 'cancelled' })
        .eq('id', enrollmentId);
        
      if (error) throw error;
      
      return { data: true, error: null };
    } catch (error) {
      console.error(`Error cancelling enrollment ${enrollmentId}:`, error);
      return { data: false, error };
    }
  }
};
