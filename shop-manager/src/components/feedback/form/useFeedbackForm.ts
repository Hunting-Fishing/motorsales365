
import { useState, useEffect } from 'react';
import { FeedbackForm, FeedbackQuestion } from '@/types/feedback';
import { getFeedbackFormWithQuestions, submitFeedbackResponse } from '@/services/feedbackService';
import { toast } from '@/hooks/use-toast';

interface UseFeedbackFormProps {
  formId: string;
  customerId: string;
  workOrderId?: string;
  onComplete?: () => void;
}

interface UseFeedbackFormResult {
  form: FeedbackForm | null;
  loading: boolean;
  submitting: boolean;
  submitted: boolean;
  answers: Record<string, any>;
  overallRating: number | null;
  npsScore: number | null;
  handleAnswerChange: (questionId: string, value: any) => void;
  handleSubmit: () => Promise<void>;
}

export const useFeedbackForm = ({
  formId,
  customerId,
  workOrderId,
  onComplete
}: UseFeedbackFormProps): UseFeedbackFormResult => {
  const [form, setForm] = useState<FeedbackForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [overallRating, setOverallRating] = useState<number | null>(null);
  const [npsScore, setNpsScore] = useState<number | null>(null);

  useEffect(() => {
    const loadForm = async () => {
      setLoading(true);
      const formData = await getFeedbackFormWithQuestions(formId);
      if (formData) {
        setForm(formData);
        
        // Initialize answers object with empty values for all questions
        const initialAnswers: Record<string, any> = {};
        formData.questions?.forEach(q => {
          if (q.question_type === 'multiple_choice') {
            initialAnswers[q.id] = null;
          } else if (q.question_type === 'yes_no') {
            initialAnswers[q.id] = null;
          } else if (q.question_type === 'rating') {
            initialAnswers[q.id] = null;
          } else if (q.question_type === 'nps') {
            initialAnswers[q.id] = null;
          } else {
            initialAnswers[q.id] = '';
          }
        });
        setAnswers(initialAnswers);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load the feedback form. Please try again.',
          variant: 'destructive',
        });
      }
      setLoading(false);
    };
    
    loadForm();
  }, [formId]);

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));

    // Detect if this is an NPS question and update the npsScore
    if (form?.questions) {
      const question = form.questions.find(q => q.id === questionId);
      if (question?.question_type === 'nps') {
        setNpsScore(value);
      }
      // If this is a rating question, use it for overall rating
      if (question?.question_type === 'rating') {
        setOverallRating(value);
      }
    }
  };

  const handleSubmit = async () => {
    // Validate required questions
    const requiredQuestions = form?.questions?.filter(q => q.is_required) || [];
    const unansweredQuestions = requiredQuestions.filter(q => {
      const answer = answers[q.id];
      return answer === null || answer === undefined || answer === '';
    });
    
    if (unansweredQuestions.length > 0) {
      toast({
        title: 'Please answer all required questions',
        description: 'Some required questions have not been answered',
        variant: 'destructive',
      });
      return;
    }
    
    setSubmitting(true);
    
    try {
      await submitFeedbackResponse({
        form_id: formId,
        customer_id: customerId,
        work_order_id: workOrderId,
        overall_rating: overallRating,
        nps_score: npsScore,
        response_data: answers,
      });
      
      setSubmitted(true);
      toast({
        title: 'Thank you!',
        description: 'Your feedback has been submitted successfully',
        variant: 'success',
      });
      
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit feedback. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return {
    form,
    loading,
    submitting,
    submitted,
    answers,
    overallRating,
    npsScore,
    handleAnswerChange,
    handleSubmit
  };
};
