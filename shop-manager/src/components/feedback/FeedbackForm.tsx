
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FeedbackFormQuestion } from './form/FeedbackFormQuestion';
import { FeedbackFormSuccess } from './form/FeedbackFormSuccess';
import { FeedbackFormLoading } from './form/FeedbackFormLoading';
import { FeedbackFormNotFound } from './form/FeedbackFormNotFound';
import { useFeedbackForm } from './form/useFeedbackForm';

interface FeedbackFormProps {
  formId: string;
  customerId: string;
  workOrderId?: string;
  onComplete?: () => void;
}

export const FeedbackForm: React.FC<FeedbackFormProps> = ({
  formId,
  customerId,
  workOrderId,
  onComplete
}) => {
  const {
    form,
    loading,
    submitting,
    submitted,
    answers,
    handleAnswerChange,
    handleSubmit
  } = useFeedbackForm({
    formId,
    customerId,
    workOrderId,
    onComplete
  });

  if (loading) {
    return <FeedbackFormLoading />;
  }

  if (!form) {
    return <FeedbackFormNotFound />;
  }

  if (submitted) {
    return <FeedbackFormSuccess onComplete={onComplete} />;
  }

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>{form.title}</CardTitle>
        {form.description && (
          <CardDescription>{form.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {form.questions?.sort((a, b) => a.display_order - b.display_order).map(question => (
          <div key={question.id} className="py-2">
            <FeedbackFormQuestion
              question={question}
              value={answers[question.id]}
              onChange={handleAnswerChange}
            />
          </div>
        ))}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleSubmit} 
          disabled={submitting}
          className="w-full"
        >
          {submitting ? 'Submitting...' : 'Submit Feedback'}
        </Button>
      </CardFooter>
    </Card>
  );
};
