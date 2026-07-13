
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FeedbackForm, FeedbackResponse } from '@/types/feedback';
import { 
  getFeedbackFormWithQuestions, 
  getFeedbackAnalytics,
  getFeedbackResponses
} from '@/services/feedbackService';
import { Card } from '@/components/ui/card';
import { FeedbackAnalyticsHeader } from './FeedbackAnalyticsHeader';
import { StatCards } from './StatCards';
import { NpsChart } from './charts/NpsChart';
import { RatingChart } from './charts/RatingChart';
import { ResponsesTable } from './ResponsesTable';

export const FeedbackAnalytics: React.FC = () => {
  const { formId } = useParams<{ formId: string }>();
  const navigate = useNavigate();
  
  const [form, setForm] = useState<FeedbackForm | null>(null);
  const [analytics, setAnalytics] = useState<FeedbackAnalyticsType | null>(null);
  const [responses, setResponses] = useState<FeedbackResponse[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadData = async () => {
      if (!formId) return;
      
      setLoading(true);
      
      try {
        // Load form details
        const formData = await getFeedbackFormWithQuestions(formId);
        setForm(formData);
        
        // Load analytics
        const analyticsData = await getFeedbackAnalytics(formId);
        setAnalytics(analyticsData);
        
        // Load responses
        const responsesData = await getFeedbackResponses(formId);
        setResponses(responsesData);
        
      } catch (error) {
        console.error('Error loading feedback analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [formId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-gray-500">Loading analytics...</p>
      </div>
    );
  }

  if (!form || !analytics) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <button 
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2" 
          onClick={() => navigate('/feedback/forms')}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="h-4 w-4 mr-2"
          >
            <path d="m15 18-6-6 6-6"/>
          </svg>
          Back to Forms
        </button>
        <div className="flex items-center justify-center h-48">
          <p className="text-gray-500">Form not found or analytics not available</p>
        </div>
      </div>
    );
  }

  // Prepare NPS data for pie chart
  const npsData = [
    { name: 'Promoters', value: analytics.promoters, color: '#22c55e' },
    { name: 'Passives', value: analytics.passives, color: '#eab308' },
    { name: 'Detractors', value: analytics.detractors, color: '#ef4444' }
  ];

  // Prepare rating data for bar chart if there are any ratings
  const hasRatings = analytics.average_rating > 0;
  const ratingData = hasRatings ? [
    { name: '1 Star', value: responses.filter(r => r.overall_rating === 1).length },
    { name: '2 Stars', value: responses.filter(r => r.overall_rating === 2).length },
    { name: '3 Stars', value: responses.filter(r => r.overall_rating === 3).length },
    { name: '4 Stars', value: responses.filter(r => r.overall_rating === 4).length },
    { name: '5 Stars', value: responses.filter(r => r.overall_rating === 5).length }
  ] : [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <FeedbackAnalyticsHeader 
        form={form} 
        responses={responses} 
        onBackClick={() => navigate('/feedback/forms')}
      />

      <StatCards analytics={analytics} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <NpsChart npsData={npsData} hasData={analytics.total_responses > 0} />
        <RatingChart ratingData={ratingData} hasRatings={hasRatings} />
      </div>

      <ResponsesTable responses={responses} />
    </div>
  );
};

// Import FeedbackAnalyticsType
import { FeedbackAnalytics as FeedbackAnalyticsType } from '@/types/feedback';

