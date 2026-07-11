import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

interface CustomerQuotesTabProps {
  customerId: string;
}

export function CustomerQuotesTab({ customerId }: CustomerQuotesTabProps) {
  const { data: quotes, isLoading } = useQuery({
    queryKey: ['water-delivery-customer-quotes', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('water_delivery_quotes')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!customerId,
  });

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  if (isLoading) {
    return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Quote History</h3>
      {quotes && quotes.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quote #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell className="font-medium">{quote.quote_number}</TableCell>
                    <TableCell>{quote.created_at ? format(new Date(quote.created_at), 'MMM d, yyyy') : '-'}</TableCell>
                    <TableCell>{formatCurrency(quote.total_amount || 0)}</TableCell>
                    <TableCell><Badge variant="outline">{quote.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No quotes yet</CardContent></Card>
      )}
    </div>
  );
}
