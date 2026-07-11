import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, DollarSign } from 'lucide-react';
import { useShopId } from '@/hooks/useShopId';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function SepticPricing() {
  const { shopId } = useShopId();

  const { data: rates = [], isLoading } = useQuery({
    queryKey: ['septic-labor-rates', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('septic_labor_rates')
        .select('*')
        .eq('shop_id', shopId)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">Pricing & Rates</h1>
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : rates.length === 0 ? (
        <Card><CardContent className="p-12 text-center"><DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" /><p className="text-muted-foreground">No labor rates configured. Set up rates in Settings.</p></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rates.map((r: any) => (
            <Card key={r.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{r.name}</span>
                  {r.is_active === false ? <Badge variant="destructive">Inactive</Badge> : <Badge variant="secondary">Active</Badge>}
                </div>
                {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                <div className="flex items-center gap-3">
                  {r.rate != null && <span className="font-medium">${Number(r.rate).toFixed(2)}/{r.rate_type || 'hr'}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
