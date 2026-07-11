
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface ProductInteraction {
  name: string;
  views: number;
  clicks: number;
  saves: number;
  shares: number;
}

interface ProductInteractionsChartProps {
  data: ProductInteraction[];
  showLegend?: boolean;
}

export function ProductInteractionsChart({ data, showLegend = false }: ProductInteractionsChartProps) {
  const colors = {
    views: "#8884d8",
    clicks: "#82ca9d",
    saves: "#ffc658",
    shares: "#ff8042"
  };

  return (
    <Card className="shadow-md bg-white rounded-xl border border-gray-100">
      <CardHeader>
        <CardTitle>Product Interactions</CardTitle>
        <CardDescription>How users interact with products</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500">No interaction data available</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '8px', 
                  boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                  border: '1px solid #f1f1f1' 
                }}
              />
              {showLegend && <Legend />}
              <Bar 
                dataKey="views" 
                fill={colors.views}
                name="Views" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="clicks" 
                fill={colors.clicks}
                name="Clicks"
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="saves" 
                fill={colors.saves}
                name="Saves"
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="shares" 
                fill={colors.shares}
                name="Shares"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
