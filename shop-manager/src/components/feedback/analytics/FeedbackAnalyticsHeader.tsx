
import React from 'react';
import { FeedbackForm, FeedbackResponse } from '@/types/feedback';
import { BackButton } from './BackButton';
import { ExportButton } from './ExportButton';

interface FeedbackAnalyticsHeaderProps {
  form: FeedbackForm;
  responses: FeedbackResponse[];
  onBackClick: () => void;
}

export const FeedbackAnalyticsHeader: React.FC<FeedbackAnalyticsHeaderProps> = ({ 
  form, 
  responses, 
  onBackClick 
}) => {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center space-x-2">
        <BackButton onClick={onBackClick} />
        <h1 className="text-2xl font-bold">{form.title} - Analytics</h1>
      </div>
      
      <ExportButton form={form} responses={responses} />
    </div>
  );
};
