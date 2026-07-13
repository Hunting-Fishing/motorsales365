import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import type { NearMissReport } from '@/hooks/useNearMissReports';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

interface Props {
  reports: NearMissReport[];
}

const SEVERITY_COLORS = {
  minor: 'hsl(var(--chart-1))',
  moderate: 'hsl(var(--chart-2))',
  serious: 'hsl(var(--chart-3))',
  catastrophic: 'hsl(var(--chart-4))'
};

const CATEGORY_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--primary))'
];

export function NearMissTrendChart({ reports }: Props) {
  // Generate monthly trend data
  const monthlyData = React.useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      
      const monthReports = reports.filter(r => 
        isWithinInterval(new Date(r.report_date), { start, end })
      );
      
      months.push({
        month: format(date, 'MMM'),
        total: monthReports.length,
        minor: monthReports.filter(r => r.potential_severity === 'minor').length,
        moderate: monthReports.filter(r => r.potential_severity === 'moderate').length,
        serious: monthReports.filter(r => r.potential_severity === 'serious').length,
        catastrophic: monthReports.filter(r => r.potential_severity === 'catastrophic').length
      });
    }
    return months;
  }, [reports]);

  // Category distribution
  const categoryData = React.useMemo(() => {
    const categories: Record<string, number> = {};
    reports.forEach(r => {
      const cat = r.category || 'other';
      categories[cat] = (categories[cat] || 0) + 1;
    });
    return Object.entries(categories).map(([name, value]) => ({
      name: name.replace('_', ' '),
      value
    }));
  }, [reports]);

  // Severity distribution
  const severityData = React.useMemo(() => {
    return ['minor', 'moderate', 'serious', 'catastrophic'].map(severity => ({
      name: severity,
      value: reports.filter(r => r.potential_severity === severity).length,
      fill: SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS]
    }));
  }, [reports]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Monthly Trend */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Monthly Near Miss Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Bar dataKey="minor" stackId="a" fill={SEVERITY_COLORS.minor} name="Minor" />
                <Bar dataKey="moderate" stackId="a" fill={SEVERITY_COLORS.moderate} name="Moderate" />
                <Bar dataKey="serious" stackId="a" fill={SEVERITY_COLORS.serious} name="Serious" />
                <Bar dataKey="catastrophic" stackId="a" fill={SEVERITY_COLORS.catastrophic} name="Catastrophic" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Category Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">By Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {categoryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
