import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  BarChart2, 
  Users, 
  Mail, 
  MousePointerClick, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  TrendingUp,
  Clock,
  ChevronRight,
  ChevronsUpDown,
  Trophy,
  AlertTriangle,
  UserMinus
} from 'lucide-react';
import { EmailCampaign, EmailCampaignAnalytics, EmailCampaignStatus, EmailABTestResult, EmailABTestVariant } from '@/types/email';
import { useEmailCampaigns } from '@/hooks/email/useEmailCampaigns';

const COLORS = {
  primary: '#0ea5e9',
  secondary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  light: '#f3f4f6',
  dark: '#1f2937',
  muted: '#9ca3af',
  opens: '#0ea5e9',
  clicks: '#8b5cf6',
  bounces: '#ef4444',
  complaints: '#f59e0b',
  unsubscribes: '#10b981',
  delivered: '#3b82f6',
};

const PIE_COLORS = [COLORS.primary, COLORS.secondary, COLORS.success, COLORS.warning, COLORS.danger];

type CampaignAnalyticsDashboardProps = {
  analytics: EmailCampaignAnalytics;
  abTestResults?: EmailABTestResult;
  isLoading?: boolean;
};

const CampaignAnalyticsDashboard: React.FC<CampaignAnalyticsDashboardProps> = ({
  analytics,
  abTestResults,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 bg-gray-200 animate-pulse rounded"></div>
          ))}
        </div>
        <div className="h-80 bg-gray-200 animate-pulse rounded"></div>
      </div>
    );
  }

  const timelineData = analytics.timeline.map(point => ({
    date: format(parseISO(point.date), 'MMM d'),
    opens: point.opens,
    clicks: point.clicks,
    unsubscribes: point.unsubscribes || 0,
    complaints: point.complaints || 0,
  }));

  const percentageChanges = {
    openRate: 5.2,
    clickRate: -2.1,
    unsubscribeRate: -0.5,
    bounceRate: 1.2,
  };

  const engagementData = [
    { name: 'Opened', value: analytics.opened },
    { name: 'Clicked', value: analytics.clicked },
    { name: 'No Engagement', value: analytics.delivered - analytics.opened },
  ];

  const deliveryData = [
    { name: 'Delivered', value: analytics.delivered },
    { name: 'Bounced', value: analytics.bounced },
  ];

  const comparisonData = [
    { name: 'Open Rate', value: analytics.open_rate * 100, avg: 22.5 },
    { name: 'Click Rate', value: analytics.click_rate * 100, avg: 3.2 },
    { name: 'Click-to-Open', value: analytics.click_to_open_rate * 100, avg: 14.8 },
    { name: 'Unsubscribe', value: analytics.unsubscribe_rate * 100, avg: 0.2 },
  ];

  const formatRate = (value: any): string => {
    if (typeof value === 'number') {
      return value.toFixed(2);
    } else if (typeof value === 'string' && !isNaN(parseFloat(value))) {
      return parseFloat(value).toFixed(2);
    }
    return '0.00';
  };

  const renderPercentageChange = (value: number) => {
    if (value > 0) {
      return (
        <div className="flex items-center text-green-600">
          <ArrowUpRight className="h-4 w-4 mr-1" />
          <span>+{value.toFixed(1)}%</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center text-red-600">
          <ArrowDownRight className="h-4 w-4 mr-1" />
          <span>{value.toFixed(1)}%</span>
        </div>
      );
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded shadow-sm">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const ComparisonTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded shadow-sm">
          <p className="font-medium">{label}</p>
          <p style={{ color: COLORS.primary }}>
            This Campaign: {typeof payload[0].value === 'number' ? payload[0].value.toFixed(2) : payload[0].value}%
          </p>
          <p style={{ color: COLORS.muted }}>
            Average: {typeof payload[1].value === 'number' ? payload[1].value.toFixed(2) : payload[1].value}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="delivery">Delivery</TabsTrigger>
          {abTestResults && (
            <TabsTrigger value="abtest">A/B Test Results</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Open Rate</p>
                    <p className="text-2xl font-bold">{(analytics.open_rate * 100).toFixed(1)}%</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <Mail className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="mt-4">
                  {renderPercentageChange(percentageChanges.openRate)}
                  <p className="text-xs text-muted-foreground mt-1">vs. previous campaign</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Click Rate</p>
                    <p className="text-2xl font-bold">{(analytics.click_rate * 100).toFixed(1)}%</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <MousePointerClick className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                <div className="mt-4">
                  {renderPercentageChange(percentageChanges.clickRate)}
                  <p className="text-xs text-muted-foreground mt-1">vs. previous campaign</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Bounce Rate</p>
                    <p className="text-2xl font-bold">{(analytics.bounced_rate * 100).toFixed(1)}%</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                </div>
                <div className="mt-4">
                  {renderPercentageChange(percentageChanges.bounceRate)}
                  <p className="text-xs text-muted-foreground mt-1">vs. previous campaign</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Unsubscribe Rate</p>
                    <p className="text-2xl font-bold">{(analytics.unsubscribe_rate * 100).toFixed(1)}%</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                    <UserMinus className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
                <div className="mt-4">
                  {renderPercentageChange(percentageChanges.unsubscribeRate)}
                  <p className="text-xs text-muted-foreground mt-1">vs. previous campaign</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Campaign Summary</CardTitle>
              <CardDescription>
                Key metrics for the email campaign
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Delivery</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Sent</span>
                      <span className="font-medium">{analytics.sent.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Delivered</span>
                      <span className="font-medium">{analytics.delivered.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Bounced</span>
                      <div className="flex items-center">
                        <span className="font-medium mr-2">{analytics.bounced.toLocaleString()}</span>
                        <Badge variant="outline">{(analytics.bounced_rate * 100).toFixed(1)}%</Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Engagement</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Opens</span>
                      <div className="flex items-center">
                        <span className="font-medium mr-2">{analytics.opened.toLocaleString()}</span>
                        <Badge variant="outline">{(analytics.open_rate * 100).toFixed(1)}%</Badge>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Clicks</span>
                      <div className="flex items-center">
                        <span className="font-medium mr-2">{analytics.clicked.toLocaleString()}</span>
                        <Badge variant="outline">{(analytics.click_rate * 100).toFixed(1)}%</Badge>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Click-to-Open</span>
                      <Badge variant="outline">{(analytics.click_to_open_rate * 100).toFixed(1)}%</Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Negative Metrics</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Unsubscribes</span>
                      <div className="flex items-center">
                        <span className="font-medium mr-2">{analytics.unsubscribed.toLocaleString()}</span>
                        <Badge variant="outline">{(analytics.unsubscribe_rate * 100).toFixed(1)}%</Badge>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Complaints</span>
                      <div className="flex items-center">
                        <span className="font-medium mr-2">{analytics.complained.toLocaleString()}</span>
                        <Badge variant="outline">
                          {analytics.complained > 0 && analytics.sent > 0
                            ? ((analytics.complained / analytics.sent) * 100).toFixed(1)
                            : "0.0"}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Engagement Timeline</CardTitle>
              <CardDescription>
                Opens and clicks over time after sending
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={timelineData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="opens" 
                      stackId="1"
                      stroke={COLORS.opens} 
                      fill={COLORS.opens} 
                      fillOpacity={0.6}
                      name="Opens"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="clicks" 
                      stackId="2"
                      stroke={COLORS.clicks} 
                      fill={COLORS.clicks} 
                      fillOpacity={0.6}
                      name="Clicks"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Performance Comparison</CardTitle>
              <CardDescription>
                How this campaign compares to average metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={comparisonData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip content={<ComparisonTooltip />} />
                    <Legend />
                    <Bar dataKey="value" name="This Campaign" fill={COLORS.primary} />
                    <Bar dataKey="avg" name="Industry Average" fill={COLORS.muted} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Engagement Overview</CardTitle>
                <CardDescription>
                  How recipients interacted with your email
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={engagementData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                      >
                        {engagementData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${formatRate(value)}%`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Click-to-Open Analysis</CardTitle>
                <CardDescription>
                  Percentage of recipients who clicked after opening
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <div className="relative h-40 w-40">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-4xl font-bold">{(analytics.click_to_open_rate * 100).toFixed(1)}%</p>
                      <p className="text-sm text-muted-foreground">Click-to-Open Rate</p>
                    </div>
                  </div>
                  <svg className="h-full w-full" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="#f3f4f6"
                      strokeWidth="10"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke={COLORS.primary}
                      strokeWidth="10"
                      strokeDasharray={`${analytics.click_to_open_rate * 283} 283`}
                      strokeLinecap="round"
                      transform="rotate(-90 50 50)"
                    />
                  </svg>
                </div>
                <div className="mt-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    {analytics.clicked} clicks from {analytics.opened} opens
                  </p>
                  <p className="text-sm font-medium mt-2">
                    {analytics.click_to_open_rate > 0.15 ? (
                      <span className="text-green-600 flex items-center justify-center">
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Good engagement rate
                      </span>
                    ) : (
                      <span className="text-amber-600 flex items-center justify-center">
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        Below average engagement
                      </span>
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Detailed Engagement Metrics</CardTitle>
              <CardDescription>
                Breakdown of all engagement metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Opens</p>
                    <div className="flex items-end gap-2">
                      <p className="text-3xl font-bold">{analytics.opened.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground mb-1">
                        ({(analytics.open_rate * 100).toFixed(1)}%)
                      </p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full" 
                        style={{ width: `${analytics.open_rate * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Clicks</p>
                    <div className="flex items-end gap-2">
                      <p className="text-3xl font-bold">{analytics.clicked.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground mb-1">
                        ({(analytics.click_rate * 100).toFixed(1)}%)
                      </p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-purple-600 h-2.5 rounded-full" 
                        style={{ width: `${analytics.click_rate * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">No Engagement</p>
                    <div className="flex items-end gap-2">
                      <p className="text-3xl font-bold">
                        {(analytics.delivered - analytics.opened).toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground mb-1">
                        ({((analytics.delivered - analytics.opened) / analytics.delivered * 100).toFixed(1)}%)
                      </p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-gray-400 h-2.5 rounded-full" 
                        style={{ width: `${(analytics.delivered - analytics.opened) / analytics.delivered * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-medium mb-4">Engagement Timeline</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={timelineData}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Area 
                          type="monotone" 
                          dataKey="opens" 
                          stroke={COLORS.opens} 
                          fill={COLORS.opens} 
                          fillOpacity={0.6}
                          name="Opens"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="clicks" 
                          stroke={COLORS.clicks} 
                          fill={COLORS.clicks} 
                          fillOpacity={0.6}
                          name="Clicks"
                        />
                        {timelineData[0].unsubscribes > 0 && (
                          <Area 
                            type="monotone" 
                            dataKey="unsubscribes" 
                            stroke={COLORS.unsubscribes} 
                            fill={COLORS.unsubscribes} 
                            fillOpacity={0.6}
                            name="Unsubscribes"
                          />
                        )}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delivery" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Delivery Overview</CardTitle>
                <CardDescription>
                  Email delivery status breakdown
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={deliveryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                      >
                        <Cell fill={COLORS.success} />
                        <Cell fill={COLORS.danger} />
                      </Pie>
                      <Tooltip formatter={(value) => `${formatRate(value)}%`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Bounce Analysis</CardTitle>
                <CardDescription>
                  Breakdown of bounced emails
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col h-64">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground mb-1">Bounce Rate</p>
                    <p className="text-2xl font-bold">{(analytics.bounced_rate * 100).toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {analytics.bounced} of {analytics.sent} emails
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground mb-1">Delivery Rate</p>
                    <p className="text-2xl font-bold">{((analytics.delivered / analytics.sent) * 100).toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {analytics.delivered} of {analytics.sent} emails
                    </p>
                  </div>
                </div>

                <div className="flex-1 flex items-center justify-center">
                  {analytics.bounced_rate > 0.05 ? (
                    <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200 max-w-md">
                      <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                      <h3 className="font-medium text-red-800">High Bounce Rate Detected</h3>
                      <p className="text-sm text-red-600 mt-1">
                        Your bounce rate is above the recommended threshold of 5%. 
                        Consider cleaning your email list to improve deliverability.
                      </p>
                    </div>
                  ) : (
                    <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200 max-w-md">
                      <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <h3 className="font-medium text-green-800">Good Delivery Rate</h3>
                      <p className="text-sm text-green-600 mt-1">
                        Your bounce rate is within acceptable limits.
                        This indicates a healthy email list.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Detailed Delivery Metrics</CardTitle>
              <CardDescription>
                Complete breakdown of delivery statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Sent</p>
                    <p className="text-3xl font-bold">{analytics.sent.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Total emails sent</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Delivered</p>
                    <div className="flex items-end gap-2">
                      <p className="text-3xl font-bold">{analytics.delivered.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground mb-1">
                        ({((analytics.delivered / analytics.sent) * 100).toFixed(1)}%)
                      </p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-green-600 h-2.5 rounded-full" 
                        style={{ width: `${(analytics.delivered / analytics.sent) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Bounced</p>
                    <div className="flex items-end gap-2">
                      <p className="text-3xl font-bold">{analytics.bounced.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground mb-1">
                        ({(analytics.bounced_rate * 100).toFixed(1)}%)
                      </p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-red-600 h-2.5 rounded-full" 
                        style={{ width: `${analytics.bounced_rate * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-medium mb-4">Negative Metrics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Unsubscribes</p>
                      <div className="flex items-end gap-2">
                        <p className="text-3xl font-bold">{analytics.unsubscribed.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground mb-1">
                          ({(analytics.unsubscribe_rate * 100).toFixed(2)}%)
                        </p>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="bg-amber-600 h-2.5 rounded-full" 
                          style={{ width: `${analytics.unsubscribe_rate * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium">Complaints</p>
                      <div className="flex items-end gap-2">
                        <p className="text-3xl font-bold">{analytics.complained.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground mb-1">
                          ({((analytics.complained / analytics.sent) * 100).toFixed(2)}%)
                        </p>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="bg-red-600 h-2.5 rounded-full" 
                          style={{ width: `${(analytics.complained / analytics.sent) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {abTestResults && (
          <TabsContent value="abtest" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>A/B Test Results</CardTitle>
                <CardDescription>
                  Performance comparison between variant versions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                    <div>
                      <h3 className="text-lg font-medium mb-2">Test Summary</h3>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Winning criteria: <span className="font-medium">{abTestResults.winnerCriteria === 'open_rate' ? 'Open Rate' : 'Click Rate'}</span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Status: <span className="font-medium">{abTestResults.isComplete ? 'Completed' : 'In Progress'}</span>
                        </p>
                        {abTestResults.winner && (
                          <p className="text-sm text-muted-foreground">
                            Winner: <span className="font-medium">{abTestResults.winner.name}</span>
                          </p>
                        )}
                        {typeof abTestResults.winnerSelectedAt === 'string' && abTestResults.winnerSelectedAt && (
                          <p className="text-sm text-muted-foreground">
                            Winner selected: <span className="font-medium">{format(new Date(abTestResults.winnerSelectedAt), 'MMM d, yyyy')}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {abTestResults.isComplete && abTestResults.winner && (
                      <div className="bg-green-50 border border-green-100 rounded-md p-4 md:w-auto flex flex-col items-center">
                        <Trophy className="h-10 w-10 text-amber-500 mb-2" />
                        <h4 className="font-semibold text-center">{abTestResults.winner.name}</h4>
                        <p className="text-sm text-muted-foreground text-center">Winner</p>
                        {abTestResults.winner && abTestResults.winner.metrics && (
                          <p className="text-sm font-medium mt-1">
                            {abTestResults.winnerCriteria === 'open_rate' 
                              ? `${(abTestResults.winner.metrics.openRate * 100).toFixed(1)}% open rate` 
                              : `${(abTestResults.winner.metrics.clickRate * 100).toFixed(1)}% click rate`}
                          </p>
                        )}
                        {abTestResults.confidenceLevel && (
                          <p className="text-xs mt-1">{(abTestResults.confidenceLevel * 100).toFixed(0)}% confidence</p>
                        )}
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-medium mb-4">Variant Performance</h3>
                    <div className="overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Variant</TableHead>
                            <TableHead>Recipients</TableHead>
                            <TableHead>Open Rate</TableHead>
                            <TableHead>Click Rate</TableHead>
                            <TableHead>CTOR</TableHead>
                            <TableHead>Improvement</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {abTestResults.variants.map((variant) => {
                            const isWinner = abTestResults.winningVariantId === variant.id;
                            return (
                              <TableRow key={variant.id} className={isWinner ? "bg-green-50" : ""}>
                                <TableCell>
                                  <div className="flex items-center">
                                    {isWinner && <Trophy className="h-4 w-4 text-amber-500 mr-2" />}
                                    <span className={isWinner ? "font-medium" : ""}>{variant.name}</span>
                                  </div>
                                </TableCell>
                                <TableCell>{variant.recipients.toLocaleString()}</TableCell>
                                <TableCell>
                                  {variant.metrics && (variant.metrics.openRate * 100).toFixed(1)}%
                                </TableCell>
                                <TableCell>
                                  {variant.metrics && (variant.metrics.clickRate * 100).toFixed(1)}%
                                </TableCell>
                                <TableCell>
                                  {variant.metrics && (variant.metrics.clickToOpenRate * 100).toFixed(1)}%
                                </TableCell>
                                <TableCell>
                                  {variant.improvement !== undefined ? (
                                    <div className={variant.improvement > 0 ? "text-green-600 flex items-center" : variant.improvement < 0 ? "text-red-600 flex items-center" : "text-gray-500"}>
                                      {variant.improvement > 0 ? (
                                        <>
                                          <ArrowUpRight className="h-4 w-4 mr-1" />
                                          <span>+{variant.improvement.toFixed(1)}%</span>
                                        </>
                                      ) : variant.improvement < 0 ? (
                                        <>
                                          <ArrowDownRight className="h-4 w-4 mr-1" />
                                          <span>{variant.improvement.toFixed(1)}%</span>
                                        </>
                                      ) : (
                                        <span>0%</span>
                                      )}
                                    </div>
                                  ) : (
                                    "-"
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-medium mb-4">Variant Metrics</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={abTestResults.variants.map(variant => ({
                          name: variant.name,
                          openRate: variant.metrics ? (variant.metrics.openRate * 100) : 0,
                          clickRate: variant.metrics ? (variant.metrics.clickRate * 100) : 0,
                          ctor: variant.metrics ? (variant.metrics.clickToOpenRate * 100) : 0,
                          convRate: variant.metrics && variant.metrics.conversionRate ? (variant.metrics.conversionRate * 100) : 0
                        }))}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => `${value.toFixed(2)}%`} />
                        <Legend />
                        <Bar dataKey="openRate" name="Open Rate" fill={COLORS.opens} />
                        <Bar dataKey="clickRate" name="Click Rate" fill={COLORS.clicks} />
                        <Bar dataKey="ctor" name="Click-to-Open Rate" fill={COLORS.primary} />
                        {abTestResults.variants.some(v => v.metrics && v.metrics.conversionRate) && (
                          <Bar dataKey="convRate" name="Conversion Rate" fill={COLORS.success} />
                        )}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default CampaignAnalyticsDashboard;
