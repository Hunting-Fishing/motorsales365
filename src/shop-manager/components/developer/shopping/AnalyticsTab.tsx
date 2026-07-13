
import React, { useState, useEffect } from 'react';
import { getProductAnalytics } from '@/services/admin/productAdminService';
import { fetchProductSubmissions } from '@/services/products/productService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Package, Star, Trophy, Clock } from 'lucide-react';

interface AnalyticsData {
  totalProducts: number;
  featuredCount: number;
  bestsellerCount: number;
  categoryStats: Record<string, number>;
}

interface SubmissionData {
  pending: number;
  reviewing: number;
  approved: number;
  rejected: number;
}

export default function AnalyticsTab() {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalProducts: 0,
    featuredCount: 0,
    bestsellerCount: 0,
    categoryStats: {}
  });
  const [submissions, setSubmissions] = useState<SubmissionData>({
    pending: 0,
    reviewing: 0,
    approved: 0,
    rejected: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      // Fetch product analytics
      const productAnalytics = await getProductAnalytics();
      setAnalytics(productAnalytics);

      // Fetch submission analytics
      const submissionData = await fetchProductSubmissions();
      const submissionStats = submissionData.reduce((acc, submission) => {
        acc[submission.status] = (acc[submission.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      setSubmissions({
        pending: submissionStats.pending || 0,
        reviewing: submissionStats.reviewing || 0,
        approved: submissionStats.approved || 0,
        rejected: submissionStats.rejected || 0
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const categoryChartData = Object.entries(analytics.categoryStats).map(([name, count]) => ({
    name,
    count
  }));

  const submissionChartData = [
    { name: 'Pending', value: submissions.pending, color: '#f59e0b' },
    { name: 'Reviewing', value: submissions.reviewing, color: '#3b82f6' },
    { name: 'Approved', value: submissions.approved, color: '#10b981' },
    { name: 'Rejected', value: submissions.rejected, color: '#ef4444' }
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-6">
      {analytics.totalProducts === 0 && (
        <div className="p-4 border border-blue-300 bg-blue-50 rounded-md mb-4">
          <p className="text-blue-800">
            No products found in the database. Please add products through the application interface.
          </p>
        </div>
      )}
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="products">Product Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalProducts}</div>
                <p className="text-xs text-muted-foreground">
                  Active approved products
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Featured Products</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.featuredCount}</div>
                <p className="text-xs text-muted-foreground">
                  {analytics.totalProducts > 0 ? ((analytics.featuredCount / analytics.totalProducts) * 100).toFixed(1) : 0}% of total
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bestsellers</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.bestsellerCount}</div>
                <p className="text-xs text-muted-foreground">
                  {analytics.totalProducts > 0 ? ((analytics.bestsellerCount / analytics.totalProducts) * 100).toFixed(1) : 0}% of total
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Submissions</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{submissions.pending}</div>
                <p className="text-xs text-muted-foreground">
                  Awaiting review
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Products by Category Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Products by Category</CardTitle>
              </CardHeader>
              <CardContent>
                {categoryChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={categoryChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-300 flex items-center justify-center text-muted-foreground">
                    No category data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Submission Status Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Submission Status</CardTitle>
              </CardHeader>
              <CardContent>
                {submissionChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={submissionChartData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {submissionChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-300 flex items-center justify-center text-muted-foreground">
                    No submission data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Product Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{analytics.totalProducts}</div>
                    <div className="text-sm text-muted-foreground">Total Products</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{analytics.featuredCount}</div>
                    <div className="text-sm text-muted-foreground">Featured</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{analytics.bestsellerCount}</div>
                    <div className="text-sm text-muted-foreground">Bestsellers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{Object.keys(analytics.categoryStats).length}</div>
                    <div className="text-sm text-muted-foreground">Categories</div>
                  </div>
                </div>
                
                {categoryChartData.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-4">Category Distribution</h3>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={categoryChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
