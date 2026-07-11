import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShoppingCart, Calendar } from 'lucide-react';
import { useShopId } from '@/hooks/useShopId';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export default function SepticPurchases() {
  const { shopId } = useShopId();

  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ['septic-purchases', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('septic_purchases')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    ordered: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    received: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">Purchases</h1>
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : purchases.length === 0 ? (
        <Card><CardContent className="p-12 text-center"><ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" /><p className="text-muted-foreground">No purchase orders yet.</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {purchases.map((p: any) => (
            <Card key={p.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{p.po_number || 'Draft'}</span>
                      <Badge className={statusColors[p.status] || ''}>{p.status}</Badge>
                    </div>
                    {p.supplier && <p className="text-sm text-muted-foreground">{p.supplier}</p>}
                  </div>
                  <div className="text-right">
                    {p.total != null && <p className="font-semibold">${Number(p.total).toFixed(2)}</p>}
                    {p.order_date && <p className="text-xs text-muted-foreground">{format(new Date(p.order_date), 'MMM d, yyyy')}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
