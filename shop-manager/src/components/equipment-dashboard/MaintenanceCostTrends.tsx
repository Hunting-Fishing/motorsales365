import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export function MaintenanceCostTrends() {
  const { data: costData, isLoading } = useQuery({
    queryKey: ['equipment-cost-trends'],
    queryFn: async () => {
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        months.push({
          start: startOfMonth(date).toISOString(),
          end: endOfMonth(date).toISOString(),
          label: format(date, 'MMM yyyy')
        });
      }

      const results = await Promise.all(
        months.map(async (month) => {
          // Get supply order costs from order items
          const { data: orders } = await supabase
            .from('equipment_supply_order_items')
            .select('quantity, unit_price')
            .gte('created_at', month.start)
            .lte('created_at', month.end);

          const supplyCost = orders?.reduce((sum, o) => sum + ((o.quantity || 0) * (o.unit_price || 0)), 0) || 0;

          // Get task costs (if we had labor rates, we'd calculate from actual_hours)
          const { data: tasks } = await supabase
            .from('equipment_tasks')
            .select('actual_hours')
            .eq('status', 'completed')
            .gte('completed_at', month.start)
            .lte('completed_at', month.end);

          // Estimate labor cost at $50/hour
          const laborCost = (tasks?.reduce((sum, t) => sum + (t.actual_hours || 0), 0) || 0) * 50;

          return {
            month: month.label,
            supplies: supplyCost,
            labor: laborCost,
            total: supplyCost + laborCost
          };
        })
      );

      return results;
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Maintenance Cost Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasData = costData?.some(d => d.total > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Maintenance Cost Trends</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No cost data available for the last 6 months
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={costData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="month" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip 
                formatter={(value: number) => [`$${value.toFixed(2)}`, '']}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="supplies" 
                stroke="#3b82f6" 
                name="Supplies"
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="labor" 
                stroke="#22c55e" 
                name="Labor"
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="total" 
                stroke="#8b5cf6" 
                name="Total"
                strokeWidth={2}
                strokeDasharray="5 5"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
