import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DollarSign, Clock, TrendingUp, Users } from 'lucide-react';
import { useLaborAnalytics } from '@/hooks/useLaborAnalytics';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

export function LaborCostDashboard() {
  const { loading, analytics } = useLaborAnalytics();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Labor Cost Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const latestPeriod = analytics[0];

  if (!latestPeriod) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Labor Cost Analytics</CardTitle>
          <CardDescription>Track labor costs, hours, and efficiency</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No analytics data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const metrics = [
    {
      title: 'Total Labor Cost',
      value: `$${latestPeriod.total_labor_cost.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-green-600'
    },
    {
      title: 'Total Hours',
      value: latestPeriod.total_labor_hours.toFixed(1),
      icon: Clock,
      color: 'text-blue-600'
    },
    {
      title: 'Overtime Hours',
      value: latestPeriod.overtime_hours.toFixed(1),
      icon: TrendingUp,
      color: 'text-orange-600'
    },
    {
      title: 'Avg Hourly Rate',
      value: latestPeriod.average_hourly_rate 
        ? `$${latestPeriod.average_hourly_rate.toFixed(2)}`
        : 'N/A',
      icon: Users,
      color: 'text-purple-600'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Labor Cost Analytics</CardTitle>
        <CardDescription>
          Period: {format(new Date(latestPeriod.period_start), 'MMM d')} - {format(new Date(latestPeriod.period_end), 'MMM d, yyyy')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.title} className="p-4 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{metric.title}</span>
                  <Icon className={`h-4 w-4 ${metric.color}`} />
                </div>
                <div className="text-2xl font-bold">{metric.value}</div>
              </div>
            );
          })}
        </div>

        {latestPeriod.labor_cost_percentage && (
          <div className="mt-4 p-3 rounded-lg bg-muted/30">
            <div className="text-sm text-muted-foreground mb-1">Labor Cost %</div>
            <div className="text-xl font-semibold">{latestPeriod.labor_cost_percentage.toFixed(1)}%</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
