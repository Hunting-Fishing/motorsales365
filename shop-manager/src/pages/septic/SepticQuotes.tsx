import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, Calendar } from 'lucide-react';
import { useShopId } from '@/hooks/useShopId';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export default function SepticQuotes() {
  const { shopId } = useShopId();

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ['septic-quotes', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('septic_quotes')
        .select('*, septic_customers(first_name, last_name)')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    accepted: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    declined: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">Quotes</h1>
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : quotes.length === 0 ? (
        <Card><CardContent className="p-12 text-center"><FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" /><p className="text-muted-foreground">No quotes yet.</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {quotes.map((q: any) => {
            const cust = q.septic_customers as any;
            return (
              <Card key={q.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{q.quote_number || 'Draft'}</span>
                        <Badge className={statusColors[q.status] || ''}>{q.status}</Badge>
                      </div>
                      {cust && <p className="text-sm text-muted-foreground">{cust.first_name} {cust.last_name}</p>}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${Number(q.total || 0).toFixed(2)}</p>
                      {q.valid_until && <p className="text-xs text-muted-foreground">Valid until {format(new Date(q.valid_until), 'MMM d')}</p>}
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
