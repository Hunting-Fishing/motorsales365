import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Container, Calendar, Truck, Plus, ClipboardList, Users, Route, Shield, Loader2, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useShopId } from '@/hooks/useShopId';
import { useModuleDisplayInfo } from '@/hooks/useModuleDisplayInfo';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export default function SepticDashboard() {
  const navigate = useNavigate();
  const { shopId } = useShopId();
  const { data: moduleInfo } = useModuleDisplayInfo(shopId, 'septic');

  const { data: stats } = useQuery({
    queryKey: ['septic-dashboard-stats', shopId],
    queryFn: async () => {
      if (!shopId) return { orders: 0, tanks: 0, completions: 0, trucks: 0 };
      const [ordersRes, tanksRes, completionsRes, trucksRes] = await Promise.all([
        supabase.from('septic_service_orders').select('id', { count: 'exact', head: true }).eq('shop_id', shopId),
        supabase.from('septic_tanks').select('id', { count: 'exact', head: true }).eq('shop_id', shopId),
        supabase.from('septic_completions').select('id', { count: 'exact', head: true }).eq('shop_id', shopId),
        supabase.from('septic_trucks').select('id', { count: 'exact', head: true }).eq('shop_id', shopId),
      ]);
      return {
        orders: ordersRes.count || 0,
        tanks: tanksRes.count || 0,
        completions: completionsRes.count || 0,
        trucks: trucksRes.count || 0,
      };
    },
    enabled: !!shopId,
  });

  const { data: recentOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['septic-recent-orders', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('septic_service_orders')
        .select('id, order_number, service_type, status, scheduled_date, location_address, customer_id, septic_customers(first_name, last_name)')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });

  const quickActions = [
    { title: 'New Service Order', icon: Plus, href: '/septic/orders/new', color: 'from-stone-500 to-stone-700' },
    { title: 'View Routes', icon: Route, href: '/septic/routes', color: 'from-emerald-500 to-teal-600' },
    { title: 'Customers', icon: Users, href: '/septic/customers', color: 'from-blue-500 to-cyan-600' },
    { title: 'Inspections', icon: Shield, href: '/septic/inspections', color: 'from-green-600 to-emerald-700' },
  ];

  const statCards = [
    { title: 'Service Orders', value: stats?.orders || 0, icon: ClipboardList, color: 'text-stone-500' },
    { title: 'Septic Systems', value: stats?.tanks || 0, icon: Container, color: 'text-emerald-500' },
    { title: 'Completed Jobs', value: stats?.completions || 0, icon: Calendar, color: 'text-green-500' },
    { title: 'Pump Trucks', value: stats?.trucks || 0, icon: Truck, color: 'text-blue-500' },
  ];

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    in_progress: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            {moduleInfo?.displayName || 'Septic Services'}
          </h1>
          <p className="text-muted-foreground mt-1">Manage pumping, inspections, and tank maintenance</p>
        </div>
        <Button onClick={() => navigate('/septic/orders/new')} className="bg-gradient-to-r from-stone-600 to-stone-800 hover:from-stone-700 hover:to-stone-900">
          <Plus className="h-4 w-4 mr-2" />
          New Service Order
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 rounded-xl bg-muted">
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <Button key={action.title} variant="outline" className="h-auto flex-col gap-2 p-4" onClick={() => navigate(action.href)}>
              <div className={`p-2 rounded-lg bg-gradient-to-br ${action.color}`}>
                <action.icon className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs font-medium">{action.title}</span>
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Service Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : recentOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="mb-3">No service orders yet</p>
              <Button variant="outline" size="sm" onClick={() => navigate('/septic/orders/new')}>Create First Order</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order: any) => (
                <div key={order.id} className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate(`/septic/orders/${order.id}`)}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{order.order_number || 'Draft'}</span>
                      <Badge variant="secondary" className={statusColors[order.status] || ''}>{order.status?.replace('_', ' ')}</Badge>
                    </div>
                    {order.septic_customers && <p className="text-xs text-muted-foreground">{(order.septic_customers as any).first_name} {(order.septic_customers as any).last_name}</p>}
                  </div>
                  <div className="text-right text-xs text-muted-foreground space-y-1">
                    {order.scheduled_date && <p className="flex items-center gap-1 justify-end"><Calendar className="h-3 w-3" />{format(new Date(order.scheduled_date), 'MMM d')}</p>}
                    <p className="capitalize">{order.service_type?.replace('_', ' ')}</p>
                  </div>
                </div>
              ))}
              <Button variant="ghost" size="sm" className="w-full" onClick={() => navigate('/septic/orders')}>View All Orders</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
