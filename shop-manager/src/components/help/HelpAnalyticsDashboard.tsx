import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, BookOpen, MessageSquare, Clock, Star, Filter, Calendar, Eye, ThumbsUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from 'react-day-picker';

interface AnalyticsData {
  totalViews: number;
  totalSearches: number;
  totalArticles: number;
  avgHelpfulness: number;
  topArticles: Array<{
    id: string;
    title: string;
    views: number;
    helpfulness: number;
    category: string;
  }>;
  searchTrends: Array<{
    query: string;
    count: number;
    success_rate: number;
  }>;
  categoryStats: Array<{
    category: string;
    article_count: number;
    total_views: number;
    avg_helpfulness: number;
  }>;
  timeSeriesData: Array<{
    date: string;
    views: number;
    searches: number;
  }>;
}

export function HelpAnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date()
  });
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    loadAnalytics();
  }, [dateRange, selectedCategory]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const fromDate = dateRange?.from?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const toDate = dateRange?.to?.toISOString() || new Date().toISOString();

      // Load article views
      const { data: viewsData, error: viewsError } = await supabase
        .from('help_article_views')
        .select(`
          *,
          help_articles!inner(*)
        `)
        .gte('created_at', fromDate)
        .lte('created_at', toDate);

      if (viewsError) throw viewsError;

      // Load search analytics
      const { data: searchData, error: searchError } = await supabase
        .from('help_search_analytics')
        .select('*')
        .gte('created_at', fromDate)
        .lte('created_at', toDate);

      if (searchError) throw searchError;

      // Load articles with feedback
      const { data: articlesData, error: articlesError } = await supabase
        .from('help_articles')
        .select(`
          *,
          help_article_feedback(*)
        `)
        .eq('status', 'published');

      if (articlesError) throw articlesError;

      // Process the data
      const totalViews = viewsData?.length || 0;
      const totalSearches = searchData?.length || 0;
      const totalArticles = articlesData?.length || 0;

      // Calculate average helpfulness
      const allFeedback = articlesData?.flatMap(article => article.help_article_feedback || []) || [];
      const helpfulFeedback = allFeedback.filter(feedback => feedback.is_helpful);
      const avgHelpfulness = allFeedback.length > 0 ? (helpfulFeedback.length / allFeedback.length) * 100 : 0;

      // Get top articles
      const articleViewCounts = viewsData?.reduce((acc, view) => {
        const articleId = view.article_id;
        acc[articleId] = (acc[articleId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const topArticles = articlesData
        ?.map(article => {
          const feedback = article.help_article_feedback || [];
          const helpfulCount = feedback.filter(f => f.is_helpful).length;
          const totalFeedback = feedback.length;
          
          return {
            id: article.id,
            title: article.title,
            views: articleViewCounts[article.id] || 0,
            helpfulness: totalFeedback > 0 ? (helpfulCount / totalFeedback) * 100 : 0,
            category: article.category
          };
        })
        .sort((a, b) => b.views - a.views)
        .slice(0, 10) || [];

      // Get search trends
      const searchTrends = searchData
        ?.reduce((acc, search) => {
          const query = search.search_query;
          if (!acc[query]) {
            acc[query] = { count: 0, totalResults: 0 };
          }
          acc[query].count++;
          acc[query].totalResults += search.results_count || 0;
          return acc;
        }, {} as Record<string, { count: number; totalResults: number }>);

      const searchTrendsArray = Object.entries(searchTrends || {})
        .map(([query, stats]) => ({
          query,
          count: stats.count,
          success_rate: stats.count > 0 ? (stats.totalResults / stats.count) * 10 : 0 // rough success rate
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Get category stats
      const categoryStats = articlesData
        ?.reduce((acc, article) => {
          const category = article.category;
          if (!acc[category]) {
            acc[category] = {
              article_count: 0,
              total_views: 0,
              feedback: []
            };
          }
          acc[category].article_count++;
          acc[category].total_views += articleViewCounts[article.id] || 0;
          acc[category].feedback.push(...(article.help_article_feedback || []));
          return acc;
        }, {} as Record<string, any>);

      const categoryStatsArray = Object.entries(categoryStats || {}).map(([category, stats]) => {
        const helpfulFeedback = stats.feedback.filter((f: any) => f.is_helpful);
        return {
          category,
          article_count: stats.article_count,
          total_views: stats.total_views,
          avg_helpfulness: stats.feedback.length > 0 ? (helpfulFeedback.length / stats.feedback.length) * 100 : 0
        };
      });

      // Generate time series data (simplified)
      const timeSeriesData = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayViews = viewsData?.filter(view => 
          view.created_at.startsWith(dateStr)
        ).length || 0;
        
        const daySearches = searchData?.filter(search => 
          search.created_at.startsWith(dateStr)
        ).length || 0;

        timeSeriesData.push({
          date: dateStr,
          views: dayViews,
          searches: daySearches
        });
      }

      setData({
        totalViews,
        totalSearches,
        totalArticles,
        avgHelpfulness,
        topArticles,
        searchTrends: searchTrendsArray,
        categoryStats: categoryStatsArray,
        timeSeriesData
      });

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted rounded animate-pulse"></div>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-64 bg-muted rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No analytics data available</p>
      </div>
    );
  }

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) {
      return <TrendingUp className="h-3 w-3 text-green-500" />;
    } else if (current < previous) {
      return <TrendingUp className="h-3 w-3 text-red-500 rotate-180" />;
    }
    return <TrendingUp className="h-3 w-3 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-bold">Help Analytics</h2>
          <p className="text-muted-foreground">Track help system usage and effectiveness</p>
        </div>
        <div className="flex gap-2">
          <DatePickerWithRange
            date={dateRange}
            onDateChange={setDateRange}
          />
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="tutorial">Tutorials</SelectItem>
              <SelectItem value="guide">Guides</SelectItem>
              <SelectItem value="faq">FAQ</SelectItem>
              <SelectItem value="video">Videos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalViews.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Help article views
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Searches</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalSearches.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Help searches performed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Articles</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalArticles}</div>
            <p className="text-xs text-muted-foreground">
              Published help articles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Helpfulness</CardTitle>
            <ThumbsUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.avgHelpfulness.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Average helpfulness rating
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Articles */}
        <Card>
          <CardHeader>
            <CardTitle>Most Viewed Articles</CardTitle>
            <CardDescription>Articles with the highest engagement</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.topArticles.slice(0, 5).map((article, index) => (
                <div key={article.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{article.title}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {article.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {article.helpfulness.toFixed(0)}% helpful
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-medium">
                    {article.views} views
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Search Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Popular Searches</CardTitle>
            <CardDescription>Most common search queries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.searchTrends.slice(0, 5).map((trend, index) => (
                <div key={trend.query} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-secondary/10 flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">"{trend.query}"</p>
                      <span className="text-xs text-muted-foreground">
                        {trend.success_rate.toFixed(1)} avg results
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline">
                    {trend.count} searches
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Category Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Category Performance</CardTitle>
            <CardDescription>Performance by content category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.categoryStats.map((category) => (
                <div key={category.category} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium capitalize">{category.category}</span>
                    <span className="text-muted-foreground">
                      {category.article_count} articles
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{category.total_views} views</span>
                    <span>{category.avg_helpfulness.toFixed(1)}% helpful</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(category.avg_helpfulness, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Activity Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Views and searches over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.timeSeriesData.map((day) => (
                <div key={day.date} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {new Date(day.date).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {day.views}
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {day.searches}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}