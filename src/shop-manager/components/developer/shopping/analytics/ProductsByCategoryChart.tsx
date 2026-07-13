
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ProductsByCategoryChartProps {
  data: { name: string; count: number }[];
}

export function ProductsByCategoryChart({ data }: ProductsByCategoryChartProps) {
  return (
    <Card className="shadow-md bg-white rounded-xl border border-gray-100">
      <CardHeader>
        <CardTitle>Products by Category</CardTitle>
        <CardDescription>Distribution of products across categories</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500">No category data available</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                tick={{ fontSize: 12 }}
                height={70} 
              />
              <YAxis />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '8px', 
                  boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                  border: '1px solid #f1f1f1' 
                }} 
                formatter={(value) => [`${value} products`, 'Count']}
              />
              <Bar 
                dataKey="count" 
                fill="#8884d8" 
                name="Product Count"
                radius={[4, 4, 0, 0]} // Rounded corners on bars
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
