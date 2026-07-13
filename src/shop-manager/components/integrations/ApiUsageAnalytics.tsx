
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Activity, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface ApiUsageData {
  endpoint: string;
  requests_count: number;
  limit_per_window: number;
  last_request_at: string | null;
}

interface EndpointStats {
  name: string;
  response_time_ms: number | null;
  success_rate: number | null;
  last_called_at: string | null;
}

export function ApiUsageAnalytics() {
  const [usageData, setUsageData] = useState<ApiUsageData[]>([]);
  const [endpointStats, setEndpointStats] = useState<EndpointStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadApiUsageData();
  }, []);

  const loadApiUsageData = async () => {
    try {
      setIsLoading(true);

      // Fetch rate limit data
      const { data: rateLimits, error: rateError } = await supabase
        .from('api_rate_limits')
        .select('endpoint, requests_count, limit_per_window, last_request_at')
        .order('requests_count', { ascending: false })
        .limit(10);

      if (rateError) throw rateError;

      // Fetch endpoint stats
      const { data: endpoints, error: endpointsError } = await supabase
        .from('api_endpoints')
        .select('name, response_time_ms, success_rate, last_called_at')
        .eq('is_active', true)
        .order('last_called_at', { ascending: false })
        .limit(10);

      if (endpointsError) throw endpointsError;

      setUsageData(rateLimits || []);
      setEndpointStats(endpoints || []);
    } catch (error) {
      console.error('Error loading API usage data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const totalRequests = usageData.reduce((sum, d) => sum + (d.requests_count || 0), 0);
  const avgResponseTime = endpointStats.length > 0 
    ? Math.round(endpointStats.reduce((sum, e) => sum + (e.response_time_ms || 0), 0) / endpointStats.length)
    : 0;
  const avgSuccessRate = endpointStats.length > 0
    ? Math.round(endpointStats.reduce((sum, e) => sum + (e.success_rate || 0), 0) / endpointStats.length)
    : 0;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const chartData = usageData.map(d => ({
    name: d.endpoint.split('/').pop() || d.endpoint,
    requests: d.requests_count,
    limit: d.limit_per_window
  }));

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Activity className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{totalRequests}</p>
                <p className="text-sm text-muted-foreground">Total Requests</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{avgResponseTime}ms</p>
                <p className="text-sm text-muted-foreground">Avg Response Time</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{avgSuccessRate}%</p>
                <p className="text-sm text-muted-foreground">Success Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{endpointStats.length}</p>
                <p className="text-sm text-muted-foreground">Active Endpoints</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage Chart */}
      <Card>
        <CardHeader>
          <CardTitle>API Request Distribution</CardTitle>
          <CardDescription>Requests per endpoint vs rate limits</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="requests" fill="hsl(var(--primary))" name="Requests" />
                <Bar dataKey="limit" fill="hsl(var(--muted))" name="Limit" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No API usage data available yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Endpoint List */}
      <Card>
        <CardHeader>
          <CardTitle>Active Endpoints</CardTitle>
          <CardDescription>Performance metrics for active API endpoints</CardDescription>
        </CardHeader>
        <CardContent>
          {endpointStats.length > 0 ? (
            <div className="space-y-3">
              {endpointStats.map((endpoint, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div>
                    <p className="font-medium">{endpoint.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Last called: {endpoint.last_called_at 
                        ? new Date(endpoint.last_called_at).toLocaleString() 
                        : 'Never'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">
                      <span className="font-medium">{endpoint.response_time_ms || 0}ms</span> avg
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {endpoint.success_rate || 0}% success
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No active endpoints configured
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
