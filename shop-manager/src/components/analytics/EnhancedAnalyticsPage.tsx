import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AnalyticsOverview } from './AnalyticsOverview';
import { EnhancedRevenueChart } from './EnhancedRevenueChart';
import { ComparisonMetrics } from './ComparisonMetrics';
import { DrillDownAnalytics } from './DrillDownAnalytics';
import { CustomKPITracker } from './CustomKPITracker';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useEnhancedAnalytics } from '@/hooks/useEnhancedAnalytics';
import { BarChart3, TrendingUp, Users, Wrench, Calendar, Download, RefreshCw } from 'lucide-react';

export function EnhancedAnalyticsPage() {
  const [timeRange, setTimeRange] = useState('30d');
  const [viewMode, setViewMode] = useState<'overview' | 'detailed' | 'comparison'>('overview');
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  
  const { analytics, isLoading, error } = useAnalytics(timeRange);
  const { comparisonData, drillDownData, kpiData, isLoadingEnhanced } = useEnhancedAnalytics(timeRange);

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

  const handleMetricDrillDown = (metric: string) => {
    setSelectedMetric(metric);
    setViewMode('detailed');
  };

  const exportData = () => {
    // Implementation for exporting analytics data
    console.log('Exporting analytics data...');
  };

  const timeRangeOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 3 months' },
    { value: '6m', label: 'Last 6 months' },
    { value: '1y', label: 'Last year' },
    { value: 'ytd', label: 'Year to date' },
    { value: 'custom', label: 'Custom range' }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Enhanced Header with Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Enhanced Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Advanced business insights with drill-down capabilities
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              {timeRangeOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-1">
            <Button
              variant={viewMode === 'overview' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('overview')}
            >
              Overview
            </Button>
            <Button
              variant={viewMode === 'detailed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('detailed')}
            >
              Detailed
            </Button>
            <Button
              variant={viewMode === 'comparison' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('comparison')}
            >
              Compare
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Performance Indicators */}
      <div className="flex gap-2">
        <Badge variant={isLoading ? 'secondary' : 'default'}>
          {isLoading ? 'Loading...' : 'Live Data'}
        </Badge>
        <Badge variant="outline">
          {timeRange === '7d' ? '7 Days' : 
           timeRange === '30d' ? '30 Days' :
           timeRange === '90d' ? '90 Days' : 'Custom'}
        </Badge>
      </div>

      {/* Enhanced Overview Cards with Click-through */}
      <div onClick={() => handleMetricDrillDown('overview')}>
        <AnalyticsOverview analytics={analytics} isLoading={isLoading} />
      </div>

      {/* Main Analytics Content */}
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview Dashboard</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Analysis</TabsTrigger>
          <TabsTrigger value="comparison">Period Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Enhanced Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Enhanced Revenue Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EnhancedRevenueChart 
                  data={analytics?.revenue} 
                  isLoading={isLoading}
                  timeRange={timeRange}
                  onDrillDown={(data) => handleMetricDrillDown('revenue')}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Custom KPI Tracker
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CustomKPITracker 
                  data={kpiData} 
                  isLoading={isLoadingEnhanced}
                  onKPIClick={(kpi) => handleMetricDrillDown(kpi)}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="detailed" className="space-y-6">
          <DrillDownAnalytics 
            selectedMetric={selectedMetric}
            data={drillDownData}
            isLoading={isLoadingEnhanced}
            timeRange={timeRange}
          />
        </TabsContent>

        <TabsContent value="comparison" className="space-y-6">
          <ComparisonMetrics 
            data={comparisonData}
            isLoading={isLoadingEnhanced}
            timeRange={timeRange}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}