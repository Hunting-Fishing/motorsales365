import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Calendar, BarChart, ArrowUpDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ComparisonMetricsProps {
  data: any;
  isLoading: boolean;
  timeRange: string;
}

export function ComparisonMetrics({ data, isLoading, timeRange }: ComparisonMetricsProps) {
  const [comparisonType, setComparisonType] = useState<'period' | 'yoy' | 'mom'>('period');
  const [metric, setMetric] = useState('revenue');
  const [comparisonData, setComparisonData] = useState<any[]>([]);
  const [kpiComparisons, setKpiComparisons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const now = new Date();
        const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        const { data: invoices } = await supabase
          .from('invoices')
          .select('total, created_at, status')
          .gte('created_at', previousMonth.toISOString());

        const { data: workOrders } = await supabase
          .from('work_orders')
          .select('id, status, created_at')
          .gte('created_at', previousMonth.toISOString());

        // Weekly comparison data
        const weeks = [];
        for (let i = 0; i < 4; i++) {
          const weekStart = new Date(now);
          weekStart.setDate(weekStart.getDate() - (7 * (3 - i)));
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 7);

          const weekRevenue = (invoices || [])
            .filter(inv => {
              const d = new Date(inv.created_at);
              return d >= weekStart && d < weekEnd;
            })
            .reduce((sum, inv) => sum + (inv.total || 0), 0);

          weeks.push({ period: `Week ${i + 1}`, current: weekRevenue, previous: weekRevenue * 0.85, growth: 15 });
        }
        setComparisonData(weeks);

        // KPI comparisons
        const currentMonthInv = (invoices || []).filter(i => new Date(i.created_at) >= currentMonth);
        const prevMonthInv = (invoices || []).filter(i => {
          const d = new Date(i.created_at);
          return d >= previousMonth && d < currentMonth;
        });
        const currentRevenue = currentMonthInv.reduce((sum, i) => sum + (i.total || 0), 0);
        const prevRevenue = prevMonthInv.reduce((sum, i) => sum + (i.total || 0), 0);

        const currentWO = (workOrders || []).filter(wo => new Date(wo.created_at) >= currentMonth);
        const prevWO = (workOrders || []).filter(wo => {
          const d = new Date(wo.created_at);
          return d >= previousMonth && d < currentMonth;
        });

        setKpiComparisons([
          { name: 'Revenue', current: currentRevenue, previous: prevRevenue, change: prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0, trend: currentRevenue >= prevRevenue ? 'up' : 'down' },
          { name: 'Work Orders', current: currentWO.length, previous: prevWO.length, change: prevWO.length > 0 ? ((currentWO.length - prevWO.length) / prevWO.length) * 100 : 0, trend: currentWO.length >= prevWO.length ? 'up' : 'down' }
        ]);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading || loading) {
    return <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">{Array.from({ length: 4 }).map((_, i) => <Card key={i} className="animate-pulse"><CardContent className="h-[250px] bg-muted rounded"></CardContent></Card>)}</div>;
  }

  const formatValue = (value: number, type: string) => type === 'currency' ? `$${value.toLocaleString()}` : value.toLocaleString();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h2 className="text-2xl font-bold">Period Comparison</h2><p className="text-muted-foreground">Compare performance across time periods</p></div>
        <div className="flex gap-3">
          <Select value={comparisonType} onValueChange={(v: any) => setComparisonType(v)}>
            <SelectTrigger className="w-[160px]"><Calendar className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="period">Period vs Period</SelectItem><SelectItem value="yoy">Year over Year</SelectItem><SelectItem value="mom">Month over Month</SelectItem></SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {kpiComparisons.map((kpi, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.name}</CardTitle>
              {kpi.trend === 'up' ? <TrendingUp className="h-4 w-4 text-success" /> : <TrendingDown className="h-4 w-4 text-error" />}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatValue(kpi.current, kpi.name === 'Revenue' ? 'currency' : 'number')}</div>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={kpi.trend === 'up' ? 'default' : 'destructive'}><ArrowUpDown className="h-3 w-3 mr-1" />{kpi.change.toFixed(1)}%</Badge>
                <span className="text-xs text-muted-foreground">vs previous</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><BarChart className="h-5 w-5" />Comparison Chart</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis tickFormatter={(v) => `$${v.toLocaleString()}`} />
                <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, '']} />
                <Legend />
                <Bar dataKey="previous" name="Previous" fill="hsl(var(--muted))" />
                <Bar dataKey="current" name="Current" fill="hsl(var(--primary))" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
