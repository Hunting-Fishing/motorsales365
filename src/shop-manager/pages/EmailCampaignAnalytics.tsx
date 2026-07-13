import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart, 
  LineChart, 
  PieChart,
  Bar, 
  Line, 
  Pie, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from "recharts";
import { format, parseISO, subDays } from "date-fns";
import { 
  ChevronLeft, 
  Download, 
  BarChart2, 
  LineChart as LineChartIcon, 
  PieChart as PieChartIcon,
  MapPin,
  Globe,
  Smartphone,
  Laptop,
  Layers,
  Mail,
  Link as LinkIcon
} from "lucide-react";
import { useEmailCampaignAnalytics } from "@/hooks/email/campaign/useEmailCampaignAnalytics";
import { ReportExportMenu } from "@/components/reports/ReportExportMenu";
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent 
} from "@/components/ui/chart";

export default function EmailCampaignAnalytics() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [chartType, setChartType] = useState<"bar" | "line" | "pie">("line");
  const [timeframe, setTimeframe] = useState<"day" | "week" | "month">("day");
  
  const { 
    analytics, 
    campaignDetails,
    loading, 
    error,
    geoData,
    deviceData,
    linkData,
    fetchCampaignAnalytics,
    compareCampaigns,
    comparisonData,
    selectedCampaignsForComparison
  } = useEmailCampaignAnalytics();

  useEffect(() => {
    if (id) {
      fetchCampaignAnalytics(id);
    }
  }, [id, fetchCampaignAnalytics]);

  useEffect(() => {
    if (id && activeTab === "comparison" && (!comparisonData || comparisonData.length <= 1)) {
      compareCampaigns(id);
    }
  }, [id, activeTab, comparisonData, compareCampaigns]);

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-8">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[180px] rounded-lg" />
          ))}
        </div>
        
        <Skeleton className="h-[400px] rounded-lg" />
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-destructive/10 p-4 rounded-lg text-center">
          <h2 className="text-xl font-semibold mb-2">Error Loading Analytics</h2>
          <p className="text-muted-foreground mb-4">
            There was a problem loading the campaign analytics data.
          </p>
          <Button variant="outline" asChild>
            <Link to="/email-campaigns">Return to Campaigns</Link>
          </Button>
        </div>
      </div>
    );
  }

  const getTimeseriesData = () => {
    if (!analytics?.timeline) return [];
    
    return analytics.timeline.map(point => ({
      date: point.date, 
      opens: point.opens,
      clicks: point.clicks,
      unsubscribes: point.unsubscribes || 0
    }));
  };

  const getDeviceData = () => {
    if (!deviceData) return [];
    
    return [
      { name: 'Desktop', value: deviceData.desktop || 0 },
      { name: 'Mobile', value: deviceData.mobile || 0 },
      { name: 'Tablet', value: deviceData.tablet || 0 },
      { name: 'Other', value: deviceData.other || 0 }
    ].filter(item => item.value > 0);
  };

  const getEmailClientData = () => {
    if (!deviceData?.emailClients) return [];
    
    return [
      { name: 'Gmail', value: Number(deviceData.emailClients.gmail) || 0 },
      { name: 'Outlook', value: Number(deviceData.emailClients.outlook) || 0 },
      { name: 'Apple Mail', value: Number(deviceData.emailClients.apple) || 0 },
      { name: 'Yahoo', value: Number(deviceData.emailClients.yahoo) || 0 },
      { name: 'Other', value: Number(deviceData.emailClients.other) || 0 }
    ].filter(item => item.value > 0);
  };

  const getGeoData = () => {
    if (!geoData) return [];
    
    return Object.entries(geoData)
      .map(([country, count]) => ({ name: country, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10 countries
  };

  const getLinkData = () => {
    if (!linkData) return [];
    
    return Object.entries(linkData)
      .map(([url, count]) => ({ name: url, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10 links
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#4d88ff', '#ff6b6b', '#8c44ad'];

  const exportColumns = [
    { header: 'Date', dataKey: 'date' },
    { header: 'Opens', dataKey: 'opens' },
    { header: 'Clicks', dataKey: 'clicks' },
    { header: 'Unsubscribes', dataKey: 'unsubscribes' }
  ];

  const hasGeoData = geoData && Object.keys(geoData).length > 0;
  const hasDeviceData = deviceData && 
    (Number(deviceData.desktop) > 0 || 
    Number(deviceData.mobile) > 0 || 
    Number(deviceData.tablet) > 0 || 
    Number(deviceData.other) > 0);
  const hasEmailClientData = deviceData?.emailClients && 
    Object.values(deviceData.emailClients).some(v => Number(v) > 0);
  const hasLinkData = linkData && Object.keys(linkData).length > 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button variant="ghost" size="sm" asChild className="p-0 h-auto">
              <Link to="/email-campaigns">
                <ChevronLeft className="h-4 w-4" />
                Back to Campaigns
              </Link>
            </Button>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{campaignDetails?.name || 'Campaign Analytics'}</h1>
          <p className="text-muted-foreground">
            Detailed performance metrics and insights
          </p>
        </div>
        
        <div className="flex gap-3">
          <ReportExportMenu 
            data={getTimeseriesData()}
            title={`Campaign Analytics - ${campaignDetails?.name || ''}`}
            columns={exportColumns}
            summaryData={{
              'Sent': analytics.sent,
              'Opens': analytics.opened,
              'Clicks': analytics.clicked,
              'Open Rate': `${analytics.open_rate}%`,
              'Click Rate': `${analytics.click_rate}%`
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Opens</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">
              {analytics.opened.toLocaleString()}
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({analytics.open_rate}%)
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Clicks</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">
              {analytics.clicked.toLocaleString()}
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({analytics.click_rate}%)
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Click-to-Open</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">
              {analytics.click_to_open_rate}%
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unsubscribes</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">
              {analytics.unsubscribed.toLocaleString()}
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({analytics.unsubscribe_rate}%)
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="geography">Geography</TabsTrigger>
          <TabsTrigger value="comparison">Campaign Comparison</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between md:items-center">
                <div>
                  <CardTitle>Performance Over Time</CardTitle>
                  <CardDescription>
                    Tracking opens and clicks after campaign delivery
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-2 md:mt-0">
                  <Button 
                    variant={chartType === "line" ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => setChartType("line")}
                    className="h-8 w-8 p-0"
                  >
                    <LineChartIcon className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant={chartType === "bar" ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => setChartType("bar")}
                    className="h-8 w-8 p-0"
                  >
                    <BarChart2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 pt-2">
              <div className="h-[350px] p-4">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === "line" ? (
                    <LineChart data={getTimeseriesData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="opens" 
                        stroke="#0088FE" 
                        name="Opens"
                        strokeWidth={2} 
                        activeDot={{ r: 8 }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="clicks" 
                        stroke="#00C49F" 
                        name="Clicks" 
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="unsubscribes" 
                        stroke="#FF8042" 
                        name="Unsubscribes" 
                        strokeWidth={2}
                      />
                    </LineChart>
                  ) : (
                    <BarChart data={getTimeseriesData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="opens" name="Opens" fill="#0088FE" />
                      <Bar dataKey="clicks" name="Clicks" fill="#00C49F" />
                      <Bar dataKey="unsubscribes" name="Unsubscribes" fill="#FF8042" />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Laptop className="h-5 w-5" /> 
                  Device Distribution
                </CardTitle>
                <CardDescription>
                  Email opens by device type
                </CardDescription>
              </CardHeader>
              <CardContent>
                {hasDeviceData ? (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getDeviceData()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {getDeviceData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value} opens`, 'Count']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <Smartphone className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>No device data available for this campaign</p>
                      <p className="text-sm mt-1">Device tracking is supported for newer campaigns</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" /> 
                  Email Client Distribution
                </CardTitle>
                <CardDescription>
                  Opens by email client
                </CardDescription>
              </CardHeader>
              <CardContent>
                {hasEmailClientData ? (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getEmailClientData()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {getEmailClientData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value} opens`, 'Count']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <Mail className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>No email client data available</p>
                      <p className="text-sm mt-1">Client tracking is supported for newer campaigns</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="engagement" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Engagement Funnel</CardTitle>
              <CardDescription>
                Recipient journey from delivery to action
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: 'Sent', value: analytics.sent },
                      { name: 'Delivered', value: analytics.delivered },
                      { name: 'Opened', value: analytics.opened },
                      { name: 'Clicked', value: analytics.clicked }
                    ]}
                    margin={{ top: 20, right: 30, left: 30, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8884d8">
                      {[
                        { name: 'Sent', fill: '#8884d8' },
                        { name: 'Delivered', fill: '#82ca9d' },
                        { name: 'Opened', fill: '#ffc658' },
                        { name: 'Clicked', fill: '#ff8042' }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5" /> 
                Most Clicked Links
              </CardTitle>
              <CardDescription>
                Top performing links in your campaign
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hasLinkData ? (
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={getLinkData()}
                      margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="value" name="Clicks" fill="#0088FE" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <LinkIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No link data available for this campaign</p>
                    <p className="text-sm mt-1">Link tracking is supported for newer campaigns</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="geography" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" /> 
                Geographic Distribution
              </CardTitle>
              <CardDescription>
                Top countries by engagement
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hasGeoData ? (
                <div className="h-[500px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={getGeoData()}
                      margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={100} />
                      <Tooltip />
                      <Bar dataKey="value" name="Opens" fill="#8884d8">
                        {getGeoData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Globe className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No geographic data available for this campaign</p>
                    <p className="text-sm mt-1">Geolocation tracking is supported for newer campaigns</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Additional geographic visualizations could be added here */}
        </TabsContent>
        
        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Comparison</CardTitle>
              <CardDescription>
                Compare this campaign with others to identify trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              {comparisonData && comparisonData.length > 1 ? (
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={comparisonData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="openRate" name="Open Rate %" fill="#8884d8" />
                      <Bar dataKey="clickRate" name="Click Rate %" fill="#82ca9d" />
                      <Bar dataKey="ctoRate" name="Click-to-Open %" fill="#ffc658" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center p-6">
                  <p className="text-muted-foreground mb-4">
                    {comparisonData && comparisonData.length === 1 
                      ? "No other campaigns to compare with this one"
                      : "Select campaigns to compare with this one"}
                  </p>
                  <Button onClick={() => compareCampaigns(id as string)}>
                    Refresh Comparison Data
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
