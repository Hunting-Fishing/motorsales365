import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  Zap, 
  Database, 
  Globe, 
  Server, 
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Download
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { getSystemMetrics, getSystemHealth, optimizationSuggestions, type PerformanceMetric, type SystemHealth } from '@/services/performance/performanceService';

// Removed mock data - now using live data from service

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadData();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const loadData = async () => {
    try {
      const [metricsData, healthData] = await Promise.all([
        getSystemMetrics(),
        getSystemHealth()
      ]);
      
      setMetrics(metricsData);
      setSystemHealth(healthData);
    } catch (error) {
      console.error('Error loading performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good': return <CheckCircle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-3 w-3 text-green-600" />;
      case 'down': return <TrendingDown className="h-3 w-3 text-red-600" />;
      default: return <div className="h-3 w-3" />;
    }
  };

  const getHealthColor = (value: number) => {
    if (value < 50) return 'bg-green-500';
    if (value < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const exportReport = () => {
    const data = {
      timestamp: new Date().toISOString(),
      metrics: metrics.map(m => ({ name: m.name, value: m.value, status: m.status })),
      systemHealth,
      suggestions: optimizationSuggestions
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${Date.now()}.json`;
    a.click();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Performance Monitor</h1>
          <p className="text-muted-foreground">
            Real-time system performance and optimization insights
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-green-50' : ''}
          >
            <Activity className="h-4 w-4 mr-2" />
            {autoRefresh ? 'Live' : 'Paused'}
          </Button>
          <Button
            variant="outline"
            onClick={refreshData}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={exportReport}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="system">System Health</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {metrics.map((metric) => (
              <Card key={metric.name}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
                  <div className="flex items-center gap-1">
                    {getTrendIcon(metric.trend)}
                    <Badge className={getStatusColor(metric.status)}>
                      {getStatusIcon(metric.status)}
                      <span className="ml-1 capitalize">{metric.status}</span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {metric.value.toFixed(metric.unit === '%' ? 1 : 2)}
                    <span className="text-sm font-normal text-muted-foreground ml-1">
                      {metric.unit}
                    </span>
                  </div>
                  <div className="h-20 mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={metric.history.slice(-12)}>
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke={metric.status === 'good' ? '#10b981' : metric.status === 'warning' ? '#f59e0b' : '#ef4444'}
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends (24h)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics[0].history}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.1}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          {/* System Health Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  CPU Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-2xl font-bold">{systemHealth?.cpu || 0}%</span>
                    <Badge className={(systemHealth?.cpu || 0) > 80 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                      {(systemHealth?.cpu || 0) > 80 ? 'High' : 'Normal'}
                    </Badge>
                  </div>
                  <Progress value={systemHealth?.cpu || 0} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  Memory Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-2xl font-bold">{systemHealth?.memory || 0}%</span>
                    <Badge className={(systemHealth?.memory || 0) > 80 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                      {(systemHealth?.memory || 0) > 80 ? 'High' : 'Normal'}
                    </Badge>
                  </div>
                  <Progress value={systemHealth?.memory || 0} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Database
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-2xl font-bold">{systemHealth?.database || 0}%</span>
                    <Badge className="bg-green-100 text-green-800">
                      Active
                    </Badge>
                  </div>
                  <Progress value={systemHealth?.database || 0} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Network
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-2xl font-bold">{systemHealth?.network || 0}%</span>
                    <Badge className="bg-green-100 text-green-800">
                      Normal
                    </Badge>
                  </div>
                  <Progress value={systemHealth?.network || 0} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Uptime
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-2xl font-bold">{systemHealth?.uptime || 0}%</span>
                    <Badge className="bg-green-100 text-green-800">
                      Excellent
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Last 30 days
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Optimization Suggestions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {optimizationSuggestions.map((suggestion, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {suggestion.type === 'critical' && <AlertTriangle className="h-4 w-4 text-red-600" />}
                        {suggestion.type === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
                        {suggestion.type === 'info' && <Activity className="h-4 w-4 text-blue-600" />}
                        <h3 className="font-semibold">{suggestion.title}</h3>
                        <Badge 
                          variant="outline" 
                          className={
                            suggestion.type === 'critical' ? 'border-red-200 text-red-700' :
                            suggestion.type === 'warning' ? 'border-yellow-200 text-yellow-700' :
                            'border-blue-200 text-blue-700'
                          }
                        >
                          {suggestion.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {suggestion.description}
                      </p>
                      <div className="flex gap-4 text-xs">
                        <span><strong>Impact:</strong> {suggestion.impact}</span>
                        <span><strong>Effort:</strong> {suggestion.effort}</span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      Apply Fix
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>High Memory Usage Detected</strong> - Memory usage has been above 75% for the last 2 hours.
                Consider implementing caching strategies or scaling resources.
              </AlertDescription>
            </Alert>

            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Performance Improved</strong> - API response times have improved by 15% since yesterday.
              </AlertDescription>
            </Alert>

            <Alert>
              <Activity className="h-4 w-4" />
              <AlertDescription>
                <strong>Scheduled Maintenance</strong> - Database maintenance is scheduled for tonight at 2 AM UTC.
                Expected duration: 30 minutes.
              </AlertDescription>
            </Alert>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}