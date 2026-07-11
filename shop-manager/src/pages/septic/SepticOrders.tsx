import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Loader2, ClipboardList, Calendar, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useShopId } from '@/hooks/useShopId';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  in_progress: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export default function SepticOrders() {
  const navigate = useNavigate();
  const { shopId } = useShopId();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['septic-orders', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('septic_service_orders')
        .select('id, order_number, service_type, status, priority, scheduled_date, scheduled_time, location_address, total, payment_status, customer_id, septic_customers(first_name, last_name)')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Service Orders</h1>
        <Button onClick={() => navigate('/septic/orders/new')} className="bg-gradient-to-r from-stone-600 to-stone-800 hover:from-stone-700 hover:to-stone-900">
          <Plus className="h-4 w-4 mr-2" /> New Order
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">No service orders yet</p>
            <Button onClick={() => navigate('/septic/orders/new')} variant="outline">Create your first order</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const customer = order.septic_customers as any;
            return (
              <Card key={order.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/septic/orders/${order.id}`)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{order.order_number || 'Draft'}</span>
                        <Badge variant="secondary" className={statusColors[order.status] || ''}>
                          {order.status?.replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline" className="capitalize text-xs">{order.service_type?.replace('_', ' ')}</Badge>
                      </div>
                      {customer && (
                        <p className="text-sm text-muted-foreground">{customer.first_name} {customer.last_name}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {order.scheduled_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(order.scheduled_date), 'MMM d, yyyy')}
                            {order.scheduled_time && ` at ${order.scheduled_time}`}
                          </span>
                        )}
                        {order.location_address && (
                          <span className="flex items-center gap-1 truncate max-w-[200px]">
                            <MapPin className="h-3 w-3" />
                            {order.location_address}
                          </span>
                        )}
                      </div>
                    </div>
                    {order.total != null && Number(order.total) > 0 && (
                      <span className="font-semibold text-sm">${Number(order.total).toFixed(2)}</span>
                    )}
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
