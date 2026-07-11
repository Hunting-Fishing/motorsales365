import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Navigation, MapPin, Truck, Clock, CheckCircle2, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { useToast } from '@/hooks/use-toast';

export default function ExportDriverApp() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [shipments, setShipments] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'deliveries' | 'routes'>('deliveries');

  useEffect(() => {
    if (!shopId) return;
    (async () => {
      setLoading(true);
      const [shipRes, routeRes] = await Promise.all([
        supabase.from('export_shipments').select('*, export_customers(company_name, phone, email)').eq('shop_id', shopId).in('status', ['pending', 'in_transit', 'loading']).order('etd', { ascending: true }).limit(50),
        (supabase as any).from('export_routes').select('*').eq('shop_id', shopId).eq('is_active', true).order('created_at', { ascending: false }).limit(20),
      ]);
      setShipments(shipRes.data || []);
      setRoutes(routeRes.data || []);
      setLoading(false);
    })();
  }, [shopId]);

  const updateShipmentStatus = async (id: string, status: string) => {
    await supabase.from('export_shipments').update({ status }).eq('id', id);
    toast({ title: `Status updated to ${status}` });
    setShipments(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const statusColor: Record<string, string> = {
    pending: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
    loading: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
    in_transit: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30',
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Navigation className="h-6 w-6 text-foreground" />
        <h1 className="text-2xl font-bold text-foreground">Driver App</h1>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2">
        <Button variant={activeTab === 'deliveries' ? 'default' : 'outline'} size="sm" onClick={() => setActiveTab('deliveries')}>
          <Truck className="h-4 w-4 mr-1" />Deliveries ({shipments.length})
        </Button>
        <Button variant={activeTab === 'routes' ? 'default' : 'outline'} size="sm" onClick={() => setActiveTab('routes')}>
          <MapPin className="h-4 w-4 mr-1" />Routes ({routes.length})
        </Button>
      </div>

      {activeTab === 'deliveries' && (
        <div className="space-y-3">
          {shipments.length === 0 ? (
            <Card><CardContent className="p-8 text-center">
              <Truck className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No active deliveries assigned.</p>
            </CardContent></Card>
          ) : shipments.map(s => (
            <Card key={s.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{s.shipment_number || s.id.slice(0, 8)}</p>
                    <p className="text-sm text-muted-foreground">{(s as any).export_customers?.company_name || 'Unknown client'}</p>
                  </div>
                  <Badge variant="outline" className={statusColor[s.status] || ''}>{s.status}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {s.origin_port && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-3 w-3" />From: {s.origin_port}
                    </div>
                  )}
                  {s.destination_port && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-3 w-3" />To: {s.destination_port}
                    </div>
                  )}
                  {s.etd && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />ETD: {new Date(s.etd).toLocaleDateString()}
                    </div>
                  )}
                  {s.eta && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />ETA: {new Date(s.eta).toLocaleDateString()}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {s.status === 'pending' && (
                    <Button size="sm" className="flex-1" onClick={() => updateShipmentStatus(s.id, 'loading')}>
                      Start Loading
                    </Button>
                  )}
                  {s.status === 'loading' && (
                    <Button size="sm" className="flex-1" onClick={() => updateShipmentStatus(s.id, 'in_transit')}>
                      Depart
                    </Button>
                  )}
                  {s.status === 'in_transit' && (
                    <Button size="sm" className="flex-1" onClick={() => updateShipmentStatus(s.id, 'delivered')}>
                      <CheckCircle2 className="h-4 w-4 mr-1" />Mark Delivered
                    </Button>
                  )}
                  {(s as any).export_customers?.phone && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={`tel:${(s as any).export_customers.phone}`}><Phone className="h-4 w-4" /></a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'routes' && (
        <div className="space-y-3">
          {routes.length === 0 ? (
            <Card><CardContent className="p-8 text-center">
              <MapPin className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No active routes available.</p>
            </CardContent></Card>
          ) : routes.map(r => (
            <Card key={r.id}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Navigation className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm">{r.route_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.origin} → {r.destination}
                    {r.distance_km && ` • ${r.distance_km} km`}
                    {r.estimated_hours && ` • ~${r.estimated_hours}h`}
                  </p>
                </div>
                <Badge variant={r.is_active ? 'default' : 'outline'}>{r.is_active ? 'Active' : 'Inactive'}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
