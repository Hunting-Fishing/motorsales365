import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Clock,
  PieChart,
  Activity,
  AlertTriangle,
  RefreshCw,
  Calendar
} from 'lucide-react';
import { useWorkOrderStats } from '@/hooks/work-orders/useWorkOrderStats';
import { useDailyWorkOrders } from '@/hooks/work-orders/useDailyWorkOrders';
import { useWorkOrderAnalytics, TimePeriod } from '@/hooks/work-orders/useWorkOrderAnalytics';

export function WorkOrderAnalytics() {
  const [timeRange, setTimeRange] = useState<TimePeriod>('month');
  const { stats, loading: statsLoading, error: statsError, refetch: refetchStats } = useWorkOrderStats();
  const { dailyData, loading: dailyLoading, error: dailyError, refetch: refetchDaily } = useDailyWorkOrders();
  const { analytics, loading: analyticsLoading, error: analyticsError, refetch: refetchAnalytics } = useWorkOrderAnalytics(timeRange);

  const loading = statsLoading || dailyLoading || analyticsLoading;
  const error = statsError || dailyError || analyticsError;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 text-red-600 bg-red-50 rounded-lg">
        <AlertTriangle className="h-4 w-4" />
        <span>Failed to load analytics: {error}</span>
        <button onClick={() => { refetchStats(); refetchDaily(); refetchAnalytics(); }} className="ml-auto">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // Create status distribution from live data
  const total = stats.total || 1; // Prevent division by zero
  const statusDistribution = [
    { 
      status: 'Completed', 
      count: stats.completed, 
      percentage: Math.round((stats.completed / total) * 100), 
      color: 'bg-green-500' 
    },
    { 
      status: 'In Progress', 
      count: stats.inProgress, 
      percentage: Math.round((stats.inProgress / total) * 100), 
      color: 'bg-blue-500' 
    },
    { 
      status: 'Pending', 
      count: stats.pendingAssignment, 
      percentage: Math.round((stats.pendingAssignment / total) * 100), 
      color: 'bg-yellow-500' 
    },
    { 
      status: 'Overdue', 
      count: stats.overdue, 
      percentage: Math.round((stats.overdue / total) * 100), 
      color: 'bg-red-500' 
    }
  ];

  // Use analytics data for charts
  const chartData = analytics.data.length > 0 ? analytics.data : [
    { period: 'No Data', completed: 0, created: 0, revenue: 0, avgCompletionTime: 0 }
  ];

  return (
    <div className="space-y-6">
      {/* Analytics Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Work Order Analytics</h3>
        </div>
        <Select value={timeRange} onValueChange={(value: TimePeriod) => setTimeRange(value)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Daily</SelectItem>
            <SelectItem value="week">Weekly</SelectItem>
            <SelectItem value="month">Monthly</SelectItem>
            <SelectItem value="quarter">Quarterly</SelectItem>
            <SelectItem value="year">Yearly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Work Orders Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Daily Work Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {chartData.slice(-10).map((item, index) => {
                const maxValue = Math.max(...chartData.map(d => Math.max(d.completed, d.created)));
                return (
                  <div key={item.period} className="flex items-center gap-4">
                    <span className="text-sm font-medium w-20 truncate">{item.period}</span>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                          <div 
                            className="h-full bg-green-500 rounded-full transition-all duration-300"
                            style={{ width: `${maxValue > 0 ? (item.completed / maxValue) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-12">{item.completed}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full transition-all duration-300"
                            style={{ width: `${maxValue > 0 ? (item.created / maxValue) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-12">{item.created}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center gap-4 pt-2 border-t">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                  <span className="text-sm">Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full" />
                  <span className="text-sm">Created</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {statusDistribution.map((item) => (
                <div key={item.status} className="flex items-center gap-4">
                  <div className={`w-4 h-4 rounded-full ${item.color}`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{item.status}</span>
                      <span className="text-sm text-muted-foreground">{item.count}</span>
                    </div>
                    <div className="bg-muted rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-full ${item.color} rounded-full`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-medium w-8">{item.percentage}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Live Statistics Summary */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Live Work Order Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-blue-600">{analytics.totalCreated}</p>
                <p className="text-sm text-muted-foreground">Total Created</p>
                <p className="text-xs text-muted-foreground">
                  {analytics.periodComparison.created > 0 ? '+' : ''}{analytics.periodComparison.created.toFixed(1)}%
                </p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-green-600">{analytics.totalCompleted}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-xs text-muted-foreground">
                  {analytics.periodComparison.completed > 0 ? '+' : ''}{analytics.periodComparison.completed.toFixed(1)}%
                </p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-purple-600">${analytics.totalRevenue.toFixed(0)}</p>
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="text-xs text-muted-foreground">
                  {analytics.periodComparison.revenue > 0 ? '+' : ''}{analytics.periodComparison.revenue.toFixed(1)}%
                </p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-orange-600">${analytics.averageValue.toFixed(0)}</p>
                <p className="text-sm text-muted-foreground">Avg Value</p>
                <p className="text-xs text-muted-foreground">Per work order</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Current Period:</span>
                  <span className="ml-2 font-medium capitalize">{timeRange}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Data Points:</span>
                  <span className="ml-2 font-medium">{analytics.data.length}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Active Technicians:</span>
                  <span className="ml-2 font-medium">{stats.activeTechnicians}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}