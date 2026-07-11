import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Calendar,
  ArrowLeft,
  BarChart3,
  Target,
  Clock,
  Star,
  Percent
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function PowerWashingAnalytics() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState('30');

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['power-washing-metrics', dateRange],
    queryFn: async () => {
      const startDate = format(subDays(new Date(), parseInt(dateRange)), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('power_washing_metrics')
        .select('*')
        .gte('metric_date', startDate)
        .order('metric_date', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: jobStats } = useQuery({
    queryKey: ['power-washing-job-stats', dateRange],
    queryFn: async () => {
      const startDate = format(subDays(new Date(), parseInt(dateRange)), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('power_washing_jobs')
        .select('status, property_type, quoted_price')
        .gte('created_at', startDate);
      
      if (error) throw error;
      
      const statusCounts = (data || []).reduce((acc, job) => {
        acc[job.status] = (acc[job.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const propertyTypeCounts = (data || []).reduce((acc, job) => {
        acc[job.property_type] = (acc[job.property_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const totalRevenue = (data || []).reduce((sum, job) => sum + (job.quoted_price || 0), 0);
      const completedJobs = statusCounts['completed'] || 0;
      
      return {
        total: data?.length || 0,
        statusCounts,
        propertyTypeCounts,
        totalRevenue,
        completedJobs,
        averageJobValue: completedJobs > 0 ? totalRevenue / completedJobs : 0,
      };
    },
  });

  const { data: quoteStats } = useQuery({
    queryKey: ['power-washing-quote-stats', dateRange],
    queryFn: async () => {
      const startDate = format(subDays(new Date(), parseInt(dateRange)), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('power_washing_quotes')
        .select('status')
        .gte('created_at', startDate);
      
      if (error) throw error;
      
      const total = data.length;
      const accepted = data.filter(q => q.status === 'accepted').length;
      const conversionRate = total > 0 ? (accepted / total) * 100 : 0;
      
      return { total, accepted, conversionRate };
    },
  });

  const { data: reviewStats } = useQuery({
    queryKey: ['power-washing-review-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('power_washing_reviews')
        .select('rating');
      
      if (error) throw error;
      
      const total = data.length;
      const avgRating = total > 0 ? data.reduce((sum, r) => sum + r.rating, 0) / total : 0;
      
      return { total, avgRating };
    },
  });

  const revenueData = metrics?.map(m => ({
    date: format(new Date(m.metric_date), 'MMM d'),
    revenue: m.revenue || 0,
    jobs: m.jobs_completed || 0,
  })) || [];

  const propertyTypeData = jobStats?.propertyTypeCounts 
    ? Object.entries(jobStats.propertyTypeCounts).map(([name, value]) => ({ name, value }))
    : [];

  const statusData = jobStats?.statusCounts
    ? Object.entries(jobStats.statusCounts).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/power-washing')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-blue-500" />
              Analytics Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Business performance insights and trends
            </p>
          </div>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
              <SelectItem value="365">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">${(jobStats?.totalRevenue || 0).toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-full bg-green-500/10">
                <DollarSign className="h-6 w-6 text-green-500" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-sm text-green-500">
              <TrendingUp className="h-4 w-4" />
              <span>+12% from previous period</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Jobs Completed</p>
                <p className="text-2xl font-bold">{jobStats?.completedJobs || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-500/10">
                <Target className="h-6 w-6 text-blue-500" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Avg. ${(jobStats?.averageJobValue || 0).toFixed(0)} per job
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Quote Conversion</p>
                <p className="text-2xl font-bold">{(quoteStats?.conversionRate || 0).toFixed(1)}%</p>
              </div>
              <div className="p-3 rounded-full bg-amber-500/10">
                <Percent className="h-6 w-6 text-amber-500" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {quoteStats?.accepted || 0} of {quoteStats?.total || 0} quotes accepted
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Rating</p>
                <p className="text-2xl font-bold">{(reviewStats?.avgRating || 0).toFixed(1)}/5</p>
              </div>
              <div className="p-3 rounded-full bg-yellow-500/10">
                <Star className="h-6 w-6 text-yellow-500" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {reviewStats?.total || 0} total reviews
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue Trend */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))' 
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available for this period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Jobs by Status */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Jobs by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))' 
                    }} 
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Property Type Distribution */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle>Jobs by Property Type</CardTitle>
        </CardHeader>
        <CardContent>
          {propertyTypeData.length > 0 ? (
            <div className="flex items-center gap-8">
              <ResponsiveContainer width="50%" height={250}>
                <PieChart>
                  <Pie
                    data={propertyTypeData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {propertyTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {propertyTypeData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm">{entry.name}: {entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
