import React, { useState } from 'react';
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar, BarChart, Area, AreaChart } from 'recharts';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface EnhancedRevenueChartProps {
  data: any;
  isLoading: boolean;
  timeRange: string;
  onDrillDown: (data: any) => void;
}

export function EnhancedRevenueChart({ data, isLoading, timeRange, onDrillDown }: EnhancedRevenueChartProps) {
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area'>('line');
  const [showTrendline, setShowTrendline] = useState(true);
  
  if (isLoading) {
    return (
      <div className="h-[350px] flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading enhanced chart...</div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-[350px] flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">No revenue data available</p>
          <p className="text-sm text-muted-foreground mt-1">Data will appear as work orders are completed</p>
        </div>
      </div>
    );
  }

  // Calculate trend and statistics
  const totalRevenue = data.reduce((sum: number, item: any) => sum + item.revenue, 0);
  const avgRevenue = totalRevenue / data.length;
  const maxRevenue = Math.max(...data.map((item: any) => item.revenue));
  const trend = data.length > 1 ? 
    ((data[data.length - 1].revenue - data[0].revenue) / data[0].revenue * 100) : 0;

  const handlePointClick = (data: any) => {
    onDrillDown({ point: data, type: 'revenue', timeRange });
  };

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    };

    switch (chartType) {
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              className="text-xs fill-muted-foreground"
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              className="text-xs fill-muted-foreground"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
              formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
            />
            <Bar 
              dataKey="revenue" 
              fill="hsl(var(--primary))"
              onClick={handlePointClick}
              className="cursor-pointer"
            />
          </BarChart>
        );
      
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              className="text-xs fill-muted-foreground"
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              className="text-xs fill-muted-foreground"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
              formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
            />
            <Area 
              type="monotone" 
              dataKey="revenue" 
              stroke="hsl(var(--primary))" 
              fill="hsl(var(--primary))"
              fillOpacity={0.3}
              onClick={handlePointClick}
              className="cursor-pointer"
            />
          </AreaChart>
        );
      
      default:
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              className="text-xs fill-muted-foreground"
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              className="text-xs fill-muted-foreground"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
              formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
            />
            <Line 
              type="monotone" 
              dataKey="revenue" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
              onClick={handlePointClick}
              className="cursor-pointer"
            />
          </LineChart>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Chart Controls and Stats */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Badge variant={trend >= 0 ? 'default' : 'destructive'}>
            {trend >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
            {trend.toFixed(1)}% trend
          </Badge>
          <Badge variant="outline">
            Avg: ${avgRevenue.toLocaleString()}
          </Badge>
          <Badge variant="outline">
            Peak: ${maxRevenue.toLocaleString()}
          </Badge>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setChartType('line')}>
              Line Chart
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setChartType('bar')}>
              Bar Chart
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setChartType('area')}>
              Area Chart
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowTrendline(!showTrendline)}>
              {showTrendline ? 'Hide' : 'Show'} Trendline
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDrillDown({ type: 'full_analysis', data })}>
              <Activity className="h-4 w-4 mr-2" />
              Full Analysis
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Enhanced Chart */}
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>

      {/* Quick Insights */}
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="text-center">
          <p className="font-medium">${totalRevenue.toLocaleString()}</p>
          <p className="text-muted-foreground">Total Revenue</p>
        </div>
        <div className="text-center">
          <p className="font-medium">{data.length} days</p>
          <p className="text-muted-foreground">Data Points</p>
        </div>
        <div className="text-center">
          <p className="font-medium">
            {data.filter((item: any) => item.revenue > avgRevenue).length}
          </p>
          <p className="text-muted-foreground">Above Average</p>
        </div>
      </div>
    </div>
  );
}