import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown,
  Mail, 
  MessageSquare, 
  Bell, 
  Phone,
  BarChart3,
  PieChart,
  Activity,
  Target
} from 'lucide-react';

interface NotificationAnalyticsDashboardProps {
  analytics: any;
  isLoading: boolean;
}

export function NotificationAnalyticsDashboard({ analytics, isLoading }: NotificationAnalyticsDashboardProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                <div className="h-2 bg-gray-200 rounded w-full"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">No analytics data available</p>
        </CardContent>
      </Card>
    );
  }

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'sms': return <MessageSquare className="h-4 w-4" />;
      case 'in_app': return <Bell className="h-4 w-4" />;
      case 'push': return <Phone className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getTrendIcon = (value: number, threshold: number = 0, inverse = false) => {
    return value >= threshold ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-500" />
    );
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Delivery Rate</p>
                <p className="text-2xl font-bold">{analytics.delivery_rate}%</p>
              </div>
              <div className="flex items-center gap-2">
                {getTrendIcon(analytics.delivery_rate, 90)}
                <Target className="h-8 w-8 text-blue-500" />
              </div>
            </div>
            <Progress value={analytics.delivery_rate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Open Rate</p>
                <p className="text-2xl font-bold">{analytics.open_rate}%</p>
              </div>
              <div className="flex items-center gap-2">
                {getTrendIcon(analytics.open_rate, 20)}
                <Mail className="h-8 w-8 text-green-500" />
              </div>
            </div>
            <Progress value={analytics.open_rate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Click Rate</p>
                <p className="text-2xl font-bold">{analytics.click_rate}%</p>
              </div>
              <div className="flex items-center gap-2">
                {getTrendIcon(analytics.click_rate, 5)}
                <Activity className="h-8 w-8 text-purple-500" />
              </div>
            </div>
            <Progress value={analytics.click_rate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Bounce Rate</p>
                <p className="text-2xl font-bold">{analytics.bounce_rate}%</p>
              </div>
              <div className="flex items-center gap-2">
                {getTrendIcon(analytics.bounce_rate, 5)}
                <TrendingDown className="h-8 w-8 text-red-500" />
              </div>
            </div>
            <Progress value={analytics.bounce_rate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Channel Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Channel Breakdown
          </CardTitle>
          <CardDescription>Notifications sent by channel today</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(analytics.channel_breakdown).map(([channel, count]) => (
              <div key={channel} className="text-center p-4 border rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  {getChannelIcon(channel)}
                </div>
                <p className="text-2xl font-bold">{String(count)}</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {channel.replace('_', ' ')}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Rule Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Rule Performance
          </CardTitle>
          <CardDescription>Performance metrics for active notification rules</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.rule_performance?.map((rule: any, index: number) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{rule.rule_name}</h4>
                  <Badge variant="secondary">
                    {rule.delivery_rate}% delivery rate
                  </Badge>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Triggered</p>
                    <p className="font-medium">{rule.triggered_count} times</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Avg Delivery Time</p>
                    <p className="font-medium">{rule.avg_delivery_time}min</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Success Rate</p>
                    <Progress value={rule.delivery_rate} className="mt-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Delivery Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            7-Day Delivery Trends
          </CardTitle>
          <CardDescription>Daily notification delivery statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.delivery_trends?.map((day: any, index: number) => (
              <div key={index} className="grid grid-cols-5 gap-4 items-center p-3 border rounded">
                <div>
                  <p className="font-medium">{new Date(day.date).toLocaleDateString()}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Sent</p>
                  <p className="font-medium">{day.sent}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Delivered</p>
                  <p className="font-medium text-green-600">{day.delivered}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Opened</p>
                  <p className="font-medium text-blue-600">{day.opened}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Clicked</p>
                  <p className="font-medium text-purple-600">{day.clicked}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}