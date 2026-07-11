
import { useState } from 'react';
import { EmailSequenceEnrollment } from '@/types/email';

/**
 * Hook for managing enrollment state
 * This handles state management only, separated from data fetching
 */
export const useEnrollmentState = () => {
  const [enrollments, setEnrollments] = useState<EmailSequenceEnrollment[]>([]);
  const [loading, setLoading] = useState(false);
  
  return {
    enrollments,
    setEnrollments,
    loading,
    setLoading
  };
};
