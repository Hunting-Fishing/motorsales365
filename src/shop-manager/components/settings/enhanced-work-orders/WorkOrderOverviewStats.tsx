import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  DollarSign,
  Users,
  TrendingUp,
  TrendingDown,
  RefreshCw
} from 'lucide-react';
import { useWorkOrderStats } from '@/hooks/work-orders/useWorkOrderStats';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export function WorkOrderOverviewStats() {
  const { stats, changes, loading, error, refetch } = useWorkOrderStats();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <LoadingSpinner />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 text-red-600 bg-red-50 rounded-lg">
        <AlertTriangle className="h-4 w-4" />
        <span>Failed to load stats: {error}</span>
        <button onClick={refetch} className="ml-auto">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const statsConfig = [
    {
      title: 'Total Work Orders',
      value: stats.total.toString(),
      change: changes.total,
      trend: 'up',
      icon: FileText,
      color: 'bg-gradient-to-br from-blue-500 to-blue-600'
    },
    {
      title: 'In Progress',
      value: stats.inProgress.toString(),
      change: changes.inProgress,
      trend: 'up',
      icon: Clock,
      color: 'bg-gradient-to-br from-orange-500 to-orange-600'
    },
    {
      title: 'Completed This Month',
      value: stats.completed.toString(),
      change: changes.completed,
      trend: 'up',
      icon: CheckCircle,
      color: 'bg-gradient-to-br from-green-500 to-green-600'
    },
    {
      title: 'Overdue',
      value: stats.overdue.toString(),
      change: changes.overdue,
      trend: stats.overdue < 10 ? 'down' : 'up',
      icon: AlertTriangle,
      color: 'bg-gradient-to-br from-red-500 to-red-600'
    },
    {
      title: 'Revenue This Month',
      value: formatCurrency(stats.revenue),
      change: changes.revenue,
      trend: 'up',
      icon: DollarSign,
      color: 'bg-gradient-to-br from-emerald-500 to-emerald-600'
    },
    {
      title: 'Active Technicians',
      value: stats.activeTechnicians.toString(),
      change: changes.activeTechnicians,
      trend: 'up',
      icon: Users,
      color: 'bg-gradient-to-br from-purple-500 to-purple-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {statsConfig.map((stat) => {
        const Icon = stat.icon;
        const isPositive = stat.trend === 'up';
        const TrendIcon = isPositive ? TrendingUp : TrendingDown;
        
        return (
          <Card key={stat.title} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <div className="flex items-center gap-1">
                    <TrendIcon className={`h-3 w-3 ${isPositive ? 'text-green-600' : 'text-red-600'}`} />
                    <span className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {stat.change || '+0%'}
                    </span>
                    <span className="text-xs text-muted-foreground">vs last month</span>
                  </div>
                </div>
                <div className={`p-2 rounded-lg ${stat.color}`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}