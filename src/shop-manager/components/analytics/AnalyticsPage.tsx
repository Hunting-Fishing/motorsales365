import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AnalyticsOverview } from './AnalyticsOverview';
import { RevenueAnalytics } from './RevenueAnalytics';
import { WorkOrderAnalytics } from './WorkOrderAnalytics';
import { CustomerAnalytics } from './CustomerAnalytics';
import { PerformanceMetrics } from './PerformanceMetrics';
import { useAnalytics } from '@/hooks/useAnalytics';
import { BarChart3, TrendingUp, Users, Wrench } from 'lucide-react';

export function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('30d');
  const { analytics, isLoading, error } = useAnalytics(timeRange);

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-error text-lg mb-4">Error loading analytics</p>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Business insights and performance metrics for your auto shop
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 3 months</SelectItem>
            <SelectItem value="1y">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Cards */}
      <AnalyticsOverview analytics={analytics} isLoading={isLoading} />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Revenue Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueAnalytics data={analytics?.revenue} isLoading={isLoading} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Work Order Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <WorkOrderAnalytics data={analytics?.workOrders} isLoading={isLoading} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Customer Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CustomerAnalytics data={analytics?.customers} isLoading={isLoading} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PerformanceMetrics data={analytics?.performance} isLoading={isLoading} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}