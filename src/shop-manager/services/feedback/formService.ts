
import { supabase } from "@/integrations/supabase/client";
import { FeedbackForm, FeedbackQuestion, QuestionType } from "./types";
import { toast } from "@/hooks/use-toast";

// Fetch all feedback forms for a shop
export const getFeedbackForms = async (shopId: string): Promise<FeedbackForm[]> => {
  try {
    const { data, error } = await supabase
      .from('feedback_forms')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching feedback forms:', error);
    return [];
  }
};

// Fetch a specific feedback form with its questions
export const getFeedbackFormWithQuestions = async (formId: string): Promise<FeedbackForm | null> => {
  try {
    // Get the form
    const { data: formData, error: formError } = await supabase
      .from('feedback_forms')
      .select('*')
      .eq('id', formId)
      .single();

    if (formError) throw formError;
    
    // Get the questions
    const { data: questionsData, error: questionsError } = await supabase
      .from('feedback_questions')
      .select('*')
      .eq('form_id', formId)
      .order('display_order', { ascending: true });

    if (questionsError) throw questionsError;
    
    // Map questions to the correct type (casting question_type to QuestionType)
    const typedQuestions: FeedbackQuestion[] = questionsData?.map(q => ({
      ...q,
      question_type: q.question_type as QuestionType,
      options: q.options as string[] | null
    })) || [];
    
    return {
      ...formData,
      questions: typedQuestions
    };
  } catch (error) {
    console.error('Error fetching feedback form with questions:', error);
    return null;
  }
};

// Create a new feedback form
export const createFeedbackForm = async (form: Omit<FeedbackForm, 'id' | 'created_at' | 'updated_at'>): Promise<FeedbackForm | null> => {
  try {
    const { data, error } = await supabase
      .from('feedback_forms')
      .insert([form])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating feedback form:', error);
    toast({
      title: 'Error',
      description: 'Failed to create feedback form. Please try again.',
      variant: 'destructive',
    });
    return null;
  }
};

// Update an existing feedback form
export const updateFeedbackForm = async (id: string, updates: Partial<FeedbackForm>): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('feedback_forms')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating feedback form:', error);
    toast({
      title: 'Error',
      description: 'Failed to update feedback form. Please try again.',
      variant: 'destructive',
    });
    return false;
  }
};

// Delete a feedback form
export const deleteFeedbackForm = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('feedback_forms')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting feedback form:', error);
    toast({
      title: 'Error',
      description: 'Failed to delete feedback form. Please try again.',
      variant: 'destructive',
    });
    return false;
  }
};
