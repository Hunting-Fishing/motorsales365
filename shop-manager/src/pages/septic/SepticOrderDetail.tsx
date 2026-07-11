import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Loader2, AlertTriangle, ClipboardList, Activity, ClipboardCheck, Clock } from 'lucide-react';
import { format } from 'date-fns';
import SepticOrderOverviewTab from '@/components/septic/orders/SepticOrderOverviewTab';
import SepticOrderActivityTab from '@/components/septic/orders/SepticOrderActivityTab';
import SepticOrderInspectionTab from '@/components/septic/orders/SepticOrderInspectionTab';
import SepticOrderTimeMaterialsTab from '@/components/septic/orders/SepticOrderTimeMaterialsTab';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  in_progress: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export default function SepticOrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { shopId } = useShopId();

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['septic-order-detail', orderId],
    queryFn: async () => {
      if (!orderId) return null;
      const { data, error } = await supabase
        .from('septic_service_orders')
        .select(`
          *,
          septic_customers(id, first_name, last_name, email, phone, address, city, state, zip_code),
          septic_tanks(id, tank_type, tank_size_gallons, location_address)
        `)
        .eq('id', orderId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
    staleTime: 0,
    refetchOnMount: 'always' as const,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/septic/orders')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Orders
        </Button>
        <Card>
          <CardContent className="p-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive opacity-60" />
            <p className="text-muted-foreground">Service order not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/septic/orders')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{order.order_number || 'Draft Order'}</h1>
            <Badge variant="secondary" className={statusColors[order.status] || ''}>
              {order.status?.replace('_', ' ')}
            </Badge>
            {order.priority && order.priority !== 'normal' && (
              <Badge variant="outline" className="capitalize">{order.priority}</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Service Type: <span className="capitalize">{order.service_type?.replace('_', ' ')}</span>
          </p>
        </div>
      </div>

      {/* Tabbed Layout */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm">
            <ClipboardList className="h-4 w-4 hidden sm:inline" /> Overview
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-1.5 text-xs sm:text-sm">
            <Activity className="h-4 w-4 hidden sm:inline" /> Activity
          </TabsTrigger>
          <TabsTrigger value="inspection" className="gap-1.5 text-xs sm:text-sm">
            <ClipboardCheck className="h-4 w-4 hidden sm:inline" /> Inspection
          </TabsTrigger>
          <TabsTrigger value="time-materials" className="gap-1.5 text-xs sm:text-sm">
            <Clock className="h-4 w-4 hidden sm:inline" /> Time & Materials
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <SepticOrderOverviewTab order={order} />
        </TabsContent>

        <TabsContent value="activity">
          <SepticOrderActivityTab orderId={orderId!} shopId={shopId} />
        </TabsContent>

        <TabsContent value="inspection">
          <SepticOrderInspectionTab
            orderId={orderId!}
            shopId={shopId}
            customerId={order.customer_id}
          />
        </TabsContent>

        <TabsContent value="time-materials">
          <SepticOrderTimeMaterialsTab orderId={orderId!} shopId={shopId} />
        </TabsContent>
      </Tabs>

      {/* Timestamps */}
      <p className="text-xs text-muted-foreground text-right">
        Created {format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}
        {order.updated_at && order.updated_at !== order.created_at && (
          <> · Updated {format(new Date(order.updated_at), 'MMM d, yyyy h:mm a')}</>
        )}
      </p>
    </div>
  );
}
