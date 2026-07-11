import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, Calendar } from 'lucide-react';
import { useShopId } from '@/hooks/useShopId';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export default function SepticCompletions() {
  const { shopId } = useShopId();

  const { data: completions = [], isLoading } = useQuery({
    queryKey: ['septic-completions', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('septic_completions')
        .select('*, septic_customers(first_name, last_name), septic_drivers(first_name, last_name)')
        .eq('shop_id', shopId)
        .order('completion_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">Completed Services</h1>
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : completions.length === 0 ? (
        <Card><CardContent className="p-12 text-center"><CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" /><p className="text-muted-foreground">No completed services yet.</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {completions.map((c: any) => {
            const cust = c.septic_customers as any;
            const driver = c.septic_drivers as any;
            return (
              <Card key={c.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{c.waste_type || 'Pump-Out'}</span>
                        {c.gallons_pumped && <Badge variant="outline">{c.gallons_pumped} gal</Badge>}
                      </div>
                      {cust && <p className="text-sm text-muted-foreground">{cust.first_name} {cust.last_name}</p>}
                      {driver && <p className="text-xs text-muted-foreground">Driver: {driver.first_name} {driver.last_name}</p>}
                      {c.disposal_site && <p className="text-xs text-muted-foreground">Disposed at: {c.disposal_site}</p>}
                    </div>
                    <div className="text-right text-xs text-muted-foreground space-y-1">
                      {c.completion_date && <p className="flex items-center gap-1 justify-end"><Calendar className="h-3 w-3" />{format(new Date(c.completion_date), 'MMM d, yyyy')}</p>}
                      {c.total_cost != null && <p className="font-medium text-sm text-foreground">${Number(c.total_cost).toFixed(2)}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
