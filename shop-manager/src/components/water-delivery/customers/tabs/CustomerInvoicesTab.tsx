import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

interface CustomerInvoicesTabProps {
  customerId: string;
}

export function CustomerInvoicesTab({ customerId }: CustomerInvoicesTabProps) {
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['water-delivery-customer-invoices', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('water_delivery_invoices')
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
      <h3 className="text-lg font-semibold">Invoices & Payments</h3>
      {invoices && invoices.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Balance Due</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>{invoice.created_at ? format(new Date(invoice.created_at), 'MMM d, yyyy') : '-'}</TableCell>
                    <TableCell>{formatCurrency(invoice.total_amount || 0)}</TableCell>
                    <TableCell className={invoice.balance_due > 0 ? 'text-amber-600 font-medium' : ''}>
                      {formatCurrency(invoice.balance_due || 0)}
                    </TableCell>
                    <TableCell><Badge variant={invoice.status === 'paid' ? 'default' : 'outline'}>{invoice.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No invoices yet</CardContent></Card>
      )}
    </div>
  );
}
