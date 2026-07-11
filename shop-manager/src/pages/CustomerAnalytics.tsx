import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CustomerSegmentChart } from '@/components/analytics/CustomerSegmentChart';
import { CustomerLifetimeValueChart } from '@/components/analytics/CustomerLifetimeValueChart';
import { CustomerRetentionChart } from '@/components/analytics/CustomerRetentionChart';
import { Button } from '@/components/ui/button';
import { DownloadIcon, RefreshCcw } from 'lucide-react';
import { 
  ChartContainer,
  ChartTooltip, 
  ChartTooltipContent,
  ChartContainer as Chart
} from "@/components/ui/chart";
import { getCustomersWithSegments } from '@/utils/analytics/customerSegmentation';
import { getAverageCustomerLifetimeValue } from '@/utils/analytics/customerLifetimeValue';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Cell, Legend, ResponsiveContainer } from 'recharts';
import { Tooltip } from 'recharts';

// Define chart data interface
interface CLVPredictionData {
  period: string;
  current: number;
  predicted: number;
}

export default function CustomerAnalytics() {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('6months');
  const [loading, setLoading] = useState(true);
  const [segmentData, setSegmentData] = useState<any[]>([]);
  const [clvData, setClvData] = useState<any[]>([]);
  const [averageClv, setAverageClv] = useState<number | null>(null);
  
  // Predictive data examples (would be calculated by algorithms in production)
  const clvPredictionData: CLVPredictionData[] = [
    { period: 'Q1', current: 950, predicted: 1050 },
    { period: 'Q2', current: 1100, predicted: 1350 },
    { period: 'Q3', current: 1200, predicted: 1550 },
    { period: 'Q4', current: 1400, predicted: 1800 },
    { period: 'Q1 Next', current: 0, predicted: 2000 },
    { period: 'Q2 Next', current: 0, predicted: 2250 },
  ];
  
  const retentionData = [
    { month: 'Jan', rate: 96 },
    { month: 'Feb', rate: 95 },
    { month: 'Mar', rate: 93 },
    { month: 'Apr', rate: 91 },
    { month: 'May', rate: 88 },
    { month: 'Jun', rate: 90 },
    { month: 'Jul', rate: 92 },
    { month: 'Aug', rate: 94 },
    { month: 'Sep', rate: 95 },
    { month: 'Oct', rate: 96 },
    { month: 'Nov', rate: 97 },
    { month: 'Dec', rate: 98 },
  ];
  
  const cohortData = [
    { name: 'New', clv: 850, retention: 72, frequency: 1.5 },
    { name: 'Occasional', clv: 1450, retention: 65, frequency: 2.2 },
    { name: 'Regular', clv: 3250, retention: 85, frequency: 3.5 },
    { name: 'High Value', clv: 8750, retention: 94, frequency: 4.2 },
    { name: 'At Risk', clv: 2950, retention: 40, frequency: 1.8 },
  ];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch segment and CLV data
        const customers = await getCustomersWithSegments();
        
        // Process segment data
        const segmentCounts: Record<string, number> = {};
        customers.forEach(customer => {
          customer.segments.forEach((segment: string) => {
            segmentCounts[segment] = (segmentCounts[segment] || 0) + 1;
          });
        });
        
        const segmentChartData = Object.entries(segmentCounts).map(([name, value]) => ({
          name: name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
          value,
          color: getSegmentColor(name)
        }));
        
        setSegmentData(segmentChartData);
        
        // Process CLV distribution data
        const clvRanges = {
          '$0-$500': 0,
          '$501-$1000': 0,
          '$1001-$2000': 0,
          '$2001-$5000': 0,
          '$5001-$10000': 0,
          '$10001+': 0
        };
        
        customers.forEach(customer => {
          const clv = customer.clv || 0;
          if (clv <= 500) clvRanges['$0-$500']++;
          else if (clv <= 1000) clvRanges['$501-$1000']++;
          else if (clv <= 2000) clvRanges['$1001-$2000']++;
          else if (clv <= 5000) clvRanges['$2001-$5000']++;
          else if (clv <= 10000) clvRanges['$5001-$10000']++;
          else clvRanges['$10001+']++;
        });
        
        const clvChartData = Object.entries(clvRanges).map(([name, value]) => ({
          name,
          value
        }));
        
        setClvData(clvChartData);
        
        // Get average CLV
        const avgClv = await getAverageCustomerLifetimeValue();
        setAverageClv(avgClv);
        
      } catch (error) {
        console.error("Error loading analytics data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [timeRange]);

  // Get segment color based on segment type
  const getSegmentColor = (segmentType: string) => {
    switch (segmentType) {
      case 'high_value': return '#4f46e5';
      case 'medium_value': return '#06b6d4';
      case 'low_value': return '#64748b';
      case 'new': return '#8b5cf6';
      case 'at_risk': return '#f97316';
      case 'loyal': return '#22c55e';
      case 'inactive': return '#ef4444';
      default: return '#94a3b8';
    }
  };

  // Handle refresh button click
  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customer Analytics</h1>
          <p className="text-muted-foreground">
            Analyze customer behavior and trends to optimize business decisions.
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3months">Last 3 months</SelectItem>
              <SelectItem value="6months">Last 6 months</SelectItem>
              <SelectItem value="1year">Last 12 months</SelectItem>
              <SelectItem value="2years">Last 2 years</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="icon" onClick={handleRefresh}>
            <RefreshCcw className="h-4 w-4" />
          </Button>
          
          <Button variant="outline" size="icon">
            <DownloadIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 md:w-auto md:inline-flex">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="segments">Customer Segments</TabsTrigger>
          <TabsTrigger value="lifetime">Lifetime Value</TabsTrigger>
          <TabsTrigger value="retention">Retention Analysis</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold">Total Customers</CardTitle>
                <CardDescription>Active customers in the database</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-14 w-1/2" />
                ) : (
                  <div className="text-4xl font-bold">1,024</div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold">Average LTV</CardTitle>
                <CardDescription>Average customer lifetime value</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-14 w-1/2" />
                ) : (
                  <div className="text-4xl font-bold">
                    ${averageClv ? averageClv.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '2,850'}
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold">Retention Rate</CardTitle>
                <CardDescription>Overall customer retention</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-14 w-1/2" />
                ) : (
                  <div className="text-4xl font-bold">94.2%</div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2">
            <CustomerSegmentChart data={segmentData.length > 0 ? segmentData : [
              { name: 'High Value', value: 120, color: '#4f46e5' },
              { name: 'Regular', value: 350, color: '#06b6d4' },
              { name: 'Occasional', value: 260, color: '#8b5cf6' },
              { name: 'New', value: 180, color: '#f97316' },
              { name: 'At Risk', value: 90, color: '#ef4444' },
            ]} loading={loading} />
            
            <CustomerLifetimeValueChart data={clvData.length > 0 ? clvData : [
              { name: '$0-$500', value: 180 },
              { name: '$501-$1000', value: 240 },
              { name: '$1001-$2000', value: 210 },
              { name: '$2001-$5000', value: 140 },
              { name: '$5001-$10000', value: 90 },
              { name: '$10001+', value: 40 },
            ]} loading={loading} />
          </div>
        </TabsContent>
        
        <TabsContent value="segments" className="space-y-6 mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold">Segment Distribution</CardTitle>
                <CardDescription>Customer distribution by segments</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 h-[400px]">
                {loading ? (
                  <div className="h-full w-full flex items-center justify-center">
                    <Skeleton className="h-[300px] w-full" />
                  </div>
                ) : (
                  <CustomerSegmentChart data={segmentData.length > 0 ? segmentData : [
                    { name: 'High Value', value: 120, color: '#4f46e5' },
                    { name: 'Regular', value: 350, color: '#06b6d4' },
                    { name: 'Occasional', value: 260, color: '#8b5cf6' },
                    { name: 'New', value: 180, color: '#f97316' },
                    { name: 'At Risk', value: 90, color: '#ef4444' },
                  ]} loading={false} className="h-full" />
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold">Segment LTV Analysis</CardTitle>
                <CardDescription>Average lifetime value by segment</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {loading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={cohortData}
                        layout="vertical"
                        margin={{ top: 20, right: 30, left: 70, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" />
                        <Tooltip formatter={(value) => [`$${value}`, 'Avg. CLV']} />
                        <Bar dataKey="clv" fill="#4f46e5" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Segment Performance Comparison</CardTitle>
              <CardDescription>Key metrics by customer segment</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Segment</th>
                        <th className="text-left py-3 px-4">Customers</th>
                        <th className="text-left py-3 px-4">Avg. LTV</th>
                        <th className="text-left py-3 px-4">Retention</th>
                        <th className="text-left py-3 px-4">Visit Frequency</th>
                        <th className="text-left py-3 px-4">YoY Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cohortData.map((segment, index) => (
                        <tr key={index} className="border-b">
                          <td className="py-3 px-4">{segment.name}</td>
                          <td className="py-3 px-4">{segmentData.find(s => s.name === segment.name)?.value || 0}</td>
                          <td className="py-3 px-4">${segment.clv.toLocaleString()}</td>
                          <td className="py-3 px-4">{segment.retention}%</td>
                          <td className="py-3 px-4">{segment.frequency}/year</td>
                          <td className={`py-3 px-4 ${segment.name === 'At Risk' || segment.name === 'Occasional' ? 'text-red-600' : 'text-green-600'}`}>
                            {segment.name === 'At Risk' ? '-8.3%' : 
                             segment.name === 'Occasional' ? '-1.8%' :
                             segment.name === 'High Value' ? '+12.4%' :
                             segment.name === 'Regular' ? '+5.2%' : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="lifetime" className="space-y-6 mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">CLV Distribution</CardTitle>
                <CardDescription>Customer distribution by lifetime value range</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <div className="h-[350px]">
                    <CustomerLifetimeValueChart data={clvData.length > 0 ? clvData : [
                      { name: '$0-$500', value: 180 },
                      { name: '$501-$1000', value: 240 },
                      { name: '$1001-$2000', value: 210 },
                      { name: '$2001-$5000', value: 140 },
                      { name: '$5001-$10000', value: 90 },
                      { name: '$10001+', value: 40 },
                    ]} loading={false} />
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">CLV Forecasting</CardTitle>
                <CardDescription>Historical vs predicted customer value</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={clvPredictionData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`$${value}`, '']} />
                        <Legend />
                        <Line type="monotone" dataKey="current" stroke="#4f46e5" name="Historical" strokeWidth={2} dot={{ r: 5 }} />
                        <Line type="monotone" dataKey="predicted" stroke="#ef4444" name="Predicted" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">CLV Growth Factors</CardTitle>
              <CardDescription>Key drivers of customer lifetime value</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-base font-medium">Service Frequency</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>1-2 services/year</span>
                        <span className="font-medium">+$450</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: '45%' }}></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>3-4 services/year</span>
                        <span className="font-medium">+$1,200</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: '80%' }}></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>5+ services/year</span>
                        <span className="font-medium">+$2,800</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: '100%' }}></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-base font-medium">Customer Tenure</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>1 year</span>
                        <span className="font-medium">+$850</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="bg-green-600 h-2 rounded-full" style={{ width: '35%' }}></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>2-3 years</span>
                        <span className="font-medium">+$2,250</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="bg-green-600 h-2 rounded-full" style={{ width: '75%' }}></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>4+ years</span>
                        <span className="font-medium">+$5,400</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="bg-green-600 h-2 rounded-full" style={{ width: '100%' }}></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-base font-medium">Service Types</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Basic maintenance</span>
                        <span className="font-medium">+$350</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="bg-purple-600 h-2 rounded-full" style={{ width: '25%' }}></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Repairs & diagnostics</span>
                        <span className="font-medium">+$1,200</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="bg-purple-600 h-2 rounded-full" style={{ width: '65%' }}></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Premium services</span>
                        <span className="font-medium">+$2,900</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="bg-purple-600 h-2 rounded-full" style={{ width: '100%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="retention" className="space-y-6 mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <CustomerRetentionChart data={retentionData} loading={loading} />
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold">Retention Factors</CardTitle>
                <CardDescription>Key factors affecting customer retention</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {loading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <div className="space-y-6 pt-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Service Quality</span>
                        <span className="text-sm font-medium">85%</span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full" style={{ width: '85%' }}></div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Price Satisfaction</span>
                        <span className="text-sm font-medium">72%</span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full" style={{ width: '72%' }}></div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Product Quality</span>
                        <span className="text-sm font-medium">91%</span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full" style={{ width: '91%' }}></div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Communication</span>
                        <span className="text-sm font-medium">78%</span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full" style={{ width: '78%' }}></div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Problem Resolution</span>
                        <span className="text-sm font-medium">82%</span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full" style={{ width: '82%' }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Predicted Churn Risk</CardTitle>
              <CardDescription>Customers at risk of churning in the next 90 days</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-xl font-bold">86</span>
                      <span className="text-sm text-muted-foreground ml-2">customers at risk</span>
                    </div>
                    <div className="text-sm px-3 py-1 rounded-full bg-amber-100 text-amber-800">
                      8.4% of customer base
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="font-medium">Risk Category</span>
                      <span className="font-medium">Customer Count</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                        <span>Very High Risk (80%+)</span>
                      </div>
                      <span className="font-medium">12</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-orange-500 mr-2"></div>
                        <span>High Risk (60-79%)</span>
                      </div>
                      <span className="font-medium">28</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-amber-500 mr-2"></div>
                        <span>Medium Risk (40-59%)</span>
                      </div>
                      <span className="font-medium">46</span>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
                    <h4 className="text-sm font-medium text-amber-800 mb-2">Top Churn Reasons</h4>
                    <ul className="text-sm text-amber-700 list-disc list-inside space-y-1">
                      <li>No service in over 180 days (42%)</li>
                      <li>Declined recommended services (28%)</li>
                      <li>Previous service complaint (18%)</li>
                      <li>Competitive pricing concerns (12%)</li>
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
