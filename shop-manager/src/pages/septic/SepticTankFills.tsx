import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Droplets, Calendar } from 'lucide-react';
import { useShopId } from '@/hooks/useShopId';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export default function SepticTankFills() {
  const { shopId } = useShopId();

  const { data: pumpOuts = [], isLoading } = useQuery({
    queryKey: ['septic-pump-outs', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('septic_pump_outs')
        .select('*, septic_customers(first_name, last_name), septic_tanks(tank_type, tank_size_gallons), septic_trucks(truck_number)')
        .eq('shop_id', shopId)
        .order('pump_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">Pump-Out Records</h1>
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : pumpOuts.length === 0 ? (
        <Card><CardContent className="p-12 text-center"><Droplets className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" /><p className="text-muted-foreground">No pump-out records yet.</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {pumpOuts.map((p: any) => {
            const cust = p.septic_customers as any;
            const tank = p.septic_tanks as any;
            const truck = p.septic_trucks as any;
            return (
              <Card key={p.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {p.gallons_pumped && <Badge variant="outline">{p.gallons_pumped} gal</Badge>}
                        {p.waste_type && <Badge variant="secondary" className="capitalize text-xs">{p.waste_type}</Badge>}
                      </div>
                      {cust && <p className="text-sm">{cust.first_name} {cust.last_name}</p>}
                      {tank && <p className="text-xs text-muted-foreground">{tank.tank_type} — {tank.tank_size_gallons} gal</p>}
                      {truck && <p className="text-xs text-muted-foreground">Truck #{truck.truck_number}</p>}
                      {p.disposal_site && <p className="text-xs text-muted-foreground">Disposal: {p.disposal_site}</p>}
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      {p.pump_date && <p className="flex items-center gap-1 justify-end"><Calendar className="h-3 w-3" />{format(new Date(p.pump_date), 'MMM d, yyyy')}</p>}
                      {p.manifest_number && <p>Manifest: {p.manifest_number}</p>}
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
