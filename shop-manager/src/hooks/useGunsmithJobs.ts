import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GunsmithJobOption {
  id: string;
  job_number: string;
  customer_name: string | null;
  firearm_info: string;
  status: string;
}

export function useGunsmithJobs() {
  const { data: jobs, isLoading, error } = useQuery({
    queryKey: ['gunsmith-jobs-for-timesheet'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gunsmith_jobs')
        .select(`
          id,
          job_number,
          status,
          firearm_make,
          firearm_model,
          customers (
            first_name,
            last_name
          )
        `)
        .in('status', ['pending', 'in_progress', 'waiting_parts', 'ready'])
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      return data.map((job: any) => ({
        id: job.id,
        job_number: job.job_number,
        customer_name: job.customers 
          ? `${job.customers.first_name || ''} ${job.customers.last_name || ''}`.trim() 
          : null,
        firearm_info: [job.firearm_make, job.firearm_model].filter(Boolean).join(' ') || 'Unknown Firearm',
        status: job.status,
      })) as GunsmithJobOption[];
    },
  });

  return {
    jobs: jobs || [],
    isLoading,
    error,
  };
}
