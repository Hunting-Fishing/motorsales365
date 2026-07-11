import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { Loader2, TrendingUp, Globe, Package, Users, DollarSign, Ship, BarChart3 } from 'lucide-react';

export default function ExportReports() {
  const { shopId } = useShopId();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalShipments: 0,
    totalClients: 0,
    totalProducts: 0,
    avgOrderValue: 0,
    topClients: [] as any[],
    topProducts: [] as any[],
    recentPayments: [] as any[],
    ordersByStatus: {} as Record<string, number>,
    shipmentsByStatus: {} as Record<string, number>,
  });

  useEffect(() => {
    if (!shopId) return;
    (async () => {
      setLoading(true);
      const [ordersRes, shipmentsRes, clientsRes, productsRes, paymentsRes] = await Promise.all([
        supabase.from('export_orders').select('id, order_number, total, status, export_customers(company_name)').eq('shop_id', shopId),
        supabase.from('export_shipments').select('id, status').eq('shop_id', shopId),
        supabase.from('export_customers').select('id, company_name').eq('shop_id', shopId),
        supabase.from('export_products').select('id, name').eq('shop_id', shopId),
        supabase.from('export_payments').select('id, amount, currency, status, payment_date, export_customers(company_name)').eq('shop_id', shopId).order('payment_date', { ascending: false }).limit(10),
      ]);

      const orders = ordersRes.data || [];
      const totalRevenue = orders.reduce((s, o) => s + Number(o.total || 0), 0);
      const ordersByStatus: Record<string, number> = {};
      orders.forEach(o => { ordersByStatus[o.status] = (ordersByStatus[o.status] || 0) + 1; });

      const shipments = shipmentsRes.data || [];
      const shipmentsByStatus: Record<string, number> = {};
      shipments.forEach(s => { shipmentsByStatus[s.status] = (shipmentsByStatus[s.status] || 0) + 1; });

      // Top clients by order count
      const clientOrderCounts: Record<string, { name: string; count: number; revenue: number }> = {};
      orders.forEach(o => {
        const name = (o as any).export_customers?.company_name || 'Unknown';
        if (!clientOrderCounts[name]) clientOrderCounts[name] = { name, count: 0, revenue: 0 };
        clientOrderCounts[name].count++;
        clientOrderCounts[name].revenue += Number(o.total || 0);
      });
      const topClients = Object.values(clientOrderCounts).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

      setStats({
        totalRevenue,
        totalOrders: orders.length,
        totalShipments: shipments.length,
        totalClients: (clientsRes.data || []).length,
        totalProducts: (productsRes.data || []).length,
        avgOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
        topClients,
        topProducts: [],
        recentPayments: paymentsRes.data || [],
        ordersByStatus,
        shipmentsByStatus,
      });
      setLoading(false);
    })();
  }, [shopId]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>

      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-emerald-500/20 bg-emerald-500/5"><CardContent className="p-4">
          <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-500" /><span className="text-xs text-muted-foreground">Total Revenue</span></div>
          <p className="text-xl font-bold text-foreground">${stats.totalRevenue.toLocaleString()}</p>
        </CardContent></Card>
        <Card className="border-blue-500/20 bg-blue-500/5"><CardContent className="p-4">
          <div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-blue-500" /><span className="text-xs text-muted-foreground">Avg Order</span></div>
          <p className="text-xl font-bold text-foreground">${stats.avgOrderValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2"><Package className="h-4 w-4 text-amber-500" /><span className="text-xs text-muted-foreground">Orders</span></div>
          <p className="text-xl font-bold text-foreground">{stats.totalOrders}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2"><Ship className="h-4 w-4 text-indigo-500" /><span className="text-xs text-muted-foreground">Shipments</span></div>
          <p className="text-xl font-bold text-foreground">{stats.totalShipments}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2"><Users className="h-4 w-4 text-sky-500" /><span className="text-xs text-muted-foreground">Clients</span></div>
          <p className="text-xl font-bold text-foreground">{stats.totalClients}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2"><Package className="h-4 w-4 text-orange-500" /><span className="text-xs text-muted-foreground">Products</span></div>
          <p className="text-xl font-bold text-foreground">{stats.totalProducts}</p>
        </CardContent></Card>
      </div>

      {/* Order Status Breakdown */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Orders by Status</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {Object.entries(stats.ordersByStatus).length === 0 ? <p className="text-sm text-muted-foreground">No orders yet</p> :
            Object.entries(stats.ordersByStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground capitalize">{status}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" style={{ width: `${(count / stats.totalOrders) * 100}%` }} />
                  </div>
                  <span className="text-sm font-medium text-foreground w-8 text-right">{count}</span>
                </div>
              </div>
            ))
          }
        </CardContent>
      </Card>

      {/* Top Clients */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Top Clients by Revenue</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {stats.topClients.length === 0 ? <p className="text-sm text-muted-foreground">No client data yet</p> :
            stats.topClients.map((c, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                  <span className="text-sm text-foreground">{c.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-foreground">${c.revenue.toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground ml-2">({c.count} orders)</span>
                </div>
              </div>
            ))
          }
        </CardContent>
      </Card>

      {/* Recent Payments */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Recent Payments</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {stats.recentPayments.length === 0 ? <p className="text-sm text-muted-foreground">No payments yet</p> :
            stats.recentPayments.map(p => (
              <div key={p.id} className="flex items-center justify-between py-1 border-b border-border last:border-0">
                <div>
                  <p className="text-sm text-foreground">{(p as any).export_customers?.company_name || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground">{new Date(p.payment_date).toLocaleDateString()}</p>
                </div>
                <span className="text-sm font-bold text-foreground">{p.currency} {Number(p.amount).toLocaleString()}</span>
              </div>
            ))
          }
        </CardContent>
      </Card>
    </div>
  );
}
