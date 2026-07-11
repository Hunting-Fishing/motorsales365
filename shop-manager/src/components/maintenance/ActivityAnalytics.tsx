import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, TrendingUp, Users, Activity } from 'lucide-react';
import { format, subDays, isAfter } from 'date-fns';

interface ActivityAnalyticsProps {
  activities: any[];
}

export function ActivityAnalytics({ activities }: ActivityAnalyticsProps) {
  const analytics = useMemo(() => {
    const last7Days = subDays(new Date(), 7);
    const recentActivities = activities.filter(a => 
      isAfter(new Date(a.timestamp), last7Days)
    );

    // Activity by type
    const actionCounts: Record<string, number> = {};
    activities.forEach(a => {
      const actionType = a.action.split(':')[0] || a.action;
      actionCounts[actionType] = (actionCounts[actionType] || 0) + 1;
    });

    // Most active users
    const userCounts: Record<string, number> = {};
    activities.forEach(a => {
      userCounts[a.user_name] = (userCounts[a.user_name] || 0) + 1;
    });

    const topUsers = Object.entries(userCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    const topActions = Object.entries(actionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    // Activity by day
    const dailyActivity: Record<string, number> = {};
    recentActivities.forEach(a => {
      const day = format(new Date(a.timestamp), 'MMM dd');
      dailyActivity[day] = (dailyActivity[day] || 0) + 1;
    });

    return {
      total: activities.length,
      recent: recentActivities.length,
      flagged: activities.filter(a => a.flagged).length,
      topUsers,
      topActions,
      dailyActivity,
    };
  }, [activities]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.total}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Last 7 Days</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{analytics.recent}</div>
            <p className="text-xs text-muted-foreground mt-1">Recent activity</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Flagged</CardTitle>
            <BarChart className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{analytics.flagged}</div>
            <p className="text-xs text-muted-foreground mt-1">Requires attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Most Active Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.topUsers.map(([user, count], index) => (
              <div key={user} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant={index === 0 ? 'default' : 'secondary'}>
                    #{index + 1}
                  </Badge>
                  <span className="font-medium">{user}</span>
                </div>
                <span className="text-sm text-muted-foreground">{count} activities</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            Most Common Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.topActions.map(([action, count]) => (
              <div key={action} className="flex items-center justify-between">
                <span className="font-medium">{action}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{
                        width: `${(count / analytics.total) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground w-12 text-right">
                    {count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Daily Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Daily Activity (Last 7 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(analytics.dailyActivity).map(([day, count]) => (
              <div key={day} className="flex items-center justify-between">
                <span className="font-medium">{day}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-muted rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${(count / Math.max(...Object.values(analytics.dailyActivity))) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground w-12 text-right">
                    {count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
