import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Wrench, CheckCircle, AlertTriangle, XCircle, Clock, DollarSign, TrendingUp, Activity } from 'lucide-react';

interface FleetStats {
  total: number;
  operational: number;
  maintenance: number;
  outOfService: number;
  avgHours: number;
  totalValue: number;
  upcomingMaintenance: number;
  operationalRate: number;
}

interface FleetHealthOverviewProps {
  stats?: FleetStats;
  isLoading: boolean;
}

export function FleetHealthOverview({ stats, isLoading }: FleetHealthOverviewProps) {
  const statCards = [
    {
      title: 'Total Equipment',
      value: stats?.total || 0,
      icon: Wrench,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      title: 'Operational',
      value: stats?.operational || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      suffix: stats ? `${stats.operationalRate}%` : undefined
    },
    {
      title: 'In Maintenance',
      value: stats?.maintenance || 0,
      icon: AlertTriangle,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30'
    },
    {
      title: 'Out of Service',
      value: stats?.outOfService || 0,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100 dark:bg-red-900/30'
    },
    {
      title: 'Avg. Hours',
      value: stats?.avgHours || 0,
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      suffix: 'hrs'
    },
    {
      title: 'Fleet Value',
      value: stats?.totalValue || 0,
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
      format: 'currency'
    },
    {
      title: 'Upcoming Maintenance',
      value: stats?.upcomingMaintenance || 0,
      icon: Activity,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
      suffix: 'next 14 days'
    },
    {
      title: 'Fleet Health',
      value: stats?.operationalRate || 0,
      icon: TrendingUp,
      color: stats && stats.operationalRate >= 80 ? 'text-green-600' : stats && stats.operationalRate >= 60 ? 'text-yellow-600' : 'text-red-600',
      bgColor: stats && stats.operationalRate >= 80 ? 'bg-green-100 dark:bg-green-900/30' : stats && stats.operationalRate >= 60 ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-red-100 dark:bg-red-900/30',
      suffix: '%'
    }
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        let displayValue: string;
        
        if (stat.format === 'currency') {
          displayValue = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          }).format(stat.value);
        } else {
          displayValue = stat.value.toLocaleString();
        }

        return (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <div className="flex items-baseline gap-1">
                    <p className="text-2xl font-bold text-foreground">{displayValue}</p>
                    {stat.suffix && !stat.format && (
                      <span className="text-sm text-muted-foreground">{stat.suffix}</span>
                    )}
                  </div>
                </div>
                <div className={`p-3 rounded-full ${stat.bgColor}`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
