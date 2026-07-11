import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useWaterUnits } from '@/hooks/water-delivery/useWaterUnits';

interface CustomerOrdersTabProps {
  customerId: string;
}

export function CustomerOrdersTab({ customerId }: CustomerOrdersTabProps) {
  const { formatVolume, getVolumeLabel } = useWaterUnits();
  
  const { data: orders, isLoading } = useQuery({
    queryKey: ['water-delivery-customer-orders', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('water_delivery_orders')
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
      <h3 className="text-lg font-semibold">Order History</h3>
      {orders && orders.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>{getVolumeLabel(false)}</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.order_number}</TableCell>
                    <TableCell>{order.order_date ? format(new Date(order.order_date), 'MMM d, yyyy') : '-'}</TableCell>
                    <TableCell>{formatVolume(order.quantity_gallons || 0, 0)}</TableCell>
                    <TableCell>{formatCurrency(order.total_amount || 0)}</TableCell>
                    <TableCell><Badge variant="outline">{order.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No orders yet</CardContent></Card>
      )}
    </div>
  );
}
