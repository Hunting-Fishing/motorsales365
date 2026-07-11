import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Filter } from 'lucide-react';
import { useShopId } from '@/hooks/useShopId';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function SepticEquipmentFilters() {
  const { shopId } = useShopId();

  const { data: chemicals = [], isLoading } = useQuery({
    queryKey: ['septic-chemicals', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('septic_chemicals')
        .select('*')
        .eq('shop_id', shopId)
        .order('chemical_name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">Chemicals & Treatments</h1>
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : chemicals.length === 0 ? (
        <Card><CardContent className="p-12 text-center"><Filter className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" /><p className="text-muted-foreground">No chemicals tracked.</p></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {chemicals.map((c: any) => (
            <Card key={c.id} className={c.is_hazardous ? 'border-red-300 dark:border-red-700' : ''}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{c.chemical_name}</span>
                  {c.is_hazardous && <Badge variant="destructive" className="text-xs">Hazardous</Badge>}
                </div>
                <p className="text-xs text-muted-foreground capitalize">{c.chemical_type || '—'}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{c.current_stock || 0} {c.unit_of_measure || 'units'}</Badge>
                  {c.unit_cost && <span className="text-xs text-muted-foreground">${Number(c.unit_cost).toFixed(2)}/unit</span>}
                </div>
                {c.manufacturer && <p className="text-xs text-muted-foreground">{c.manufacturer}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
