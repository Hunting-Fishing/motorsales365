
import { useEnrollmentState } from './enrollments/useEnrollmentState';
import { useFetchEnrollments } from './enrollments/useFetchEnrollments';
import { useEnrollmentActions } from './enrollments/useEnrollmentActions';
import { useEnrollCustomer } from './enrollments/useEnrollCustomer';
import { EmailSequenceEnrollment } from '@/types/email';

export const useSequenceEnrollments = () => {
  const { enrollments, setEnrollments, loading, setLoading } = useEnrollmentState();
  
  const { fetchCustomerEnrollments: fetchEnrollmentsData } = useFetchEnrollments();
  
  const { pauseEnrollment, resumeEnrollment, cancelEnrollment } = useEnrollmentActions(
    setEnrollments
  );
  
  // Wrapper function that integrates the state management with data fetching
  const fetchCustomerEnrollments = async (customerId: string): Promise<EmailSequenceEnrollment[]> => {
    setLoading(true);
    try {
      const data = await fetchEnrollmentsData(customerId);
      setEnrollments(data);
      return data;
    } finally {
      setLoading(false);
    }
  };
  
  // Now use the enrollCustomer hook with our fetchCustomerEnrollments function
  const { enrollCustomer } = useEnrollCustomer(fetchCustomerEnrollments);

  return {
    enrollments,
    loading,
    fetchCustomerEnrollments,
    pauseEnrollment,
    resumeEnrollment,
    cancelEnrollment,
    enrollCustomer
  };
};
