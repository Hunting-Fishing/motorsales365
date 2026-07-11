
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface Training {
  id: string;
  profile_id: string;
  training_name: string;
  training_type: string;
  provider: string;
  start_date: string;
  completion_date: string | null;
  duration_hours: number | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  score: number | null;
  certificate_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useTeamMemberTraining(memberId: string) {
  const [training, setTraining] = useState<Training[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTraining = async () => {
    if (!memberId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('team_member_training')
        .select('*')
        .eq('profile_id', memberId)
        .order('start_date', { ascending: false });

      if (fetchError) throw fetchError;

      setTraining((data || []).map(t => ({
        ...t,
        status: t.status as 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
      })));
    } catch (err) {
      console.error('Error fetching training:', err);
      setError('Failed to load training records');
      toast.error('Failed to load training records');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTraining();
  }, [memberId]);

  const addTraining = async (trainingRecord: Omit<Training, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error: insertError } = await supabase
        .from('team_member_training')
        .insert([trainingRecord])
        .select()
        .single();

      if (insertError) throw insertError;

      setTraining(prev => [{ ...data, status: data.status as 'scheduled' | 'in_progress' | 'completed' | 'cancelled' }, ...prev]);
      toast.success('Training record added successfully');
      return { success: true, data };
    } catch (err) {
      console.error('Error adding training:', err);
      toast.error('Failed to add training record');
      return { success: false, error: err };
    }
  };

  const updateTraining = async (id: string, updates: Partial<Training>) => {
    try {
      const { data, error: updateError } = await supabase
        .from('team_member_training')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      setTraining(prev => prev.map(t => t.id === id ? { ...data, status: data.status as 'scheduled' | 'in_progress' | 'completed' | 'cancelled' } : t));
      toast.success('Training record updated successfully');
      return { success: true, data };
    } catch (err) {
      console.error('Error updating training:', err);
      toast.error('Failed to update training record');
      return { success: false, error: err };
    }
  };

  const deleteTraining = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('team_member_training')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setTraining(prev => prev.filter(t => t.id !== id));
      toast.success('Training record deleted successfully');
      return { success: true };
    } catch (err) {
      console.error('Error deleting training:', err);
      toast.error('Failed to delete training record');
      return { success: false, error: err };
    }
  };

  return {
    training,
    isLoading,
    error,
    addTraining,
    updateTraining,
    deleteTraining,
    refetch: fetchTraining
  };
}
