import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, PieChart, TrendingUp, CheckCircle, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, BarChart as RechartsBar, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { startOfMonth, subMonths, format } from 'date-fns';

interface InspectionStats {
  total: number;
  passed: number;
  hasConcerns: number;
  failed: number;
  byMonth: { month: string; count: number; passed: number; concerns: number }[];
  byEquipmentType: { type: string; count: number }[];
}

const COLORS = ['#22c55e', '#eab308', '#ef4444', '#3b82f6', '#8b5cf6'];

export function InspectionAnalyticsCharts() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['inspection-analytics'],
    queryFn: async (): Promise<InspectionStats> => {
      const sixMonthsAgo = subMonths(new Date(), 6).toISOString();

      // Fetch vessel inspections
      const { data: vesselInspections, error: vesselError } = await supabase
        .from('vessel_inspections')
        .select('id, inspection_date, overall_status, has_concerns, safe_to_operate')
        .gte('inspection_date', sixMonthsAgo);

      if (vesselError) throw vesselError;

      // Fetch forklift inspections
      const { data: forkliftInspections, error: forkliftError } = await supabase
        .from('forklift_inspections')
        .select('id, inspection_date, overall_status, safe_to_operate')
        .gte('inspection_date', sixMonthsAgo);

      if (forkliftError) throw forkliftError;

      const allInspections = [
        ...(vesselInspections || []).map(i => ({ ...i, type: 'vessel' })),
        ...(forkliftInspections || []).map(i => ({ ...i, type: 'forklift', has_concerns: !i.safe_to_operate }))
      ];

      // Calculate stats
      const total = allInspections.length;
      const passed = allInspections.filter(i => i.safe_to_operate && !i.has_concerns).length;
      const hasConcerns = allInspections.filter(i => i.has_concerns || (i.overall_status === 'attention')).length;
      const failed = allInspections.filter(i => !i.safe_to_operate || i.overall_status === 'fail').length;

      // Group by month
      const byMonthMap = new Map<string, { count: number; passed: number; concerns: number }>();
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(new Date(), i));
        const monthKey = format(monthStart, 'MMM yyyy');
        byMonthMap.set(monthKey, { count: 0, passed: 0, concerns: 0 });
      }

      allInspections.forEach(inspection => {
        const monthKey = format(new Date(inspection.inspection_date), 'MMM yyyy');
        if (byMonthMap.has(monthKey)) {
          const current = byMonthMap.get(monthKey)!;
          current.count++;
          if (inspection.safe_to_operate && !inspection.has_concerns) current.passed++;
          if (inspection.has_concerns) current.concerns++;
        }
      });

      const byMonth = Array.from(byMonthMap.entries()).map(([month, data]) => ({
        month,
        ...data
      }));

      // Group by equipment type
      const byTypeMap = new Map<string, number>();
      allInspections.forEach(inspection => {
        const type = inspection.type === 'vessel' ? 'Vessel' : 'Forklift';
        byTypeMap.set(type, (byTypeMap.get(type) || 0) + 1);
      });

      const byEquipmentType = Array.from(byTypeMap.entries()).map(([type, count]) => ({
        type,
        count
      }));

      return { total, passed, hasConcerns, failed, byMonth, byEquipmentType };
    }
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardContent className="py-8">
              <div className="flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const statusData = [
    { name: 'Passed', value: stats.passed, color: '#22c55e' },
    { name: 'Concerns', value: stats.hasConcerns, color: '#eab308' },
    { name: 'Failed', value: stats.failed, color: '#ef4444' }
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-primary/10">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Inspections</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/20">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.passed}</p>
                <p className="text-xs text-muted-foreground">Passed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900/20">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">{stats.hasConcerns}</p>
                <p className="text-xs text-muted-foreground">With Concerns</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/20">
                <XCircle className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Status Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChart className="h-4 w-4" />
              Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <RechartsPie>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPie>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Trend Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart className="h-4 w-4" />
              Monthly Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.byMonth.some(m => m.count > 0) ? (
              <ResponsiveContainer width="100%" height={200}>
                <RechartsBar data={stats.byMonth}>
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="passed" fill="#22c55e" name="Passed" stackId="a" />
                  <Bar dataKey="concerns" fill="#eab308" name="Concerns" stackId="a" />
                </RechartsBar>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
