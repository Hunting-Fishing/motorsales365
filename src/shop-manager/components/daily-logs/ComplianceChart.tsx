import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, CheckCircle } from 'lucide-react';
import { ComplianceStats, TrendDataPoint } from '@/hooks/useMaintenanceTrends';
import { 
  ResponsiveContainer, 
  PieChart as RechartsPie, 
  Pie, 
  Cell, 
  Legend, 
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';

interface ComplianceChartProps {
  compliance: ComplianceStats | undefined;
  trendData: TrendDataPoint[];
  isLoading: boolean;
}

const COLORS = {
  early: '#3b82f6',     // blue
  onTime: '#22c55e',    // green
  late: '#ef4444',      // red
  breakdown: '#f97316'  // orange
};

export function ComplianceChart({ compliance, trendData, isLoading }: ComplianceChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Compliance Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  const pieData = compliance ? [
    { name: 'Early', value: compliance.early, color: COLORS.early },
    { name: 'On Time', value: compliance.onTime, color: COLORS.onTime },
    { name: 'Late', value: compliance.late, color: COLORS.late },
    { name: 'Breakdown', value: compliance.breakdown, color: COLORS.breakdown }
  ].filter(d => d.value > 0) : [];

  const hasData = pieData.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          Maintenance Compliance
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="h-[280px] flex items-center justify-center text-muted-foreground">
            No maintenance data with completion status in this period
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pie Chart */}
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [value, 'Count']}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value) => <span className="text-xs">{value}</span>}
                  />
                </RechartsPie>
              </ResponsiveContainer>
            </div>

            {/* Stats */}
            <div className="space-y-3">
              {pieData.map(item => {
                const percentage = compliance && compliance.total > 0 
                  ? Math.round((item.value / compliance.total) * 100)
                  : 0;
                return (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }} 
                      />
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold">{item.value}</span>
                      <span className="text-xs text-muted-foreground ml-1">({percentage}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Trend Over Time */}
        {trendData.length > 1 && (
          <div className="mt-6 pt-4 border-t">
            <h4 className="text-sm font-medium mb-3">Trend Over Time</h4>
            <div className="h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => value.slice(5)} // Show MM-DD
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="onTime" 
                    stackId="1" 
                    stroke={COLORS.onTime} 
                    fill={COLORS.onTime}
                    fillOpacity={0.6}
                    name="On Time"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="early" 
                    stackId="1" 
                    stroke={COLORS.early} 
                    fill={COLORS.early}
                    fillOpacity={0.6}
                    name="Early"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="late" 
                    stackId="1" 
                    stroke={COLORS.late} 
                    fill={COLORS.late}
                    fillOpacity={0.6}
                    name="Late"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
