import React from 'react';
import { TrendingUp, Users, BookOpen, MessageSquare, Clock, Star } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useHelpMetrics, usePopularArticles, useSearchTrends, useFeedbackStats } from '@/hooks/useHelpAnalytics';

interface HelpMetric {
  id: string;
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'stable';
  icon: React.ReactNode;
}

const getTrendIcon = (trend: string) => {
  switch (trend) {
    case 'up':
      return <TrendingUp className="h-3 w-3 text-green-500" />;
    case 'down':
      return <TrendingUp className="h-3 w-3 text-red-500 rotate-180" />;
    default:
      return <TrendingUp className="h-3 w-3 text-muted-foreground" />;
  }
};

const getTrendColor = (trend: string) => {
  switch (trend) {
    case 'up':
      return 'text-green-600';
    case 'down':
      return 'text-red-600';
    default:
      return 'text-muted-foreground';
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'tutorial':
      return 'default';
    case 'guide':
      return 'secondary';
    case 'video':
      return 'outline';
    case 'faq':
      return 'secondary';
    default:
      return 'secondary';
  }
};

export const HelpAnalytics: React.FC = () => {
  const { data: metrics, isLoading: metricsLoading } = useHelpMetrics();
  const { data: popularArticles, isLoading: articlesLoading } = usePopularArticles();
  const { data: searchTrends, isLoading: trendsLoading } = useSearchTrends();
  const { data: feedbackStats, isLoading: feedbackLoading } = useFeedbackStats();

  const helpMetrics = metrics ? [
    {
      id: '1',
      label: 'Total Help Views',
      value: metrics.totalViews.toLocaleString(),
      change: `${metrics.viewsChange > 0 ? '+' : ''}${metrics.viewsChange}%`,
      trend: metrics.viewsChange > 0 ? 'up' : 'down' as const,
      icon: <BookOpen className="h-4 w-4" />
    },
    {
      id: '2',
      label: 'Active Users',
      value: metrics.activeUsers.toLocaleString(),
      change: `${metrics.usersChange > 0 ? '+' : ''}${metrics.usersChange}%`,
      trend: metrics.usersChange > 0 ? 'up' : 'down' as const,
      icon: <Users className="h-4 w-4" />
    },
    {
      id: '3',
      label: 'Support Tickets',
      value: metrics.supportTickets.toString(),
      change: `${metrics.ticketsChange > 0 ? '+' : ''}${metrics.ticketsChange}%`,
      trend: metrics.ticketsChange > 0 ? 'up' : 'down' as const,
      icon: <MessageSquare className="h-4 w-4" />
    },
    {
      id: '4',
      label: 'Avg. Resolution Time',
      value: metrics.avgResolutionTime,
      change: `${metrics.resolutionChange > 0 ? '+' : ''}${metrics.resolutionChange}%`,
      trend: metrics.resolutionChange > 0 ? 'up' : 'down' as const,
      icon: <Clock className="h-4 w-4" />
    }
  ] : [];

  if (metricsLoading) {
    return <div>Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {helpMetrics.map((metric) => (
          <Card key={metric.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.label}
              </CardTitle>
              {metric.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <div className={`text-xs flex items-center gap-1 ${getTrendColor(metric.trend)}`}>
                {getTrendIcon(metric.trend)}
                {metric.change} from last month
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Popular Help Articles</CardTitle>
          <CardDescription>Most viewed and helpful content this month</CardDescription>
        </CardHeader>
        <CardContent>
          {articlesLoading ? (
            <div>Loading popular articles...</div>
          ) : (
            <div className="space-y-4">
              {(popularArticles || []).map((article, index) => (
                <div key={article.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{article.title}</span>
                        <Badge variant={getCategoryColor(article.category) as any} className="text-xs">
                          {article.category}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {article.views.toLocaleString()} views
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {article.rating}
                    </div>
                    <div className="text-muted-foreground">
                      {article.helpfulness}% helpful
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Search Trends</CardTitle>
            <CardDescription>What users are looking for</CardDescription>
          </CardHeader>
          <CardContent>
            {trendsLoading ? (
              <div>Loading search trends...</div>
            ) : (
              <div className="space-y-3">
                {(searchTrends || []).map((trend, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm">{trend.query}</span>
                    <Badge variant="outline">{trend.count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Help Feedback</CardTitle>
            <CardDescription>User satisfaction ratings</CardDescription>
          </CardHeader>
          <CardContent>
            {feedbackLoading ? (
              <div>Loading feedback stats...</div>
            ) : (
              <div className="space-y-3">
                {(feedbackStats || []).map((feedback, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{feedback.rating}</span>
                      <span className="text-muted-foreground">{feedback.count}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${feedback.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};