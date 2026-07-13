import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAffiliateAnalyticsData } from '@/hooks/useAffiliateAnalyticsData';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  AreaChart, 
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  Cell 
} from 'recharts';
import { 
  TrendingUp, 
  MousePointerClick, 
  Calendar, 
  LayoutDashboard, 
  RefreshCw,
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight,
  Clock
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

const COLORS = ['#F59E0B', '#10B981', '#6366F1', '#EC4899', '#14B8A6', '#8B5CF6'];

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  description,
  trend,
  loading 
}: { 
  title: string; 
  value: string | number; 
  icon: React.ElementType; 
  description?: string;
  trend?: { value: number; isPositive: boolean };
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-16" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold">{value}</h3>
              {trend && (
                <span className={`flex items-center text-xs ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {trend.isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {trend.value}%
                </span>
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AffiliateAnalyticsDashboard() {
  const [dateRange, setDateRange] = useState<string>('30');
  const days = parseInt(dateRange);
  const { data, isLoading, refetch, isRefetching } = useAffiliateAnalyticsData(days);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Affiliate Link Analytics</h1>
          <p className="text-muted-foreground">
            Track Amazon affiliate link engagement across all modules
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="60">Last 60 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Clicks"
          value={data?.totalClicks ?? 0}
          icon={MousePointerClick}
          description={`Last ${days} days`}
          loading={isLoading}
        />
        <StatCard
          title="Today"
          value={data?.clicksToday ?? 0}
          icon={Calendar}
          loading={isLoading}
        />
        <StatCard
          title="This Week"
          value={data?.clicksThisWeek ?? 0}
          icon={TrendingUp}
          loading={isLoading}
        />
        <StatCard
          title="Banner Click Rate"
          value={`${data?.bannerPercentage ?? 0}%`}
          icon={LayoutDashboard}
          description="vs sidebar clicks"
          loading={isLoading}
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="modules">By Module</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="raw">Raw Data</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            {/* Clicks Over Time */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Clicks Over Time</CardTitle>
                <CardDescription>Daily click trends</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[250px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={data?.dailyClicks || []}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        fontSize={12} 
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        fontSize={12} 
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="clicks" 
                        stroke="#F59E0B" 
                        strokeWidth={2}
                        dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Click Source Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Click Source Distribution</CardTitle>
                <CardDescription>Banner vs Sidebar clicks</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[250px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={data?.sourceDistribution || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {(data?.sourceDistribution || []).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* By Module Tab */}
        <TabsContent value="modules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Clicks by Module</CardTitle>
              <CardDescription>Which modules drive the most affiliate clicks</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[350px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart 
                    data={data?.clicksByModule || []} 
                    layout="vertical"
                    margin={{ left: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" fontSize={12} allowDecimals={false} />
                    <YAxis 
                      dataKey="module" 
                      type="category" 
                      fontSize={12}
                      width={75}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="clicks" fill="#10B981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Hourly Distribution</CardTitle>
              <CardDescription>Peak hours for affiliate clicks</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data?.hourlyDistribution || []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="hour" 
                      fontSize={12}
                      interval={2}
                    />
                    <YAxis 
                      fontSize={12}
                      allowDecimals={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="clicks" 
                      stroke="#6366F1" 
                      fill="#6366F1" 
                      fillOpacity={0.2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Raw Data Tab */}
        <TabsContent value="raw" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Clicks</CardTitle>
              <CardDescription>Last 50 affiliate link clicks</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Module</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Referrer Path</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(data?.recentClicks || []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                            No clicks recorded yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        data?.recentClicks.map((click) => (
                          <TableRow key={click.id}>
                            <TableCell className="whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                {format(parseISO(click.created_at), 'MMM dd, HH:mm:ss')}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {(click.module_id || 'Unknown').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={click.link_type === 'banner' ? 'default' : 'secondary'}>
                                {click.link_type}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate text-muted-foreground">
                              {click.referrer_path || '-'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
