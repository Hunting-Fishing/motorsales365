
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Technician {
  id: string;
  name: string;
  jobTitle?: string;
}

export function useTechnicians() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTechnicians = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch all staff except office roles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, job_title')
          .not('job_title', 'is', null);

        if (profilesError) {
          throw profilesError;
        }

        // Office roles to exclude
        const officeRoles = [
          'office manager',
          'administrative assistant',
          'receptionist',
          'secretary',
          'office assistant',
          'admin',
          'office',
          'administrator'
        ];

        // Transform profiles into technicians format, excluding office roles
        const technicianMap = new Map<string, Technician>();
        
        profiles?.forEach((profile) => {
          const jobTitle = (profile.job_title || '').toLowerCase();
          const isOfficeRole = officeRoles.some(role => jobTitle.includes(role));
          
          // Skip office roles
          if (isOfficeRole) {
            return;
          }
          
          const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
          const key = fullName || profile.id;
          
          if (!technicianMap.has(key)) {
            technicianMap.set(key, {
              id: profile.id,
              name: fullName || 'Unknown',
              jobTitle: profile.job_title || undefined,
            });
          }
        });

        setTechnicians(Array.from(technicianMap.values()));
      } catch (err) {
        console.error('Error fetching technicians:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch technicians');
        setTechnicians([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTechnicians();
  }, []);

  return { technicians, isLoading, error };
}
