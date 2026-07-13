
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { StaffMember } from '@/types/invoice';

export function useStaff() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, job_title');

      if (error) throw error;

      const staffMembers = data.map((profile) => ({
        id: profile.id,
        name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
        role: profile.job_title
      }));
      
      setStaff(staffMembers);
    } catch (err) {
      console.error('Error fetching staff:', err);
      setError(err instanceof Error ? err : new Error('Unknown error occurred'));
      setStaff([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getStaffById = (id: string): StaffMember | undefined => {
    return staff.find((member) => member.id === id);
  };

  return {
    staff,
    isLoading,
    error,
    fetchStaff,
    getStaffById
  };
}
