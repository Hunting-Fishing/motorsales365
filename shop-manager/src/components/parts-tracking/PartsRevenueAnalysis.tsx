import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getPartsRevenueBreakdown, PartsRevenueBreakdown } from '@/services/parts/partsAnalyticsService';

export function PartsRevenueAnalysis() {
  const [breakdown, setBreakdown] = useState<PartsRevenueBreakdown | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBreakdown = async () => {
      setIsLoading(true);
      const data = await getPartsRevenueBreakdown();
      setBreakdown(data);
      setIsLoading(false);
    };

    fetchBreakdown();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{breakdown ? formatCurrency(breakdown.monthlyRevenue) : '$0'}</div>
            <p className="text-xs text-muted-foreground">Current month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Profit Margin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{breakdown?.profitMargin || 0}%</div>
            <p className="text-xs text-muted-foreground">Average margin</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{breakdown?.topCategory || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">
              {breakdown ? formatCurrency(breakdown.topCategoryRevenue) : '$0'} revenue
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
