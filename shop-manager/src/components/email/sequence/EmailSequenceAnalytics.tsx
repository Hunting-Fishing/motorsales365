
import React, { useEffect } from 'react';
import { useSequenceAnalytics } from '@/hooks/email/sequence/useSequenceAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

interface EmailSequenceAnalyticsProps {
  sequenceId: string;
  refreshInterval?: number;
}

export function EmailSequenceAnalytics({ sequenceId, refreshInterval = 60000 }: EmailSequenceAnalyticsProps) {
  const { analytics, loading, error, fetchAnalytics, refreshAnalytics } = useSequenceAnalytics();

  useEffect(() => {
    if (sequenceId) {
      // Initial fetch
      fetchAnalytics(sequenceId);
      
      // Set up refresh interval if provided
      let cleanup: (() => void) | null = null;
      if (refreshInterval > 0) {
        refreshAnalytics(refreshInterval).then(cleanupFn => {
          cleanup = cleanupFn;
        });
      }
      
      // Cleanup on unmount
      return () => {
        if (cleanup) cleanup();
      };
    }
  }, [sequenceId, fetchAnalytics, refreshAnalytics, refreshInterval]);

  if (loading && !analytics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sequence Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">Loading analytics data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sequence Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <p className="text-red-500">Error loading analytics: {error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sequence Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <p>No analytics data available for this sequence.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate metrics for display
  const completionRate = analytics.totalEnrollments > 0
    ? ((analytics.completedEnrollments / analytics.totalEnrollments) * 100).toFixed(1)
    : "0.0";
    
  const averageCompletionTime = analytics.averageTimeToComplete
    ? `${Math.round(analytics.averageTimeToComplete / (1000 * 60 * 60))} hours`
    : "N/A";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Sequence Analytics</span>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-100 p-4 rounded-lg">
                <h3 className="text-sm font-medium">Total Enrollments</h3>
                <p className="text-2xl font-bold">{analytics.totalEnrollments}</p>
              </div>
              <div className="bg-gray-100 p-4 rounded-lg">
                <h3 className="text-sm font-medium">Active</h3>
                <p className="text-2xl font-bold">{analytics.activeEnrollments}</p>
              </div>
              <div className="bg-gray-100 p-4 rounded-lg">
                <h3 className="text-sm font-medium">Completed</h3>
                <p className="text-2xl font-bold">{analytics.completedEnrollments}</p>
              </div>
              <div className="bg-gray-100 p-4 rounded-lg">
                <h3 className="text-sm font-medium">Cancelled</h3>
                <p className="text-2xl font-bold">{analytics.cancelledEnrollments || 0}</p>
              </div>
            </div>
          
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-gray-100 p-4 rounded-lg">
                <h3 className="text-sm font-medium">Completion Rate</h3>
                <p className="text-2xl font-bold">{completionRate}%</p>
              </div>
              <div className="bg-gray-100 p-4 rounded-lg">
                <h3 className="text-sm font-medium">Avg. Completion Time</h3>
                <p className="text-2xl font-bold">{averageCompletionTime}</p>
              </div>
              <div className="bg-gray-100 p-4 rounded-lg">
                <h3 className="text-sm font-medium">Emails Sent</h3>
                <p className="text-2xl font-bold">{analytics.emailsSent || 0}</p>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="timeline">
            {analytics.timeline && analytics.timeline.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={analytics.timeline}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="enrollments" name="Enrollments" stroke="#8884d8" activeDot={{ r: 8 }} />
                    <Line type="monotone" dataKey="emailsSent" name="Emails Sent" stroke="#82ca9d" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <p className="text-gray-500">No timeline data available yet.</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="performance">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="bg-gray-100 p-4 rounded-lg">
                <h3 className="text-sm font-medium">Open Rate</h3>
                <p className="text-2xl font-bold">{analytics.openRate ? `${(analytics.openRate * 100).toFixed(1)}%` : 'N/A'}</p>
              </div>
              <div className="bg-gray-100 p-4 rounded-lg">
                <h3 className="text-sm font-medium">Click Rate</h3>
                <p className="text-2xl font-bold">{analytics.clickRate ? `${(analytics.clickRate * 100).toFixed(1)}%` : 'N/A'}</p>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium mb-2">Status Distribution</h3>
              <div className="flex gap-2 flex-wrap">
                <Badge className="bg-green-500">
                  Active: {((analytics.activeEnrollments / (analytics.totalEnrollments || 1)) * 100).toFixed(1)}%
                </Badge>
                <Badge className="bg-blue-500">
                  Completed: {((analytics.completedEnrollments / (analytics.totalEnrollments || 1)) * 100).toFixed(1)}%
                </Badge>
                <Badge className="bg-red-500">
                  Cancelled: {(((analytics.cancelledEnrollments || 0) / (analytics.totalEnrollments || 1)) * 100).toFixed(1)}%
                </Badge>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="text-xs text-gray-500 mt-4 text-right">
          Last updated: {new Date(analytics.updatedAt || analytics.updated_at).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
}
