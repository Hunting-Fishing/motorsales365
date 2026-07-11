import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Users } from 'lucide-react';

interface CLVData {
  segment: string;
  averageClv: number;
  customerCount: number;
  growth: number;
  color: string;
}

interface CustomerLifetimeValueCardProps {
  data?: CLVData[];
  isLoading?: boolean;
  customerId?: string;
  className?: string;
}

export function CustomerLifetimeValueCard({ data = [], isLoading = false, className }: CustomerLifetimeValueCardProps) {
  const totalCLV = data.reduce((sum, item) => sum + (item.averageClv * item.customerCount), 0);
  const totalCustomers = data.reduce((sum, item) => sum + item.customerCount, 0);
  const avgCLV = totalCustomers > 0 ? totalCLV / totalCustomers : 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Customer Lifetime Value
          </CardTitle>
          <CardDescription>Predicted value by customer segment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-6 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Customer Lifetime Value
        </CardTitle>
        <CardDescription>
          Average CLV: ${avgCLV.toLocaleString()} across {totalCustomers} customers
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((segment) => (
            <div key={segment.segment} className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: segment.color }}
                  />
                  <span className="font-medium">{segment.segment}</span>
                  <div className="flex items-center gap-1 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    {segment.customerCount}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">
                    ${segment.averageClv.toLocaleString()}
                  </span>
                  <div className={`flex items-center gap-1 text-sm ${
                    segment.growth >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {segment.growth >= 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    {Math.abs(segment.growth)}%
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 p-4 bg-muted/30 rounded-lg">
          <h4 className="font-medium mb-2">CLV Insights</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Focus on high-value segments for retention campaigns</li>
            <li>• Monitor declining segments for intervention opportunities</li>
            <li>• Use CLV data for pricing and service tier decisions</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}