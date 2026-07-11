import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wrench } from 'lucide-react';
import { useShopId } from '@/hooks/useShopId';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export default function SepticTidyTanks() {
  const { shopId } = useShopId();

  const { data: components = [], isLoading } = useQuery({
    queryKey: ['septic-components', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('septic_components')
        .select('*, septic_tanks(tank_type, tank_size_gallons, septic_customers(first_name, last_name))')
        .eq('shop_id', shopId)
        .order('component_type');
      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });

  const conditionColor = (c: string) => {
    if (c === 'good') return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    if (c === 'fair') return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">System Components</h1>
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : components.length === 0 ? (
        <Card><CardContent className="p-12 text-center"><Wrench className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" /><p className="text-muted-foreground">No components tracked yet.</p></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {components.map((c: any) => {
            const tank = c.septic_tanks as any;
            const cust = tank?.septic_customers as any;
            return (
              <Card key={c.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm capitalize">{c.component_name || c.component_type}</span>
                    {c.condition && <Badge className={conditionColor(c.condition)}>{c.condition}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground capitalize">{c.component_type}</p>
                  {cust && <p className="text-xs text-muted-foreground">{cust.first_name} {cust.last_name}</p>}
                  {c.manufacturer && <p className="text-xs text-muted-foreground">{c.manufacturer} {c.model || ''}</p>}
                  {c.next_service_due && <p className="text-xs text-muted-foreground">Next service: {format(new Date(c.next_service_due), 'MMM d, yyyy')}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
