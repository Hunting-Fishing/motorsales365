
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { BarChart as BarChartIcon } from 'lucide-react';

interface RatingChartProps {
  ratingData: Array<{ name: string; value: number }>;
  hasRatings: boolean;
}

export const RatingChart: React.FC<RatingChartProps> = ({ ratingData, hasRatings }) => {
  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>Rating Distribution</CardTitle>
        <CardDescription>How customers rated their experience</CardDescription>
      </CardHeader>
      <CardContent className="h-80">
        {hasRatings ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ratingData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip formatter={(value) => [`${value} responses`, '']} />
              <Bar dataKey="value" fill="#4f46e5" name="Responses" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-full">
            <BarChartIcon className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500">No rating data available yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

