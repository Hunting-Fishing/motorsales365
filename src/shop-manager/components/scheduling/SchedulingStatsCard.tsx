import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { useSchedulingStats } from '@/hooks/useSchedulingStats';
import { Skeleton } from '@/components/ui/skeleton';

interface SchedulingStatsCardProps {
  date: Date;
}

export function SchedulingStatsCard({ date }: SchedulingStatsCardProps) {
  const { stats, loading } = useSchedulingStats(date);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scheduling Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const statCards = [
    {
      title: 'Total Hours',
      value: stats?.total_scheduled_hours?.toFixed(1) || '0',
      icon: Clock,
      color: 'text-blue-600'
    },
    {
      title: 'Employees Scheduled',
      value: stats?.total_employees_scheduled || 0,
      icon: Users,
      color: 'text-green-600'
    },
    {
      title: 'Active Conflicts',
      value: stats?.active_conflicts || 0,
      icon: AlertTriangle,
      color: stats?.active_conflicts ? 'text-red-600' : 'text-gray-400'
    },
    {
      title: 'Total Shifts',
      value: stats?.total_shifts || 0,
      icon: TrendingUp,
      color: 'text-purple-600'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scheduling Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.title} className="flex flex-col space-y-2 p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{stat.title}</span>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <span className="text-2xl font-bold">{stat.value}</span>
              </div>
            );
          })}
        </div>
        
        {stats && stats.critical_conflicts > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">
                {stats.critical_conflicts} critical conflict{stats.critical_conflicts !== 1 ? 's' : ''} requiring immediate attention
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
