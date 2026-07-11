import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { CategoryBudgetSummary } from '@/hooks/useBudgetData';

interface BudgetVsActualChartProps {
  categorySummaries: CategoryBudgetSummary[];
}

export function BudgetVsActualChart({ categorySummaries }: BudgetVsActualChartProps) {
  const chartData = categorySummaries.map(cat => ({
    name: cat.categoryName.length > 12 
      ? cat.categoryName.substring(0, 12) + '...' 
      : cat.categoryName,
    fullName: cat.categoryName,
    Planned: cat.planned,
    Actual: cat.actual,
    variance: cat.variance
  }));

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-2">{data?.fullName || label}</p>
          <div className="space-y-1 text-sm">
            <p className="flex justify-between gap-4">
              <span className="text-muted-foreground">Planned:</span>
              <span className="font-medium">{formatCurrency(data?.Planned || 0)}</span>
            </p>
            <p className="flex justify-between gap-4">
              <span className="text-muted-foreground">Actual:</span>
              <span className="font-medium">{formatCurrency(data?.Actual || 0)}</span>
            </p>
            <p className={`flex justify-between gap-4 ${data?.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              <span>Variance:</span>
              <span className="font-medium">
                {data?.variance >= 0 ? '+' : ''}{formatCurrency(data?.variance || 0)}
              </span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (categorySummaries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget vs Actual</CardTitle>
          <CardDescription>Comparison by category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No budget data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget vs Actual</CardTitle>
        <CardDescription>Comparison by category</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <YAxis 
              tickFormatter={formatCurrency}
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar 
              dataKey="Planned" 
              fill="hsl(var(--primary))" 
              radius={[4, 4, 0, 0]}
              opacity={0.8}
            />
            <Bar 
              dataKey="Actual" 
              fill="hsl(var(--chart-2))" 
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
