import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Package, AlertTriangle } from 'lucide-react';
import { useShopId } from '@/hooks/useShopId';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function SepticInventory() {
  const { shopId } = useShopId();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['septic-inventory', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('septic_inventory')
        .select('*')
        .eq('shop_id', shopId)
        .order('item_name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">Inventory</h1>
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <Card><CardContent className="p-12 text-center"><Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" /><p className="text-muted-foreground">No inventory items.</p></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item: any) => {
            const isLow = item.minimum_quantity && item.current_quantity <= item.minimum_quantity;
            return (
              <Card key={item.id} className={isLow ? 'border-red-300 dark:border-red-700' : ''}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{item.item_name}</span>
                    {isLow && <AlertTriangle className="h-4 w-4 text-red-500" />}
                  </div>
                  {item.item_code && <p className="text-xs text-muted-foreground">Code: {item.item_code}</p>}
                  <div className="flex items-center gap-2">
                    <Badge variant={isLow ? 'destructive' : 'secondary'}>{item.current_quantity || 0} {item.unit_of_measure || 'units'}</Badge>
                    {item.category && <Badge variant="outline" className="text-xs capitalize">{item.category}</Badge>}
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    {item.unit_cost && <span>Cost: ${Number(item.unit_cost).toFixed(2)}</span>}
                    {item.supplier && <span>{item.supplier}</span>}
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
