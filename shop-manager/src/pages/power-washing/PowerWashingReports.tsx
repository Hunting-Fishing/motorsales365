import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  TrendingUp, 
  DollarSign,
  Calendar,
  Users,
  Clock,
  BarChart3,
  PieChart
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart as RechartPieChart,
  Pie,
  Cell
} from 'recharts';

interface ReportStats {
  totalJobs: number;
  completedJobs: number;
  totalRevenue: number;
  avgJobValue: number;
  totalHours: number;
  jobsByStatus: { name: string; value: number }[];
  revenueByWeek: { week: string; revenue: number }[];
  jobsByPropertyType: { name: string; value: number }[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function PowerWashingReports() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  useEffect(() => {
    if (user) {
      fetchReportData();
    }
  }, [user, dateRange]);

  const getDateRange = () => {
    const now = new Date();
    switch (dateRange) {
      case 'week':
        return { start: subDays(now, 7), end: now };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'quarter':
        return { start: subDays(now, 90), end: now };
      case 'year':
        return { start: subDays(now, 365), end: now };
    }
  };

  const fetchReportData = async () => {
    try {
      const { start, end } = getDateRange();
      
      // Fetch profile to get shop_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('user_id', user?.id)
        .single();

      if (!profile?.shop_id) return;

      // Fetch jobs
      const { data: jobs } = await supabase
        .from('power_washing_jobs')
        .select('*')
        .eq('shop_id', profile.shop_id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      // Fetch time entries
      const { data: timeEntries } = await supabase
        .from('power_washing_time_entries')
        .select('clock_in, clock_out, break_minutes')
        .eq('shop_id', profile.shop_id)
        .gte('clock_in', start.toISOString())
        .lte('clock_in', end.toISOString());

      // Calculate stats
      const allJobs = jobs || [];
      const completedJobs = allJobs.filter(j => j.status === 'completed');
      const totalRevenue = completedJobs.reduce((s, j) => s + (j.final_price || j.quoted_price || 0), 0);
      
      // Calculate total hours
      let totalMinutes = 0;
      (timeEntries || []).forEach(entry => {
        if (entry.clock_in && entry.clock_out) {
          const start = new Date(entry.clock_in);
          const end = new Date(entry.clock_out);
          totalMinutes += (end.getTime() - start.getTime()) / 60000 - (entry.break_minutes || 0);
        }
      });

      // Jobs by status
      const statusCounts: Record<string, number> = {};
      allJobs.forEach(j => {
        statusCounts[j.status] = (statusCounts[j.status] || 0) + 1;
      });

      // Jobs by property type
      const typeCounts: Record<string, number> = {};
      allJobs.forEach(j => {
        if (j.property_type) {
          typeCounts[j.property_type] = (typeCounts[j.property_type] || 0) + 1;
        }
      });

      // Revenue by week (last 8 weeks)
      const weeks: { week: string; revenue: number }[] = [];
      for (let i = 7; i >= 0; i--) {
        const weekStart = startOfWeek(subDays(new Date(), i * 7));
        const weekEnd = endOfWeek(subDays(new Date(), i * 7));
        const weekJobs = completedJobs.filter(j => {
          const jobDate = new Date(j.created_at);
          return jobDate >= weekStart && jobDate <= weekEnd;
        });
        const weekRevenue = weekJobs.reduce((s, j) => s + (j.final_price || j.quoted_price || 0), 0);
        weeks.push({
          week: format(weekStart, 'MMM d'),
          revenue: weekRevenue
        });
      }

      setStats({
        totalJobs: allJobs.length,
        completedJobs: completedJobs.length,
        totalRevenue,
        avgJobValue: completedJobs.length > 0 ? totalRevenue / completedJobs.length : 0,
        totalHours: Math.round(totalMinutes / 60),
        jobsByStatus: Object.entries(statusCounts).map(([name, value]) => ({ name, value })),
        revenueByWeek: weeks,
        jobsByPropertyType: Object.entries(typeCounts).map(([name, value]) => ({ 
          name: name.replace('_', ' '), 
          value 
        })),
      });
    } catch (error) {
      console.error('Failed to fetch report data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
            <p className="text-muted-foreground">Power washing business insights</p>
          </div>
          <div className="flex gap-2">
            {(['week', 'month', 'quarter', 'year'] as const).map(range => (
              <Button
                key={range}
                variant={dateRange === range ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDateRange(range)}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">${stats?.totalRevenue.toLocaleString() || 0}</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Jobs Completed</p>
                <p className="text-2xl font-bold">{stats?.completedJobs || 0}</p>
                <p className="text-xs text-muted-foreground">{stats?.totalJobs || 0} total</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Calendar className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Job Value</p>
                <p className="text-2xl font-bold">${Math.round(stats?.avgJobValue || 0).toLocaleString()}</p>
              </div>
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Hours Worked</p>
                <p className="text-2xl font-bold">{stats?.totalHours || 0}h</p>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-lg">
                <Clock className="h-6 w-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats?.revenueByWeek || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="week" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `$${v}`} />
                <Tooltip 
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Jobs by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Jobs by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartPieChart>
                <Pie
                  data={stats?.jobsByStatus || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats?.jobsByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                />
              </RechartPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Jobs by Property Type */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Jobs by Property Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats?.jobsByPropertyType || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} className="text-xs capitalize" />
                <Tooltip 
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
