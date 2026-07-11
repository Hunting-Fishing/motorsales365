import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, Award, Flame, Target, Droplets } from 'lucide-react';
import { useFoodLogs, useHydrationLogs, useDailyTargets } from '@/hooks/useNutrition';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { format, subDays, eachDayOfInterval } from 'date-fns';

interface Props {
  clientId: string;
  shopId: string;
}

export default function WeeklyReport({ clientId, shopId }: Props) {
  const { data: logs = [], isLoading } = useFoodLogs(clientId, shopId);
  const { data: hydrationLogs = [] } = useHydrationLogs(clientId, shopId);
  const { data: targets } = useDailyTargets(clientId, shopId);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  const today = new Date();
  const weekStart = subDays(today, 6);
  const weekDays = eachDayOfInterval({ start: weekStart, end: today });
  const weekDates = weekDays.map(d => format(d, 'yyyy-MM-dd'));

  const weekLogs = logs.filter((l: any) => weekDates.includes(l.log_date));

  // Daily aggregates
  const dailyAggs = weekDates.map(date => {
    const dayLogs = weekLogs.filter((l: any) => l.log_date === date);
    return {
      date,
      label: format(new Date(date), 'EEE'),
      calories: dayLogs.reduce((s: number, l: any) => s + (l.calories || 0), 0),
      protein: dayLogs.reduce((s: number, l: any) => s + (l.protein_g || 0), 0),
      carbs: dayLogs.reduce((s: number, l: any) => s + (l.carbs_g || 0), 0),
      fat: dayLogs.reduce((s: number, l: any) => s + (l.fat_g || 0), 0),
      fiber: dayLogs.reduce((s: number, l: any) => s + (l.fiber_g || 0), 0),
      logged: dayLogs.length > 0,
    };
  });

  const daysLogged = dailyAggs.filter(d => d.logged).length;
  const avgCalories = daysLogged > 0 ? Math.round(dailyAggs.reduce((s, d) => s + d.calories, 0) / daysLogged) : 0;
  const avgProtein = daysLogged > 0 ? Math.round(dailyAggs.reduce((s, d) => s + d.protein, 0) / daysLogged) : 0;
  const avgCarbs = daysLogged > 0 ? Math.round(dailyAggs.reduce((s, d) => s + d.carbs, 0) / daysLogged) : 0;
  const avgFat = daysLogged > 0 ? Math.round(dailyAggs.reduce((s, d) => s + d.fat, 0) / daysLogged) : 0;
  const avgFiber = daysLogged > 0 ? Math.round(dailyAggs.reduce((s, d) => s + d.fiber, 0) / daysLogged) : 0;

  // Compliance
  const calTarget = targets?.calories || 2000;
  const daysOnTarget = dailyAggs.filter(d => d.logged && Math.abs(d.calories - calTarget) / calTarget <= 0.15).length;
  const compliance = daysLogged > 0 ? Math.round((daysOnTarget / 7) * 100) : 0;

  // Streak
  let streak = 0;
  for (let i = dailyAggs.length - 1; i >= 0; i--) {
    if (dailyAggs[i].logged) streak++;
    else break;
  }

  // Best/worst days
  const loggedDays = dailyAggs.filter(d => d.logged);
  const bestDay = loggedDays.length ? loggedDays.reduce((a, b) => Math.abs(a.calories - calTarget) < Math.abs(b.calories - calTarget) ? a : b) : null;
  const worstDay = loggedDays.length ? loggedDays.reduce((a, b) => Math.abs(a.calories - calTarget) > Math.abs(b.calories - calTarget) ? a : b) : null;

  // Hydration avg
  const weekHydration = (hydrationLogs as any[]).filter((l: any) => weekDates.includes(l.log_date));
  const avgHydration = daysLogged > 0 ? Math.round(weekHydration.reduce((s: number, l: any) => s + (l.amount_ml || 0), 0) / 7) : 0;

  // Macro pie
  const macroData = [
    { name: 'Protein', value: avgProtein * 4, color: 'hsl(var(--chart-2))' },
    { name: 'Carbs', value: avgCarbs * 4, color: 'hsl(var(--chart-4))' },
    { name: 'Fat', value: avgFat * 9, color: 'hsl(var(--chart-5))' },
  ];

  const complianceColor = compliance >= 80 ? 'text-green-600' : compliance >= 50 ? 'text-yellow-600' : 'text-red-500';

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        Weekly Nutrition Report
        <span className="text-xs font-normal text-muted-foreground ml-auto">
          {format(weekStart, 'MMM d')} – {format(today, 'MMM d, yyyy')}
        </span>
      </h2>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <Flame className="h-5 w-5 mx-auto text-orange-500 mb-1" />
            <p className="text-xl font-bold">{avgCalories}</p>
            <p className="text-[10px] text-muted-foreground">Avg Daily Cal</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Target className={`h-5 w-5 mx-auto mb-1 ${complianceColor}`} />
            <p className={`text-xl font-bold ${complianceColor}`}>{compliance}%</p>
            <p className="text-[10px] text-muted-foreground">Compliance</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Award className="h-5 w-5 mx-auto text-amber-500 mb-1" />
            <p className="text-xl font-bold">{streak}</p>
            <p className="text-[10px] text-muted-foreground">Day Streak</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Droplets className="h-5 w-5 mx-auto text-blue-500 mb-1" />
            <p className="text-xl font-bold">{avgHydration}ml</p>
            <p className="text-[10px] text-muted-foreground">Avg Hydration</p>
          </CardContent>
        </Card>
      </div>

      {/* Macro breakdown + averages */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Macro Distribution (Avg)</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-center">
            {avgCalories > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={120} height={120}>
                  <PieChart>
                    <Pie data={macroData} dataKey="value" cx="50%" cy="50%" innerRadius={30} outerRadius={55} strokeWidth={2}>
                      {macroData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`${Math.round(v)} cal`, '']} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 text-xs">
                  <p><span className="inline-block w-2 h-2 rounded-full bg-[hsl(var(--chart-2))] mr-1" />Protein: {avgProtein}g</p>
                  <p><span className="inline-block w-2 h-2 rounded-full bg-[hsl(var(--chart-4))] mr-1" />Carbs: {avgCarbs}g</p>
                  <p><span className="inline-block w-2 h-2 rounded-full bg-[hsl(var(--chart-5))] mr-1" />Fat: {avgFat}g</p>
                  <p className="text-muted-foreground">Fiber: {avgFiber}g avg</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-6">No data this week</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Day-by-Day</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {dailyAggs.map(d => (
              <div key={d.date} className="flex items-center gap-2 text-xs">
                <span className="w-8 text-muted-foreground">{d.label}</span>
                <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${d.logged ? (Math.abs(d.calories - calTarget) / calTarget <= 0.15 ? 'bg-green-500' : 'bg-amber-500') : 'bg-muted'}`}
                    style={{ width: d.logged ? `${Math.min(100, (d.calories / calTarget) * 100)}%` : '0%' }}
                  />
                </div>
                <span className="w-12 text-right font-medium">{d.logged ? `${d.calories}` : '–'}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Best/Worst */}
      {bestDay && worstDay && loggedDays.length > 1 && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-green-200 dark:border-green-900">
            <CardContent className="p-3">
              <p className="text-xs text-green-600 font-medium mb-1">🏆 Best Day</p>
              <p className="text-sm font-semibold">{format(new Date(bestDay.date), 'EEEE, MMM d')}</p>
              <p className="text-xs text-muted-foreground">{bestDay.calories} cal · P:{bestDay.protein}g C:{bestDay.carbs}g F:{bestDay.fat}g</p>
            </CardContent>
          </Card>
          <Card className="border-red-200 dark:border-red-900">
            <CardContent className="p-3">
              <p className="text-xs text-red-500 font-medium mb-1">📉 Needs Work</p>
              <p className="text-sm font-semibold">{format(new Date(worstDay.date), 'EEEE, MMM d')}</p>
              <p className="text-xs text-muted-foreground">{worstDay.calories} cal · P:{worstDay.protein}g C:{worstDay.carbs}g F:{worstDay.fat}g</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
