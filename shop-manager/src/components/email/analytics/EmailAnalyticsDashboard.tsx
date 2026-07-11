import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, LineChart, Line
} from 'recharts';
import { 
  Briefcase, Calendar, Mail, Timer, Users 
} from "lucide-react";
import { supabase } from '@/lib/supabase';
import { Skeleton } from '@/components/ui/skeleton';
import { SegmentPerformanceCard } from './SegmentPerformanceCard';
import { CampaignsList } from './CampaignsList';

export const EmailAnalyticsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [overviewData, setOverviewData] = useState<any>({
    totalCampaigns: 0,
    totalRecipients: 0,
    averageOpenRate: 0,
    averageClickRate: 0,
    campaignsTrend: []
  });
  
  const [segmentPerformance, setSegmentPerformance] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      setLoading(true);
      try {
        // Fetch campaigns summary
        const { data: campaigns, error: campaignsError } = await supabase
          .from('email_campaigns')
          .select('id, name, total_recipients, opened, clicked, status, created_at');
          
        if (campaignsError) throw campaignsError;
        
        // Fetch segment performance
        const { data: segmentData, error: segmentError } = await supabase
          .from('campaign_segment_performance')
          .select('*, marketing_segments(name)');
          
        if (segmentError) throw segmentError;
        
        // Process campaign data for overview metrics
        const totalRecipients = campaigns?.reduce((sum, c) => sum + (c.total_recipients || 0), 0) || 0;
        const totalOpens = campaigns?.reduce((sum, c) => sum + (c.opened || 0), 0) || 0;
        const totalClicks = campaigns?.reduce((sum, c) => sum + (c.clicked || 0), 0) || 0;
        
        // Calculate trends (last 6 months)
        const now = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(now.getMonth() - 6);
        
        const campaignsByMonth: Record<string, number> = {};
        
        campaigns?.forEach(campaign => {
          const date = new Date(campaign.created_at);
          const monthYear = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          
          if (date >= sixMonthsAgo) {
            campaignsByMonth[monthYear] = (campaignsByMonth[monthYear] || 0) + 1;
          }
        });
        
        const trend = Object.entries(campaignsByMonth).map(([month, count]) => ({ 
          month, count 
        })).sort((a, b) => {
          const monthA = new Date(a.month);
          const monthB = new Date(b.month);
          return monthA.getTime() - monthB.getTime();
        });
        
        setOverviewData({
          totalCampaigns: campaigns?.length || 0,
          totalRecipients,
          averageOpenRate: totalRecipients ? (totalOpens / totalRecipients) * 100 : 0,
          averageClickRate: totalRecipients ? (totalClicks / totalRecipients) * 100 : 0,
          campaignsTrend: trend
        });
        
        setSegmentPerformance(segmentData || []);
      } catch (err) {
        console.error('Error fetching analytics data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnalyticsData();
  }, []);
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Email Marketing Analytics</h2>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard 
          title="Total Campaigns" 
          value={loading ? '—' : overviewData.totalCampaigns.toString()} 
          icon={<Briefcase className="h-4 w-4" />}
          loading={loading}
        />
        <MetricCard 
          title="Total Recipients" 
          value={loading ? '—' : overviewData.totalRecipients.toLocaleString()} 
          icon={<Users className="h-4 w-4" />}
          loading={loading}
        />
        <MetricCard 
          title="Avg. Open Rate" 
          value={loading ? '—' : `${overviewData.averageOpenRate.toFixed(1)}%`} 
          icon={<Mail className="h-4 w-4" />}
          loading={loading}
        />
        <MetricCard 
          title="Avg. Click Rate" 
          value={loading ? '—' : `${overviewData.averageClickRate.toFixed(1)}%`} 
          icon={<Timer className="h-4 w-4" />}
          loading={loading}
        />
      </div>
      
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="segments">Segment Performance</TabsTrigger>
          <TabsTrigger value="abTests">A/B Tests</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Trend</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              {loading ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={overviewData.campaignsTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      name="Campaigns" 
                      stroke="#3b82f6" 
                      strokeWidth={2} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="campaigns">
          <CampaignsList />
        </TabsContent>
        
        <TabsContent value="segments" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {loading ? (
              <>
                <Skeleton className="h-[200px]" />
                <Skeleton className="h-[200px]" />
              </>
            ) : (
              segmentPerformance.map(segment => (
                <SegmentPerformanceCard
                  key={segment.id}
                  segment={segment}
                />
              ))
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="abTests">
          <ABTestResultsList />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const MetricCard = ({ 
  title, 
  value, 
  icon, 
  loading 
}: { 
  title: string; 
  value: string; 
  icon: React.ReactNode;
  loading: boolean;
}) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-7 w-20" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
      </CardContent>
    </Card>
  );
};

const ABTestResultsList = () => {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchABTestResults = async () => {
      try {
        const { data, error } = await supabase
          .from('email_ab_test_results')
          .select('*, email_campaigns(name)')
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        setResults(data || []);
      } catch (err) {
        console.error('Error fetching AB test results:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchABTestResults();
  }, []);
  
  if (loading) {
    return <div className="space-y-2">
      {[1, 2, 3].map(i => (
        <Skeleton key={i} className="h-20 w-full" />
      ))}
    </div>;
  }
  
  if (results.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-muted-foreground">No A/B test results found.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Run A/B tests in your campaigns to see results here.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-4">
      {results.map(result => (
        <ABTestResultCard key={result.id} result={result} />
      ))}
    </div>
  );
};

const ABTestResultCard = ({ result }: { result: any }) => {
  const campaignName = result.email_campaigns?.name || 'Unknown Campaign';
  const openRate = result.recipients_count > 0 
    ? ((result.opens_count / result.recipients_count) * 100).toFixed(1) 
    : '0';
  const clickRate = result.recipients_count > 0 
    ? ((result.clicks_count / result.recipients_count) * 100).toFixed(1) 
    : '0';
    
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base">{campaignName}: {result.variant_name}</CardTitle>
          {result.is_winner && (
            <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
              Winner
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-sm">
            <p className="text-muted-foreground">Recipients</p>
            <p className="font-medium">{result.recipients_count}</p>
          </div>
          <div className="text-sm">
            <p className="text-muted-foreground">Open Rate</p>
            <p className="font-medium">{openRate}%</p>
          </div>
          <div className="text-sm">
            <p className="text-muted-foreground">Click Rate</p>
            <p className="font-medium">{clickRate}%</p>
          </div>
          <div className="text-sm">
            <p className="text-muted-foreground">Confidence</p>
            <p className="font-medium">
              {result.confidence_level ? `${result.confidence_level}%` : 'N/A'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
