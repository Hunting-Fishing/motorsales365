import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Droplets, Plus, GlassWater } from 'lucide-react';
import { useHydrationLogs, useLogHydration } from '@/hooks/useNutrition';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays } from 'date-fns';

interface Props {
  clientId: string;
  shopId: string;
  dailyGoalMl?: number;
}

const SOURCES = [
  { value: 'water', label: '💧 Water' },
  { value: 'tea', label: '🍵 Tea' },
  { value: 'coffee', label: '☕ Coffee' },
  { value: 'juice', label: '🧃 Juice' },
  { value: 'sports_drink', label: '⚡ Sports Drink' },
  { value: 'other', label: '🥤 Other' },
];

const QUICK_AMOUNTS = [250, 500, 750, 1000];

export default function HydrationTracker({ clientId, shopId, dailyGoalMl = 3000 }: Props) {
  const [source, setSource] = useState('water');
  const [customAmount, setCustomAmount] = useState('');
  const { data: logs = [] } = useHydrationLogs(clientId, shopId);
  const logMutation = useLogHydration(shopId);

  const today = new Date().toISOString().split('T')[0];
  const todayLogs = logs.filter((l: any) => l.log_date === today);
  const todayTotal = todayLogs.reduce((s: number, l: any) => s + (l.amount_ml || 0), 0);
  const pct = Math.min(100, (todayTotal / dailyGoalMl) * 100);

  const handleAdd = (ml: number) => {
    logMutation.mutate({ client_id: clientId, amount_ml: ml, source, log_date: today });
  };

  // Build 7-day history
  const historyData = Array.from({ length: 7 }, (_, i) => {
    const d = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd');
    const total = logs.filter((l: any) => l.log_date === d).reduce((s: number, l: any) => s + (l.amount_ml || 0), 0);
    return { date: d, ml: total, label: format(subDays(new Date(), 6 - i), 'EEE') };
  });

  // Water fill animation
  const fillHeight = Math.min(100, pct);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Droplets className="h-4 w-4 text-blue-500" />
          Hydration Tracker
          <Badge variant="outline" className="ml-auto text-xs font-normal">
            {Math.round(todayTotal)}ml / {dailyGoalMl}ml
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Visual progress */}
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-24 border-2 border-blue-300 dark:border-blue-700 rounded-b-xl rounded-t-lg overflow-hidden bg-muted/30">
            <div
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-500 to-blue-300 transition-all duration-700 ease-out"
              style={{ height: `${fillHeight}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <GlassWater className="h-6 w-6 text-blue-600/50" />
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-sm font-semibold text-blue-600">{Math.round(pct)}% of daily goal</p>
            <p className="text-xs text-muted-foreground">{todayLogs.length} entries today</p>
          </div>
        </div>

        {/* Quick add buttons */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCES.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 flex-wrap">
            {QUICK_AMOUNTS.map(ml => (
              <Button
                key={ml}
                size="sm"
                variant="outline"
                className="text-xs h-8"
                onClick={() => handleAdd(ml)}
                disabled={logMutation.isPending}
              >
                <Plus className="h-3 w-3 mr-1" />
                {ml >= 1000 ? `${ml / 1000}L` : `${ml}ml`}
              </Button>
            ))}
            <div className="flex items-center gap-1">
              <Input
                type="number"
                placeholder="ml"
                value={customAmount}
                onChange={e => setCustomAmount(e.target.value)}
                className="w-20 h-8 text-xs"
              />
              <Button
                size="sm"
                variant="secondary"
                className="h-8 text-xs"
                onClick={() => { if (customAmount) { handleAdd(parseInt(customAmount)); setCustomAmount(''); } }}
                disabled={!customAmount || logMutation.isPending}
              >
                Add
              </Button>
            </div>
          </div>
        </div>

        {/* 7-day history */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Last 7 Days</p>
          <ResponsiveContainer width="100%" height={80}>
            <BarChart data={historyData}>
              <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis hide />
              <Tooltip formatter={(v: number) => [`${v}ml`, 'Intake']} />
              <Bar dataKey="ml" fill="hsl(var(--chart-3))" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
