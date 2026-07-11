
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { getMonthlyRevenue } from '@/services/dashboard';
import { formatCurrency } from '@/utils/formatters';
import { BaseChart } from './shared/BaseChart';

export function MonthlyRevenueChart() {
  const [data, setData] = useState<{ month: string; revenue: number }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const revenueData = await getMonthlyRevenue();
        setData(revenueData);
      } catch (error) {
        console.error('Error fetching monthly revenue data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  const formatYAxis = (value: number) => {
    if (value >= 1000) {
      return `$${value / 1000}k`;
    }
    return `$${value}`;
  };
  
  const renderTooltip = (props: any) => {
    const { payload } = props;
    if (payload && payload.length > 0) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-2 border shadow-sm rounded">
          <p className="font-medium">{data.month}</p>
          <p className="text-blue-500">{formatCurrency(data.revenue)}</p>
        </div>
      );
    }
    return null;
  };
  
  return (
    <BaseChart
      title="Monthly Revenue"
      isLoading={loading}
      className="col-span-4"
    >
      <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
        <XAxis 
          dataKey="month" 
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
        />
        <YAxis 
          tickFormatter={formatYAxis}
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
        />
        <Tooltip content={renderTooltip} cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }} />
        <Bar 
          dataKey="revenue" 
          fill="#3B82F6" 
          radius={[4, 4, 0, 0]}
          maxBarSize={40}
        />
      </BarChart>
    </BaseChart>
  );
}
