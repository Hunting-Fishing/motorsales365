
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';

interface NpsChartProps {
  npsData: Array<{ name: string; value: number; color: string }>;
  hasData: boolean;
}

export const NpsChart: React.FC<NpsChartProps> = ({ npsData, hasData }) => {
  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>NPS Breakdown</CardTitle>
        <CardDescription>Distribution of Promoters, Passives, and Detractors</CardDescription>
      </CardHeader>
      <CardContent className="h-80">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={npsData}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {npsData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value} responses`, '']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-full">
            <PieChartIcon className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500">No NPS data available yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

