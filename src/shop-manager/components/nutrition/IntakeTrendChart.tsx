import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  dailyTotals: Array<{ date: string; calories: number; protein: number }>;
}

export default function IntakeTrendChart({ dailyTotals }: Props) {
  if (dailyTotals.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4" />14-Day Intake Trend</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={dailyTotals}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="date" tickFormatter={(v: string) => format(new Date(v), 'MMM d')} fontSize={10} />
            <YAxis fontSize={10} />
            <Tooltip />
            <Bar dataKey="calories" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} name="Calories" />
            <Bar dataKey="protein" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} name="Protein (g)" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
