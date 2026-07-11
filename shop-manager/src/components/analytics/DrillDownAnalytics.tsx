import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';
import { ArrowLeft, Filter, Download, Share2, ZoomIn, Target, Users, DollarSign, Clock } from 'lucide-react';

interface DrillDownAnalyticsProps {
  selectedMetric: string | null;
  data: any;
  isLoading: boolean;
  timeRange: string;
}

export function DrillDownAnalytics({ selectedMetric, data, isLoading, timeRange }: DrillDownAnalyticsProps) {
  const [drillDownLevel, setDrillDownLevel] = useState(0);
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);

  if (!selectedMetric) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Select a Metric to Analyze</h3>
          <p className="text-muted-foreground">
            Click on any chart or metric card to view detailed analytics
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading detailed analytics...</p>
        </CardContent>
      </Card>
    );
  }

  // Use the data prop which now contains real data from useEnhancedAnalytics
  const currentData = data?.revenue || {
    breakdown: [],
    trends: [],
    topCustomers: []
  };
  
  const isRevenueData = selectedMetric === 'revenue';
  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

  // Transform breakdown data for pie chart
  const pieChartData = currentData.breakdown?.map((item: any) => ({
    name: item.category || item.name,
    value: item.amount || item.value,
    percentage: item.percentage
  })) || [];

  const renderRevenueDetails = () => (
    <div className="space-y-6">
      {/* Revenue Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Revenue Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieChartData.length > 0 ? (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name}: ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No revenue data available for this period
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Revenue Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {currentData.topCustomers?.length > 0 ? (
                currentData.topCustomers.map((customer: any, index: number) => (
                  <div key={index} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{customer.name}</p>
                      <p className="text-sm text-muted-foreground">{customer.orders} orders</p>
                    </div>
                    <Badge variant="outline">${customer.revenue.toLocaleString()}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No customer data available for this period
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Revenue vs Customer Correlation
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentData.trends?.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart data={currentData.trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="orders" 
                    name="Orders"
                    tickFormatter={(value) => `${value} orders`}
                  />
                  <YAxis 
                    dataKey="value" 
                    name="Revenue"
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      name === 'value' ? `$${value}` : value,
                      name === 'value' ? 'Revenue' : 'Orders'
                    ]}
                  />
                  <Scatter 
                    name="Daily Performance" 
                    dataKey="value" 
                    fill="hsl(var(--primary))"
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No trend data available for this period
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderOverviewDetails = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {data?.segments?.map((segment: any, index: number) => (
          <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedSegment(segment.name)}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {segment.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{segment.value}</div>
              <Badge variant={segment.growth > 10 ? 'default' : 'secondary'}>
                +{segment.growth}% growth
              </Badge>
            </CardContent>
          </Card>
        ))}
        {(!data?.segments || data.segments.length === 0) && (
          <Card className="col-span-full">
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">
                No segment data available. View revenue breakdown for detailed analysis.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {selectedSegment && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ZoomIn className="h-5 w-5" />
              Deep Dive: {selectedSegment}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Detailed analysis for {selectedSegment} would appear here with specific insights,
                trends, and actionable recommendations.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header with Navigation */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => selectedMetric ? setDrillDownLevel(0) : undefined}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Overview
          </Button>
          <div>
            <h2 className="text-2xl font-bold capitalize">{selectedMetric} Analysis</h2>
            <p className="text-muted-foreground">Detailed breakdown and insights</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Analytics</span>
        <span>›</span>
        <span className="capitalize">{selectedMetric}</span>
        {selectedSegment && (
          <>
            <span>›</span>
            <span>{selectedSegment}</span>
          </>
        )}
      </div>

      {/* Content based on selected metric */}
      <Tabs defaultValue="detailed" className="w-full">
        <TabsList>
          <TabsTrigger value="detailed">Detailed View</TabsTrigger>
          <TabsTrigger value="trends">Trends Analysis</TabsTrigger>
          <TabsTrigger value="correlations">Correlations</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="detailed" className="space-y-4">
          {selectedMetric === 'revenue' ? renderRevenueDetails() : renderOverviewDetails()}
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trend Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              {currentData.trends?.length > 0 ? (
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={currentData.trends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis tickFormatter={(value) => `$${value}`} />
                      <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']} />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                  No trend data available for this period
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="correlations" className="space-y-4">
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">
                Correlation analysis between different metrics and external factors would be displayed here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI-Generated Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {pieChartData.length > 0 && pieChartData[0] && (
                <div className="p-4 bg-info/10 rounded-lg">
                  <h4 className="font-medium text-info-foreground">Revenue Optimization</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {pieChartData[0].name} accounts for {pieChartData[0].percentage}% of revenue. Consider optimizing this category for higher margins.
                  </p>
                </div>
              )}
              {currentData.topCustomers?.length > 0 && (
                <div className="p-4 bg-success/10 rounded-lg">
                  <h4 className="font-medium text-success-foreground">Customer Retention</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Top {currentData.topCustomers.length} customers generate significant revenue. Implement loyalty programs to maintain these relationships.
                  </p>
                </div>
              )}
              <div className="p-4 bg-warning/10 rounded-lg">
                <h4 className="font-medium text-warning-foreground">Growth Opportunity</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Analyze order patterns to identify peak periods and optimize staffing and inventory accordingly.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
