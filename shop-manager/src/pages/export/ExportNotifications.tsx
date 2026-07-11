import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { Loader2, AlertTriangle, FileWarning, Clock, Package, Bell } from 'lucide-react';

interface Alert {
  id: string;
  type: 'low_stock' | 'expiring_doc' | 'overdue_payment' | 'shipment_delay';
  title: string;
  description: string;
  severity: 'warning' | 'critical';
  date?: string;
}

export default function ExportNotifications() {
  const { shopId } = useShopId();
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    if (!shopId) return;
    (async () => {
      setLoading(true);
      const newAlerts: Alert[] = [];

      // Low stock alerts
      const { data: inventory } = await supabase
        .from('export_inventory')
        .select('id, quantity, reorder_level, unit, export_products(name)')
        .eq('shop_id', shopId);
      (inventory || []).forEach(i => {
        if (Number(i.quantity) <= Number(i.reorder_level || 0)) {
          newAlerts.push({
            id: `low-${i.id}`,
            type: 'low_stock',
            title: `Low Stock: ${(i as any).export_products?.name || 'Unknown'}`,
            description: `${Number(i.quantity).toLocaleString()} ${i.unit} remaining (reorder level: ${i.reorder_level})`,
            severity: Number(i.quantity) === 0 ? 'critical' : 'warning',
          });
        }
      });

      // Expiring documents
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const { data: docs } = await supabase
        .from('export_customs_documents')
        .select('id, document_type, document_number, expiry_date')
        .eq('shop_id', shopId)
        .lte('expiry_date', thirtyDaysFromNow.toISOString())
        .gte('expiry_date', new Date().toISOString());
      (docs || []).forEach(d => {
        const daysLeft = Math.ceil((new Date(d.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        newAlerts.push({
          id: `doc-${d.id}`,
          type: 'expiring_doc',
          title: `Expiring: ${d.document_type?.replace(/_/g, ' ')}`,
          description: `${d.document_number || 'No number'} expires in ${daysLeft} days`,
          severity: daysLeft <= 7 ? 'critical' : 'warning',
          date: d.expiry_date,
        });
      });

      // Overdue invoices
      const { data: invoices } = await supabase
        .from('export_invoices')
        .select('id, invoice_number, total, due_date, export_customers(company_name)')
        .eq('shop_id', shopId)
        .eq('status', 'sent')
        .lt('due_date', new Date().toISOString());
      (invoices || []).forEach(inv => {
        const daysOverdue = Math.ceil((Date.now() - new Date(inv.due_date!).getTime()) / (1000 * 60 * 60 * 24));
        newAlerts.push({
          id: `inv-${inv.id}`,
          type: 'overdue_payment',
          title: `Overdue: ${inv.invoice_number}`,
          description: `$${Number(inv.total || 0).toLocaleString()} from ${(inv as any).export_customers?.company_name || 'Unknown'} — ${daysOverdue} days overdue`,
          severity: daysOverdue > 30 ? 'critical' : 'warning',
          date: inv.due_date || undefined,
        });
      });

      // Delayed shipments
      const { data: shipments } = await supabase
        .from('export_shipments')
        .select('id, shipment_number, eta, status')
        .eq('shop_id', shopId)
        .in('status', ['in_transit', 'pending'])
        .lt('eta', new Date().toISOString());
      (shipments || []).forEach(s => {
        const daysLate = Math.ceil((Date.now() - new Date(s.eta!).getTime()) / (1000 * 60 * 60 * 24));
        newAlerts.push({
          id: `ship-${s.id}`,
          type: 'shipment_delay',
          title: `Delayed: ${s.shipment_number || 'Shipment'}`,
          description: `Expected ${daysLate} days ago, still ${s.status}`,
          severity: daysLate > 7 ? 'critical' : 'warning',
        });
      });

      // Sort: critical first, then warning
      newAlerts.sort((a, b) => (a.severity === 'critical' ? -1 : 1) - (b.severity === 'critical' ? -1 : 1));
      setAlerts(newAlerts);
      setLoading(false);
    })();
  }, [shopId]);

  const iconMap = {
    low_stock: <Package className="h-4 w-4" />,
    expiring_doc: <FileWarning className="h-4 w-4" />,
    overdue_payment: <Clock className="h-4 w-4" />,
    shipment_delay: <AlertTriangle className="h-4 w-4" />,
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const critical = alerts.filter(a => a.severity === 'critical');
  const warnings = alerts.filter(a => a.severity === 'warning');

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Bell className="h-6 w-6 text-foreground" />
        <h1 className="text-2xl font-bold text-foreground">Alerts & Notifications</h1>
        {alerts.length > 0 && <Badge className="bg-red-500 text-white">{alerts.length}</Badge>}
      </div>

      {alerts.length === 0 ? (
        <Card><CardContent className="p-8 text-center">
          <div className="text-4xl mb-2">✅</div>
          <p className="text-lg font-semibold text-foreground">All Clear!</p>
          <p className="text-sm text-muted-foreground">No alerts or warnings at this time.</p>
        </CardContent></Card>
      ) : (
        <>
          {critical.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-red-500 uppercase tracking-wider">Critical ({critical.length})</h2>
              {critical.map(a => (
                <Card key={a.id} className="border-red-500/30 bg-red-500/5"><CardContent className="p-3 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-red-500/10 text-red-500 mt-0.5">{iconMap[a.type]}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.description}</p>
                  </div>
                </CardContent></Card>
              ))}
            </div>
          )}

          {warnings.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-amber-500 uppercase tracking-wider">Warnings ({warnings.length})</h2>
              {warnings.map(a => (
                <Card key={a.id} className="border-amber-500/30 bg-amber-500/5"><CardContent className="p-3 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 mt-0.5">{iconMap[a.type]}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.description}</p>
                  </div>
                </CardContent></Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
