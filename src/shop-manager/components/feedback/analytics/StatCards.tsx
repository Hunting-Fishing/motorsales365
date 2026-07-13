
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FeedbackAnalytics } from '@/types/feedback';

interface StatCardsProps {
  analytics: FeedbackAnalytics;
}

export const StatCards: React.FC<StatCardsProps> = ({ analytics }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Total Responses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">{analytics.total_responses}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Average Rating</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">
            {analytics.average_rating.toFixed(1)}
            <span className="text-lg text-gray-500">/5</span>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">NPS Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">
            {Math.round(analytics.nps_score)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

