
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

interface CLVData {
  name: string;
  value: number;
}

interface CustomerLifetimeValueChartProps {
  data: CLVData[];
  title?: string;
  description?: string;
  loading?: boolean;
  className?: string;
}

export const CustomerLifetimeValueChart: React.FC<CustomerLifetimeValueChartProps> = ({
  data,
  title = "Customer Lifetime Value Distribution",
  description = "Distribution of customers by lifetime value range",
  loading = false,
  className
}) => {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="h-[300px] w-full flex items-center justify-center">
            <Skeleton className="h-[250px] w-full" />
          </div>
        ) : (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value} customers`, 'Count']} />
                <Bar dataKey="value" fill="#4f46e5" name="Customers" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
