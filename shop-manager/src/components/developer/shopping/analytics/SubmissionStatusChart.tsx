
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface SubmissionStatusChartProps {
  data: { name: string; value: number }[];
  totalSubmissions: number;
}

// Colorful, attractive colors for pie chart segments
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export function SubmissionStatusChart({ data, totalSubmissions }: SubmissionStatusChartProps) {
  if (!data || data.every(item => item.value === 0)) {
    return (
      <Card className="shadow-md bg-white rounded-xl border border-gray-100">
        <CardHeader>
          <CardTitle>Submissions by Status</CardTitle>
          <CardDescription>No submission data available yet</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center text-slate-400">
          No submissions have been recorded
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md bg-white rounded-xl border border-gray-100">
      <CardHeader>
        <CardTitle>Submissions by Status</CardTitle>
        <CardDescription>
          Total submissions: {totalSubmissions}
        </CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={true}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value, name) => [`${value} submissions`, name]}
              contentStyle={{ borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
