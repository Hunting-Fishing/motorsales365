import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, ShoppingCart, Users, TrendingUp } from 'lucide-react';
import { AnalyticsData } from '@/types/analytics';

interface AnalyticsOverviewProps {
  analytics: AnalyticsData | null;
  isLoading: boolean;
}

export function AnalyticsOverview({ analytics, isLoading }: AnalyticsOverviewProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-muted rounded w-1/2"></div>
              <div className="h-4 w-4 bg-muted rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const overviewData = [
    {
      title: "Total Revenue",
      value: analytics?.overview?.totalRevenue || 0,
      format: "currency",
      change: analytics?.overview?.revenueChange || 0,
      icon: DollarSign,
    },
    {
      title: "Work Orders",
      value: analytics?.overview?.totalWorkOrders || 0,
      format: "number",
      change: analytics?.overview?.workOrderChange || 0,
      icon: ShoppingCart,
    },
    {
      title: "Active Customers",
      value: analytics?.overview?.activeCustomers || 0,
      format: "number",
      change: analytics?.overview?.customerChange || 0,
      icon: Users,
    },
    {
      title: "Avg Order Value",
      value: analytics?.overview?.avgOrderValue || 0,
      format: "currency",
      change: analytics?.overview?.avgOrderChange || 0,
      icon: TrendingUp,
    },
  ];

  const formatValue = (value: number, format: string) => {
    if (format === "currency") {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    }
    return value.toLocaleString();
  };

  const formatChange = (change: number) => {
    const isPositive = change >= 0;
    const formattedChange = Math.abs(change).toFixed(1);
    return {
      text: `${isPositive ? '+' : '-'}${formattedChange}%`,
      className: isPositive ? 'text-success' : 'text-error',
    };
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {overviewData.map((item, index) => {
        const Icon = item.icon;
        const change = formatChange(item.change);
        
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {item.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatValue(item.value, item.format)}
              </div>
              <p className={`text-xs ${change.className} flex items-center gap-1`}>
                <TrendingUp className="h-3 w-3" />
                {change.text} from last period
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}