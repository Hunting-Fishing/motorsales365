import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getPartsAnalytics, PartsAnalytics } from '@/services/parts/partsAnalyticsService';
import { TrendingUp, TrendingDown } from 'lucide-react';

export function PartsAnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<PartsAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      const data = await getPartsAnalytics();
      setAnalytics(data);
      setIsLoading(false);
    };

    fetchAnalytics();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-3/4 animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/2 animate-pulse mb-2"></div>
                <div className="h-3 bg-muted rounded w-2/3 animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const formatChange = (value: number) => {
    const isPositive = value >= 0;
    return (
      <span className={`flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {isPositive ? '+' : ''}{value}% from last month
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Total Parts Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.totalPartsUsed.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              {analytics && formatChange(analytics.totalPartsUsedChange)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Parts Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics ? formatCurrency(analytics.partsRevenue) : '$0'}</div>
            <p className="text-xs text-muted-foreground">
              {analytics && formatChange(analytics.partsRevenueChange)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Average Markup</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.averageMarkup || 0}%</div>
            <p className="text-xs text-muted-foreground">
              {analytics && formatChange(analytics.averageMarkupChange)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Parts ROI</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.partsROI || 0}%</div>
            <p className="text-xs text-muted-foreground">
              {analytics && formatChange(analytics.partsROIChange)}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
