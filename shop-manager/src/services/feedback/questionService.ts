
import { supabase } from "@/integrations/supabase/client";
import { FeedbackQuestion, QuestionType } from "./types";
import { toast } from "@/hooks/use-toast";

// Create feedback questions for a form
export const createFeedbackQuestions = async (questions: Omit<FeedbackQuestion, 'id' | 'created_at' | 'updated_at'>[]): Promise<FeedbackQuestion[] | null> => {
  try {
    const { data, error } = await supabase
      .from('feedback_questions')
      .insert(questions)
      .select();

    if (error) throw error;
    
    // Map questions to the correct type
    const typedQuestions: FeedbackQuestion[] = data?.map(q => ({
      ...q,
      question_type: q.question_type as QuestionType,
      options: q.options as string[] | null
    })) || [];
    
    return typedQuestions;
  } catch (error) {
    console.error('Error creating feedback questions:', error);
    toast({
      title: 'Error',
      description: 'Failed to create feedback questions. Please try again.',
      variant: 'destructive',
    });
    return null;
  }
};

// Update feedback question
export const updateFeedbackQuestion = async (id: string, updates: Partial<FeedbackQuestion>): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('feedback_questions')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating feedback question:', error);
    toast({
      title: 'Error',
      description: 'Failed to update feedback question. Please try again.',
      variant: 'destructive',
    });
    return false;
  }
};

// Delete feedback question
export const deleteFeedbackQuestion = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('feedback_questions')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting feedback question:', error);
    toast({
      title: 'Error',
      description: 'Failed to delete feedback question. Please try again.',
      variant: 'destructive',
    });
    return false;
  }
};
