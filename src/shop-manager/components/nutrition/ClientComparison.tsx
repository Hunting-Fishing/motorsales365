import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';
import { useState } from 'react';

interface Props {
  shopId: string;
  onSelectClient: (clientId: string) => void;
}

type SortKey = 'name' | 'avgCalories' | 'avgProtein' | 'compliance' | 'lastLogged' | 'avgHydration';

export default function ClientComparison({ shopId, onSelectClient }: Props) {
  const [sortBy, setSortBy] = useState<SortKey>('compliance');
  const [sortAsc, setSortAsc] = useState(false);

  const weekStart = format(subDays(new Date(), 6), 'yyyy-MM-dd');

  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['pt-comparison-clients', shopId],
    queryFn: async () => {
      const { data } = await (supabase as any).from('pt_clients')
        .select('id, first_name, last_name, calorie_target')
        .eq('shop_id', shopId).eq('membership_status', 'active').order('first_name');
      return data || [];
    },
    enabled: !!shopId,
  });

  const { data: foodLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['pt-comparison-food-logs', shopId, weekStart],
    queryFn: async () => {
      const { data } = await (supabase as any).from('nt_food_logs')
        .select('client_id, log_date, calories, protein_g')
        .eq('shop_id', shopId).gte('log_date', weekStart);
      return data || [];
    },
    enabled: !!shopId,
  });

  const { data: hydrationLogs = [] } = useQuery({
    queryKey: ['pt-comparison-hydration', shopId, weekStart],
    queryFn: async () => {
      const { data } = await (supabase as any).from('nt_hydration_logs')
        .select('client_id, log_date, amount_ml')
        .eq('shop_id', shopId).gte('log_date', weekStart);
      return data || [];
    },
    enabled: !!shopId,
  });

  const isLoading = clientsLoading || logsLoading;

  const clientStats = useMemo(() => {
    return clients.map((c: any) => {
      const cLogs = foodLogs.filter((l: any) => l.client_id === c.id);
      const logDates = [...new Set(cLogs.map((l: any) => l.log_date))] as string[];
      const daysLogged = logDates.length;
      const totalCal = cLogs.reduce((s: number, l: any) => s + (l.calories || 0), 0);
      const totalProt = cLogs.reduce((s: number, l: any) => s + (l.protein_g || 0), 0);
      const avgCalories = daysLogged > 0 ? Math.round(totalCal / daysLogged) : 0;
      const avgProtein = daysLogged > 0 ? Math.round(totalProt / daysLogged) : 0;
      const calTarget = c.calorie_target || 2000;
      const daysOnTarget = logDates.filter(d => {
        const dayCal = cLogs.filter((l: any) => l.log_date === d).reduce((s: number, l: any) => s + (l.calories || 0), 0);
        return Math.abs(dayCal - calTarget) / calTarget <= 0.15;
      }).length;
      const compliance = Math.round((daysOnTarget / 7) * 100);
      const lastLogged = cLogs.length > 0 ? cLogs.sort((a: any, b: any) => b.log_date.localeCompare(a.log_date))[0].log_date : null;

      const cHydration = (hydrationLogs as any[]).filter((l: any) => l.client_id === c.id);
      const avgHydration = Math.round(cHydration.reduce((s: number, l: any) => s + (l.amount_ml || 0), 0) / 7);

      return {
        id: c.id,
        name: `${c.first_name} ${c.last_name}`,
        avgCalories,
        avgProtein,
        compliance,
        lastLogged,
        avgHydration,
      };
    });
  }, [clients, foodLogs, hydrationLogs]);

  const sorted = useMemo(() => {
    const s = [...clientStats];
    s.sort((a, b) => {
      let av: any = a[sortBy];
      let bv: any = b[sortBy];
      if (sortBy === 'lastLogged') { av = av || ''; bv = bv || ''; }
      if (av < bv) return sortAsc ? -1 : 1;
      if (av > bv) return sortAsc ? 1 : -1;
      return 0;
    });
    return s;
  }, [clientStats, sortBy, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setSortAsc(!sortAsc);
    else { setSortBy(key); setSortAsc(false); }
  };

  const complianceBadge = (pct: number) => {
    if (pct >= 80) return <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-[10px]">{pct}%</Badge>;
    if (pct >= 50) return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 text-[10px]">{pct}%</Badge>;
    return <Badge className="bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300 text-[10px]">{pct}%</Badge>;
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Client Nutrition Overview
          <span className="text-xs font-normal text-muted-foreground ml-auto">Last 7 days</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {clients.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No active clients found</p>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  {([['name', 'Client'], ['avgCalories', 'Avg Cal'], ['avgProtein', 'Avg Prot'], ['compliance', 'Compliance'], ['avgHydration', 'Hydration'], ['lastLogged', 'Last Log']] as [SortKey, string][]).map(([key, label]) => (
                    <th key={key} className="py-2 px-1 text-left font-medium text-muted-foreground">
                      <Button variant="ghost" size="sm" className="h-6 px-1 text-xs font-medium" onClick={() => toggleSort(key)}>
                        {label} <ArrowUpDown className="h-3 w-3 ml-0.5" />
                      </Button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map(c => (
                  <tr
                    key={c.id}
                    className="border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => onSelectClient(c.id)}
                  >
                    <td className="py-2.5 px-2 font-medium">{c.name}</td>
                    <td className="py-2.5 px-2">{c.avgCalories || '–'}</td>
                    <td className="py-2.5 px-2">{c.avgProtein ? `${c.avgProtein}g` : '–'}</td>
                    <td className="py-2.5 px-2">{complianceBadge(c.compliance)}</td>
                    <td className="py-2.5 px-2">{c.avgHydration ? `${c.avgHydration}ml` : '–'}</td>
                    <td className="py-2.5 px-2 text-muted-foreground">{c.lastLogged ? format(new Date(c.lastLogged), 'MMM d') : 'Never'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
