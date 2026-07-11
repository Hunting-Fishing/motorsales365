
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { EmailSequenceEnrollment } from '@/types/email';

export const useEnrollmentActions = (
  setEnrollments: React.Dispatch<React.SetStateAction<EmailSequenceEnrollment[]>>
) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const pauseEnrollment = async (enrollmentId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('email_sequence_enrollments')
        .update({
          status: 'paused',
          updated_at: new Date().toISOString()
        })
        .eq('id', enrollmentId);

      if (error) throw error;

      setEnrollments(prev =>
        prev.map(enrollment =>
          enrollment.id === enrollmentId
            ? { ...enrollment, status: 'paused' }
            : enrollment
        )
      );

      toast({
        title: 'Enrollment Paused',
        description: 'The sequence enrollment has been paused.',
      });
    } catch (error) {
      console.error('Error pausing enrollment:', error);
      toast({
        title: 'Error',
        description: 'Could not pause the enrollment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resumeEnrollment = async (enrollmentId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('email_sequence_enrollments')
        .update({
          status: 'active',
          next_send_time: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', enrollmentId);

      if (error) throw error;

      setEnrollments(prev =>
        prev.map(enrollment =>
          enrollment.id === enrollmentId
            ? { ...enrollment, status: 'active' }
            : enrollment
        )
      );

      toast({
        title: 'Enrollment Resumed',
        description: 'The sequence enrollment has been resumed.',
      });
    } catch (error) {
      console.error('Error resuming enrollment:', error);
      toast({
        title: 'Error',
        description: 'Could not resume the enrollment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const cancelEnrollment = async (enrollmentId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('email_sequence_enrollments')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', enrollmentId);

      if (error) throw error;

      setEnrollments(prev =>
        prev.map(enrollment =>
          enrollment.id === enrollmentId
            ? { ...enrollment, status: 'cancelled' }
            : enrollment
        )
      );

      toast({
        title: 'Enrollment Cancelled',
        description: 'The sequence enrollment has been cancelled.',
      });
    } catch (error) {
      console.error('Error cancelling enrollment:', error);
      toast({
        title: 'Error',
        description: 'Could not cancel the enrollment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    pauseEnrollment,
    resumeEnrollment,
    cancelEnrollment,
    loading
  };
};
