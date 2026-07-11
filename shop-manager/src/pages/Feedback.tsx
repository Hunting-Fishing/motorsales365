import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Star, ThumbsUp, Users, Loader2 } from 'lucide-react';
import { FeedbackManager } from '@/components/feedback/FeedbackManager';
import { useQuery } from '@tanstack/react-query';
import { calculateFeedbackStats } from '@/services/feedback/feedbackManagerService';

export default function Feedback() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['feedback-stats'],
    queryFn: calculateFeedbackStats,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  return (
    <>
      <Helmet>
        <title>Customer Feedback | All Business 365</title>
      </Helmet>
      
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customer Feedback</h1>
          <p className="text-muted-foreground">
            Monitor and respond to customer reviews and feedback
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {stats?.averageRating.toFixed(1) || '0.0'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Based on {stats?.totalResponses || 0} reviews
                  </p>
                </>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New Reviews</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats?.newReviewsThisWeek || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    This week
                  </p>
                </>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Positive Feedback</CardTitle>
              <ThumbsUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats?.positivePercentage || 0}%</div>
                  <p className="text-xs text-muted-foreground">
                    4+ star ratings
                  </p>
                </>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats?.responseRate || 0}%</div>
                  <p className="text-xs text-muted-foreground">
                    Reviews responded to
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <FeedbackManager />
      </div>
    </>
  );
}
