import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Search, CheckCircle2, Ship, Package, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';

export default function ExportCompletions() {
  const { shopId } = useShopId();
  const [loading, setLoading] = useState(true);
  const [completedOrders, setCompletedOrders] = useState<any[]>([]);
  const [completedShipments, setCompletedShipments] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({ totalValue: 0, orderCount: 0, shipmentCount: 0 });

  useEffect(() => {
    if (!shopId) return;
    (async () => {
      setLoading(true);
      const [ordersRes, shipmentsRes] = await Promise.all([
        supabase.from('export_orders').select('*, export_customers(company_name)').eq('shop_id', shopId).in('status', ['delivered', 'completed']).order('updated_at', { ascending: false }).limit(100),
        supabase.from('export_shipments').select('*, export_customers(company_name)').eq('shop_id', shopId).in('status', ['delivered', 'completed']).order('updated_at', { ascending: false }).limit(100),
      ]);
      const orders = ordersRes.data || [];
      const shipments = shipmentsRes.data || [];
      setCompletedOrders(orders);
      setCompletedShipments(shipments);
      setStats({
        totalValue: orders.reduce((s, o) => s + Number(o.total || 0), 0),
        orderCount: orders.length,
        shipmentCount: shipments.length,
      });
      setLoading(false);
    })();
  }, [shopId]);

  const filteredOrders = completedOrders.filter(o =>
    (o.order_number || '').toLowerCase().includes(search.toLowerCase()) ||
    ((o as any).export_customers?.company_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const filteredShipments = completedShipments.filter(s =>
    (s.shipment_number || '').toLowerCase().includes(search.toLowerCase()) ||
    ((s as any).export_customers?.company_name || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-6 w-6 text-emerald-500" />
        <h1 className="text-2xl font-bold text-foreground">Completed Shipments</h1>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="border-emerald-500/20 bg-emerald-500/5"><CardContent className="p-3 text-center">
          <Package className="h-4 w-4 mx-auto text-emerald-500 mb-1" />
          <p className="text-lg font-bold text-foreground">{stats.orderCount}</p>
          <p className="text-[10px] text-muted-foreground">Orders</p>
        </CardContent></Card>
        <Card className="border-blue-500/20 bg-blue-500/5"><CardContent className="p-3 text-center">
          <Ship className="h-4 w-4 mx-auto text-blue-500 mb-1" />
          <p className="text-lg font-bold text-foreground">{stats.shipmentCount}</p>
          <p className="text-[10px] text-muted-foreground">Shipments</p>
        </CardContent></Card>
        <Card className="border-amber-500/20 bg-amber-500/5"><CardContent className="p-3 text-center">
          <DollarSign className="h-4 w-4 mx-auto text-amber-500 mb-1" />
          <p className="text-lg font-bold text-foreground">${stats.totalValue.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">Total Value</p>
        </CardContent></Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search completed..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {filteredOrders.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Completed Orders ({filteredOrders.length})</h2>
          {filteredOrders.map(o => (
            <Card key={o.id}><CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10"><Package className="h-4 w-4 text-emerald-500" /></div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm truncate">{o.order_number}</p>
                <p className="text-xs text-muted-foreground">{(o as any).export_customers?.company_name || 'Unknown'}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-foreground">${Number(o.total || 0).toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">{new Date(o.updated_at).toLocaleDateString()}</p>
              </div>
              <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 text-[10px]">Done</Badge>
            </CardContent></Card>
          ))}
        </div>
      )}

      {filteredShipments.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Completed Shipments ({filteredShipments.length})</h2>
          {filteredShipments.map(s => (
            <Card key={s.id}><CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10"><Ship className="h-4 w-4 text-blue-500" /></div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm truncate">{s.shipment_number || s.id.slice(0, 8)}</p>
                <p className="text-xs text-muted-foreground">{(s as any).export_customers?.company_name || 'Unknown'} • {s.destination_port || s.destination_country || '—'}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground">{new Date(s.updated_at).toLocaleDateString()}</p>
              </div>
              <Badge variant="outline" className="text-blue-500 border-blue-500/30 text-[10px]">Delivered</Badge>
            </CardContent></Card>
          ))}
        </div>
      )}

      {filteredOrders.length === 0 && filteredShipments.length === 0 && (
        <Card><CardContent className="p-8 text-center">
          <CheckCircle2 className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No completed orders or shipments found.</p>
        </CardContent></Card>
      )}
    </div>
  );
}
