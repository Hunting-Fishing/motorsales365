import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, ClipboardList, Ship, Package, Car, Users, DollarSign, Globe, Warehouse,
  AlertTriangle, Clock, FileText, TrendingUp, ClipboardCheck, Lock, Factory
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function ExportDashboard() {
  const { shopId, loading: shopLoading } = useShopId();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    orders: 0, shipments: 0, customers: 0, vehicles: 0, products: 0,
    invoices: 0, warehouses: 0, requests: 0, suppliers: 0, reservations: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [pendingInvoices, setPendingInvoices] = useState<any[]>([]);
  const [expiringDocs, setExpiringDocs] = useState<any[]>([]);

  useEffect(() => {
    if (!shopId) return;
    async function fetchAll() {
      setLoading(true);
      const thirtyDays = new Date(Date.now() + 30 * 86400000).toISOString();

      const [
        ordersR, shipmentsR, customersR, vehiclesR, productsR, invoicesR, warehousesR,
        requestsR, suppliersR, reservationsR,
        recentOrd, recentReq, lowStockR, pendingInvR, expiringR
      ] = await Promise.all([
        supabase.from('export_orders').select('id', { count: 'exact', head: true }).eq('shop_id', shopId),
        supabase.from('export_shipments').select('id', { count: 'exact', head: true }).eq('shop_id', shopId),
        supabase.from('export_customers').select('id', { count: 'exact', head: true }).eq('shop_id', shopId),
        supabase.from('export_vehicles').select('id', { count: 'exact', head: true }).eq('shop_id', shopId),
        supabase.from('export_products').select('id', { count: 'exact', head: true }).eq('shop_id', shopId),
        supabase.from('export_invoices').select('id', { count: 'exact', head: true }).eq('shop_id', shopId),
        supabase.from('export_warehouses').select('id', { count: 'exact', head: true }).eq('shop_id', shopId),
        supabase.from('export_requests').select('id', { count: 'exact', head: true }).eq('shop_id', shopId),
        supabase.from('export_suppliers').select('id', { count: 'exact', head: true }).eq('shop_id', shopId),
        supabase.from('export_inventory_reservations').select('id', { count: 'exact', head: true }).eq('shop_id', shopId).eq('status', 'reserved'),
        // Recent data
        supabase.from('export_orders').select('*, export_customers(company_name)').eq('shop_id', shopId).order('created_at', { ascending: false }).limit(5),
        supabase.from('export_requests').select('*, export_customers(company_name)').eq('shop_id', shopId).order('created_at', { ascending: false }).limit(5),
        // Low stock
        supabase.from('export_inventory').select('*, export_products(name)').eq('shop_id', shopId).not('reorder_level', 'is', null).limit(50),
        // Pending invoices
        supabase.from('export_invoices').select('*, export_customers(company_name)').eq('shop_id', shopId).in('status', ['draft', 'sent', 'overdue']).order('due_date').limit(5),
        // Expiring docs
        supabase.from('export_documents').select('title, expiry_date, document_type').eq('shop_id', shopId).not('expiry_date', 'is', null).lte('expiry_date', thirtyDays).order('expiry_date').limit(5),
      ]);

      setStats({
        orders: ordersR.count || 0, shipments: shipmentsR.count || 0, customers: customersR.count || 0,
        vehicles: vehiclesR.count || 0, products: productsR.count || 0, invoices: invoicesR.count || 0,
        warehouses: warehousesR.count || 0, requests: requestsR.count || 0, suppliers: suppliersR.count || 0,
        reservations: reservationsR.count || 0,
      });
      setRecentOrders(recentOrd.data || []);
      setRecentRequests(recentReq.data || []);
      setLowStock((lowStockR.data || []).filter((i: any) => Number(i.quantity) <= Number(i.reorder_level)));
      setPendingInvoices(pendingInvR.data || []);
      setExpiringDocs(expiringR.data || []);
      setLoading(false);
    }
    fetchAll();
  }, [shopId]);

  if (shopLoading || loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  const kpis = [
    { title: 'Orders', value: stats.orders, icon: ClipboardList, color: 'from-blue-500 to-cyan-500', href: '/export/orders' },
    { title: 'Requests', value: stats.requests, icon: ClipboardCheck, color: 'from-orange-500 to-amber-500', href: '/export/requests' },
    { title: 'Shipments', value: stats.shipments, icon: Ship, color: 'from-indigo-500 to-violet-600', href: '/export/shipments' },
    { title: 'Clients', value: stats.customers, icon: Users, color: 'from-sky-500 to-blue-600', href: '/export/customers' },
    { title: 'Products', value: stats.products, icon: Package, color: 'from-amber-500 to-orange-600', href: '/export/products' },
    { title: 'Suppliers', value: stats.suppliers, icon: Factory, color: 'from-orange-500 to-red-500', href: '/export/suppliers' },
    { title: 'Invoices', value: stats.invoices, icon: DollarSign, color: 'from-emerald-500 to-green-600', href: '/export/invoices' },
    { title: 'Reserved', value: stats.reservations, icon: Lock, color: 'from-amber-500 to-yellow-600', href: '/export/reservations' },
    { title: 'Warehouses', value: stats.warehouses, icon: Warehouse, color: 'from-violet-500 to-purple-600', href: '/export/warehouses' },
    { title: 'Vehicles', value: stats.vehicles, icon: Car, color: 'from-red-500 to-rose-600', href: '/export/vehicles' },
  ];

  const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700', reviewing: 'bg-blue-100 text-blue-700',
    quoted: 'bg-purple-100 text-purple-700', approved: 'bg-green-100 text-green-700',
    confirmed: 'bg-amber-100 text-amber-700', shipped: 'bg-blue-100 text-blue-700',
    delivered: 'bg-green-100 text-green-700', draft: 'bg-gray-100 text-gray-700',
    sent: 'bg-blue-100 text-blue-700', overdue: 'bg-red-100 text-red-700',
    in_progress: 'bg-sky-100 text-sky-700',
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
          <Globe className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Export Dashboard</h1>
          <p className="text-sm text-muted-foreground">Dehydrated Foods, Salt & Vehicle Exports</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {kpis.map((kpi) => (
          <Card key={kpi.title} className="cursor-pointer active:scale-[0.97] transition-transform" onClick={() => navigate(kpi.href)}>
            <CardContent className="p-3 text-center">
              <div className={`h-8 w-8 mx-auto mb-1 rounded-lg bg-gradient-to-br ${kpi.color} flex items-center justify-center`}>
                <kpi.icon className="h-4 w-4 text-white" />
              </div>
              <p className="text-xl font-bold text-foreground">{kpi.value}</p>
              <p className="text-[10px] text-muted-foreground">{kpi.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerts Row */}
      {(lowStock.length > 0 || expiringDocs.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lowStock.length > 0 && (
            <Card className="border-amber-200">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Low Stock ({lowStock.length})</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {lowStock.slice(0, 4).map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <span className="text-foreground truncate">{(item as any).export_products?.name || 'Product'}</span>
                    <span className="text-amber-600 font-semibold">{Number(item.quantity).toLocaleString()} {item.unit}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          {expiringDocs.length > 0 && (
            <Card className="border-red-200">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4 text-red-500" /> Expiring Documents ({expiringDocs.length})</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {expiringDocs.map((doc: any) => (
                  <div key={doc.title} className="flex items-center justify-between text-sm">
                    <span className="text-foreground truncate">{doc.title}</span>
                    <span className="text-red-600 text-xs">{new Date(doc.expiry_date).toLocaleDateString()}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Recent Orders</CardTitle></CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? <p className="text-muted-foreground text-sm">No orders yet</p> : (
              <div className="space-y-2">
                {recentOrders.map((order: any) => (
                  <div key={order.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium text-foreground text-sm">{order.order_number}</p>
                      <p className="text-[10px] text-muted-foreground">{(order as any).export_customers?.company_name || '—'} • {order.destination_country}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'}`}>{order.status}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Recent Requests</CardTitle></CardHeader>
          <CardContent>
            {recentRequests.length === 0 ? <p className="text-muted-foreground text-sm">No requests yet</p> : (
              <div className="space-y-2">
                {recentRequests.map((req: any) => (
                  <div key={req.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium text-foreground text-sm">{req.request_number}</p>
                      <p className="text-[10px] text-muted-foreground">{(req as any).export_customers?.company_name || '—'} • {req.request_type?.replace('_', ' ')}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_COLORS[req.status] || 'bg-gray-100 text-gray-700'}`}>{req.status}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending Invoices */}
      {pendingInvoices.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><DollarSign className="h-4 w-4 text-emerald-500" /> Pending Invoices</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingInvoices.map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium text-foreground text-sm">{inv.invoice_number}</p>
                    <p className="text-[10px] text-muted-foreground">{(inv as any).export_customers?.company_name || '—'} • Due: {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{inv.currency || 'USD'} {Number(inv.total || 0).toLocaleString()}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_COLORS[inv.status] || 'bg-gray-100 text-gray-700'}`}>{inv.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
