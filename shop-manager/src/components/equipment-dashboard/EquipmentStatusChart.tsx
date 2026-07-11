import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

const STATUS_COLORS: Record<string, string> = {
  operational: '#22c55e',
  maintenance: '#eab308',
  out_of_service: '#ef4444',
  down: '#dc2626',
  pending: '#6b7280'
};

const STATUS_LABELS: Record<string, string> = {
  operational: 'Operational',
  maintenance: 'In Maintenance',
  out_of_service: 'Out of Service',
  down: 'Down',
  pending: 'Pending'
};

export function EquipmentStatusChart() {
  const { data: statusData, isLoading } = useQuery({
    queryKey: ['equipment-status-distribution'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment_assets')
        .select('status');
      
      if (error) throw error;

      const statusCounts: Record<string, number> = {};
      data?.forEach(item => {
        const status = item.status || 'pending';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      return Object.entries(statusCounts).map(([status, count]) => ({
        name: STATUS_LABELS[status] || status,
        value: count,
        color: STATUS_COLORS[status] || '#6b7280'
      }));
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Equipment Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const totalEquipment = statusData?.reduce((sum, item) => sum + item.value, 0) || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Equipment Status Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        {totalEquipment === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No equipment data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData?.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => [value, 'Count']}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
