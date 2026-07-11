import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  MapPin, 
  Container, 
  ClipboardList, 
  FileText,
  TrendingUp,
  Calendar,
  DollarSign
} from 'lucide-react';
import { useWaterUnits } from '@/hooks/water-delivery/useWaterUnits';

interface CustomerOverviewTabProps {
  customerId: string;
}

export function CustomerOverviewTab({ customerId }: CustomerOverviewTabProps) {
  const { formatVolume } = useWaterUnits();
  // Fetch recent orders
  const { data: recentOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ['water-delivery-customer-recent-orders', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('water_delivery_orders')
        .select('id, order_number, status, order_date, total_amount, quantity_gallons')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!customerId,
  });

  // Fetch recent invoices
  const { data: recentInvoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ['water-delivery-customer-recent-invoices', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('water_delivery_invoices')
        .select('id, invoice_number, status, total_amount, balance_due, created_at')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!customerId,
  });

  // Fetch locations count
  const { data: locationsCount } = useQuery({
    queryKey: ['water-delivery-customer-locations-count', customerId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('water_delivery_locations')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', customerId);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!customerId,
  });

  // Fetch tanks count
  const { data: tanksCount } = useQuery({
    queryKey: ['water-delivery-customer-tanks-count', customerId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('water_delivery_tanks')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', customerId);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!customerId,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      scheduled: 'outline',
      in_progress: 'default',
      completed: 'default',
      delivered: 'default',
      cancelled: 'destructive',
      paid: 'default',
      partial: 'secondary',
      overdue: 'destructive',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Quick Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <MapPin className="h-8 w-8 text-cyan-600" />
              <div>
                <p className="text-2xl font-bold">{locationsCount ?? 0}</p>
                <p className="text-sm text-muted-foreground">Locations</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Container className="h-8 w-8 text-cyan-600" />
              <div>
                <p className="text-2xl font-bold">{tanksCount ?? 0}</p>
                <p className="text-sm text-muted-foreground">Tanks</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Deliveries */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Deliveries
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : recentOrders && recentOrders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length > 0 ? (
            <div className="space-y-2">
              {recentOrders
                .filter(o => o.status !== 'completed' && o.status !== 'cancelled')
                .slice(0, 3)
                .map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-2 border rounded-lg">
                    <div>
                      <p className="font-medium">{order.order_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.order_date ? format(new Date(order.order_date), 'MMM d, yyyy') : '-'}
                      </p>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">No upcoming deliveries</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Recent Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : recentOrders && recentOrders.length > 0 ? (
            <div className="space-y-2">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-2 border rounded-lg">
                  <div>
                    <p className="font-medium">{order.order_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatVolume(order.quantity_gallons || 0, 0)} • {formatCurrency(order.total_amount || 0)}
                    </p>
                  </div>
                  {getStatusBadge(order.status)}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">No orders yet</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Invoices */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Recent Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoicesLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : recentInvoices && recentInvoices.length > 0 ? (
            <div className="space-y-2">
              {recentInvoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-2 border rounded-lg">
                  <div>
                    <p className="font-medium">{invoice.invoice_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(invoice.total_amount || 0)}
                      {invoice.balance_due > 0 && (
                        <span className="text-amber-600 ml-2">
                          (Due: {formatCurrency(invoice.balance_due)})
                        </span>
                      )}
                    </p>
                  </div>
                  {getStatusBadge(invoice.status)}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">No invoices yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
