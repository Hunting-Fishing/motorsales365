import { useState } from 'react';
import { EmailSequence, EmailSequenceStep } from '@/types/email';
import { emailSequenceService } from '@/services/email';
import { useToast } from '@/hooks/use-toast';

export const useSequenceCRUD = () => {
  const [sequences, setSequences] = useState<EmailSequence[]>([]);
  const [currentSequence, setCurrentSequence] = useState<EmailSequence | null>(null);
  const [loading, setLoading] = useState(false);
  const [sequenceLoading, setSequenceLoading] = useState(false);
  const { toast } = useToast();

  const fetchSequences = async () => {
    setLoading(true);
    try {
      const { data, error } = await emailSequenceService.getSequences();
      
      if (error) throw error;
      
      setSequences(data || []);
      return data;
    } catch (error) {
      console.error('Error fetching sequences:', error);
      toast({
        title: 'Error',
        description: 'Failed to load email sequences',
        variant: 'destructive',
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchSequenceById = async (id: string) => {
    setSequenceLoading(true);
    try {
      const { data, error } = await emailSequenceService.getSequenceById(id);
      
      if (error) throw error;
      
      setCurrentSequence(data);
      return data;
    } catch (error) {
      console.error(`Error fetching sequence ${id}:`, error);
      toast({
        title: 'Error',
        description: 'Failed to load email sequence details',
        variant: 'destructive',
      });
      return null;
    } finally {
      setSequenceLoading(false);
    }
  };

  const createSequence = async (sequence: Partial<EmailSequence>) => {
    setLoading(true);
    try {
      const { data, error } = await emailSequenceService.createSequence(sequence);
      
      if (error) throw error;
      
      setSequences(prev => [...prev, data]);
      
      toast({
        title: 'Success',
        description: 'Email sequence created successfully',
      });
      
      return data;
    } catch (error) {
      console.error('Error creating sequence:', error);
      toast({
        title: 'Error',
        description: 'Failed to create email sequence',
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateSequence = async (id: string, updates: Partial<EmailSequence>) => {
    setLoading(true);
    try {
      const { data, error } = await emailSequenceService.updateSequence(id, updates);
      
      if (error) throw error;
      
      setSequences(prev => 
        prev.map(seq => seq.id === id ? { ...seq, ...data } : seq)
      );
      
      if (currentSequence?.id === id) {
        setCurrentSequence({ ...currentSequence, ...data });
      }
      
      toast({
        title: 'Success',
        description: 'Email sequence updated successfully',
      });
      
      return data;
    } catch (error) {
      console.error(`Error updating sequence ${id}:`, error);
      toast({
        title: 'Error',
        description: 'Failed to update email sequence',
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteSequence = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await emailSequenceService.deleteSequence(id);
      
      if (error) throw error;
      
      setSequences(prev => prev.filter(seq => seq.id !== id));
      
      if (currentSequence?.id === id) {
        setCurrentSequence(null);
      }
      
      toast({
        title: 'Success',
        description: 'Email sequence deleted successfully',
      });
      
      return true;
    } catch (error) {
      console.error(`Error deleting sequence ${id}:`, error);
      toast({
        title: 'Error',
        description: 'Failed to delete email sequence',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const createSequenceStep = async (step: Partial<EmailSequenceStep>) => {
    setLoading(true);
    try {
      const { data, error } = await emailSequenceService.createSequenceStep(step);
      
      if (error) throw error;
      
      if (currentSequence?.id === step.sequence_id) {
        setCurrentSequence({
          ...currentSequence,
          steps: [...currentSequence.steps, data]
        });
      }
      
      toast({
        title: 'Success',
        description: 'Sequence step added successfully',
      });
      
      return data;
    } catch (error) {
      console.error('Error creating sequence step:', error);
      toast({
        title: 'Error',
        description: 'Failed to add sequence step',
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateSequenceStep = async (stepId: string, updates: Partial<EmailSequenceStep>) => {
    setLoading(true);
    try {
      const { data, error } = await emailSequenceService.updateSequenceStep(stepId, updates);
      
      if (error) throw error;
      
      if (currentSequence && currentSequence.steps.some(step => step.id === stepId)) {
        setCurrentSequence({
          ...currentSequence,
          steps: currentSequence.steps.map(step => 
            step.id === stepId ? { ...step, ...data } : step
          )
        });
      }
      
      toast({
        title: 'Success',
        description: 'Sequence step updated successfully',
      });
      
      return data;
    } catch (error) {
      console.error(`Error updating sequence step ${stepId}:`, error);
      toast({
        title: 'Error',
        description: 'Failed to update sequence step',
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteSequenceStep = async (stepId: string) => {
    setLoading(true);
    try {
      const { error } = await emailSequenceService.deleteSequenceStep(stepId);
      
      if (error) throw error;
      
      if (currentSequence && currentSequence.steps.some(step => step.id === stepId)) {
        setCurrentSequence({
          ...currentSequence,
          steps: currentSequence.steps.filter(step => step.id !== stepId)
        });
      }
      
      toast({
        title: 'Success',
        description: 'Sequence step deleted successfully',
      });
      
      return true;
    } catch (error) {
      console.error(`Error deleting sequence step ${stepId}:`, error);
      toast({
        title: 'Error',
        description: 'Failed to delete sequence step',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    sequences,
    currentSequence,
    loading,
    sequenceLoading,
    fetchSequences,
    fetchSequenceById,
    createSequence,
    updateSequence,
    deleteSequence,
    createSequenceStep,
    updateSequenceStep,
    deleteSequenceStep,
    setCurrentSequence
  };
};
