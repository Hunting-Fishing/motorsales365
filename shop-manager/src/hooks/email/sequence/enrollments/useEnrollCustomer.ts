
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { sequenceProcessingService } from '@/services/email/sequences/sequenceProcessingService';

export interface EnrollCustomerParams {
  customerId: string;
  sequenceId: string;
  personalizations?: Record<string, string>;
  segmentData?: Record<string, string>;
  metadata?: Record<string, any>;
}

export const useEnrollCustomer = (onEnrollmentComplete?: (customerId: string) => void) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const enrollCustomer = async ({
    customerId,
    sequenceId,
    personalizations = {},
    segmentData = {},
    metadata = {}
  }: EnrollCustomerParams) => {
    setLoading(true);
    
    try {
      // First check if the customer is already enrolled in this sequence
      const { data: existingEnrollments, error: checkError } = await supabase
        .from('email_sequence_enrollments')
        .select('id, status')
        .eq('sequence_id', sequenceId)
        .eq('customer_id', customerId)
        .in('status', ['active', 'paused']);
        
      if (checkError) {
        throw checkError;
      }
      
      // If the customer is already enrolled and the enrollment is active or paused, don't create a new one
      if (existingEnrollments && existingEnrollments.length > 0) {
        const activeEnrollment = existingEnrollments.find(e => e.status === 'active' || e.status === 'paused');
        
        if (activeEnrollment) {
          toast({
            title: 'Customer Already Enrolled',
            description: 'This customer is already enrolled in this sequence.',
            variant: 'warning',
          });
          
          return null;
        }
      }
      
      // Create the enrollment record
      const { data, error } = await supabase
        .from('email_sequence_enrollments')
        .insert({
          sequence_id: sequenceId,
          customer_id: customerId,
          status: 'active',
          started_at: new Date().toISOString(),
          next_send_time: new Date().toISOString(),
          metadata: {
            personalizations,
            segmentData,
            ...metadata
          }
        })
        .select()
        .single();
        
      if (error) {
        throw error;
      }
      
      // Show success message
      toast({
        title: 'Customer Enrolled',
        description: 'The customer has been enrolled in the sequence successfully.',
      });
      
      // Trigger immediate processing of the sequence
      try {
        // Pass the sequenceId and customerId to only process this specific enrollment
        await sequenceProcessingService.triggerSequenceProcessing({ 
          sequenceId: sequenceId,
          customerId: customerId,
          force: true
        });
      } catch (processError) {
        console.error('Error triggering sequence processing:', processError);
        // Non-critical error, don't throw but still log it
        toast({
          title: 'Warning',
          description: 'Customer enrolled, but initial sequence processing could not be triggered.',
          variant: 'warning',
        });
      }
      
      // Call the success callback if provided
      if (onEnrollmentComplete) {
        onEnrollmentComplete(customerId);
      }
      
      return data;
    } catch (error) {
      console.error('Error enrolling customer:', error);
      toast({
        title: 'Error',
        description: 'Failed to enroll customer in sequence',
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    enrollCustomer,
    loading
  };
};
