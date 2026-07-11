import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wrench } from 'lucide-react';
import { useShopId } from '@/hooks/useShopId';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function SepticEquipment() {
  const { shopId } = useShopId();

  const { data: equipment = [], isLoading } = useQuery({
    queryKey: ['septic-equipment', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('septic_equipment')
        .select('*, septic_trucks(truck_number)')
        .eq('shop_id', shopId)
        .order('equipment_name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });

  const statusColor = (s: string) => {
    if (s === 'active' || s === 'operational') return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    if (s === 'maintenance') return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">Equipment</h1>
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : equipment.length === 0 ? (
        <Card><CardContent className="p-12 text-center"><Wrench className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" /><p className="text-muted-foreground">No equipment tracked.</p></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {equipment.map((e: any) => {
            const truck = e.septic_trucks as any;
            return (
              <Card key={e.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{e.equipment_name}</span>
                    {e.status && <Badge className={statusColor(e.status)}>{e.status}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground capitalize">{e.equipment_type || '—'}</p>
                  {e.manufacturer && <p className="text-xs text-muted-foreground">{e.manufacturer} {e.model || ''}</p>}
                  {e.serial_number && <p className="text-xs text-muted-foreground">S/N: {e.serial_number}</p>}
                  {truck && <Badge variant="outline" className="text-xs">Truck #{truck.truck_number}</Badge>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
