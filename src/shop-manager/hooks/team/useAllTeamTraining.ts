import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Training } from './useTeamMemberTraining';

export interface TrainingWithMember extends Training {
  profile?: {
    full_name: string;
    department: string;
    role: string;
  };
  daysUntilDue?: number;
  isOverdue?: boolean;
  isComingDue?: boolean;
}

export function useAllTeamTraining() {
  const [training, setTraining] = useState<TrainingWithMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllTraining = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('team_member_training')
        .select(`
          *,
          profile:profiles!team_member_training_profile_id_fkey (
            full_name,
            department,
            role
          )
        `)
        .order('start_date', { ascending: false });

      if (fetchError) throw fetchError;

      const processedTraining = (data || []).map(t => {
        const trainingItem: TrainingWithMember = {
          ...t,
          status: t.status as 'scheduled' | 'in_progress' | 'completed' | 'cancelled',
          profile: Array.isArray(t.profile) ? t.profile[0] : t.profile
        };

        // Calculate days until due for in_progress training
        if (t.status === 'in_progress' && t.completion_date) {
          const dueDate = new Date(t.completion_date);
          const today = new Date();
          const diffTime = dueDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          trainingItem.daysUntilDue = diffDays;
          trainingItem.isOverdue = diffDays < 0;
          trainingItem.isComingDue = diffDays >= 0 && diffDays <= 30;
        }

        return trainingItem;
      });

      setTraining(processedTraining);
    } catch (err) {
      console.error('Error fetching all training:', err);
      setError('Failed to load training records');
      toast.error('Failed to load training records');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllTraining();
  }, []);

  return {
    training,
    isLoading,
    error,
    refetch: fetchAllTraining
  };
}
