import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Clock, CheckCircle2, XCircle, BookOpen } from 'lucide-react';
import { VitaminInteractionChart } from './VitaminInteractionChart';
import { SupplementDetailDialog } from './SupplementDetailDialog';

export function VitaminGuide() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);

  const { data: supplements = [], isLoading } = useQuery({
    queryKey: ['pt-supplements-guide'],
    queryFn: async () => {
      const { data } = await supabase
        .from('pt_supplements')
        .select('*, pt_supplement_brands(name)')
        .in('category', ['vitamin', 'mineral'])
        .order('name');
      return (data || []) as any[];
    },
  });

  const filtered = supplements.filter((s: any) =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.benefits || []).some((b: string) => b.toLowerCase().includes(search.toLowerCase()))
  );

  const timingGroups: Record<string, any[]> = {};
  filtered.forEach(s => {
    const time = s.best_time_to_take || 'Anytime';
    const key = time.toLowerCase().includes('morning') ? 'Morning' :
                time.toLowerCase().includes('evening') || time.toLowerCase().includes('bed') ? 'Evening' :
                time.toLowerCase().includes('meal') || time.toLowerCase().includes('food') ? 'With Meals' : 'Flexible';
    if (!timingGroups[key]) timingGroups[key] = [];
    timingGroups[key].push(s);
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search vitamins, minerals, or benefits..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Timing Guide */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          When to Take
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.entries(timingGroups).map(([time, items]) => (
            <Card key={time} className="border-border/50">
              <CardContent className="p-3">
                <Badge variant="outline" className="mb-2 text-xs">{time}</Badge>
                <div className="space-y-1">
                  {items.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSelected(s)}
                      className="w-full text-left text-xs text-muted-foreground hover:text-foreground transition-colors py-0.5"
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Interaction Chart */}
      <VitaminInteractionChart supplements={filtered} onSelect={setSelected} />

      {/* Full List */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          Vitamin & Mineral Reference
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(s => (
            <Card
              key={s.id}
              className="cursor-pointer hover:shadow-md transition-all border-border/50"
              onClick={() => setSelected(s)}
            >
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-foreground">{s.name}</h4>
                  {s.best_time_to_take && (
                    <Badge variant="outline" className="text-[10px]">{s.best_time_to_take}</Badge>
                  )}
                </div>
                {s.health_guide && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{s.health_guide}</p>
                )}
                <div className="flex gap-1 flex-wrap">
                  {s.take_with?.slice(0, 2).map((t: string) => (
                    <Badge key={t} className="text-[9px] bg-emerald-100 text-emerald-700 border-emerald-200">+ {t}</Badge>
                  ))}
                  {s.avoid_with?.slice(0, 1).map((a: string) => (
                    <Badge key={a} className="text-[9px] bg-red-100 text-red-700 border-red-200">✕ {a}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <SupplementDetailDialog
        open={!!selected}
        onOpenChange={() => setSelected(null)}
        supplement={selected}
      />
    </div>
  );
}
