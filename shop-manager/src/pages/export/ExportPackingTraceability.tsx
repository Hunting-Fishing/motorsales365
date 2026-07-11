import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useExportContainerPacking } from '@/hooks/export/useExportContainerPacking';
import { useExportTraceability } from '@/hooks/export/useExportTraceability';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2, Package, QrCode, Barcode, MapPin, Search, ArrowRight, Truck, Warehouse, Ship, Users, CheckCircle2 } from 'lucide-react';

const EVENT_ICONS: Record<string, React.ReactNode> = {
  received: <Warehouse className="h-4 w-4" />,
  stored: <Warehouse className="h-4 w-4" />,
  picked: <Package className="h-4 w-4" />,
  packed: <Package className="h-4 w-4" />,
  loaded: <Truck className="h-4 w-4" />,
  shipped: <Ship className="h-4 w-4" />,
  delivered: <Users className="h-4 w-4" />,
  inspected: <CheckCircle2 className="h-4 w-4" />,
};

const EVENT_COLORS: Record<string, string> = {
  received: 'bg-blue-100 text-blue-700',
  stored: 'bg-violet-100 text-violet-700',
  picked: 'bg-amber-100 text-amber-700',
  packed: 'bg-orange-100 text-orange-700',
  loaded: 'bg-cyan-100 text-cyan-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700',
  inspected: 'bg-emerald-100 text-emerald-700',
};

const PACKING_EMPTY = {
  container_number: '', seal_number: '', container_type: '20ft',
  product_id: '', lot_number: '', batch_number: '',
  quantity: 0, unit: 'kg', packages_count: 0,
  gross_weight_kg: 0, net_weight_kg: 0, volume_cbm: 0,
  barcode: '', qr_code_data: '', position_in_container: '', packed_by: '',
};

export default function ExportPackingTraceability() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const { packingItems, loading: loadingPacking, create: createPacking } = useExportContainerPacking();
  const { logs, loading: loadingTrace } = useExportTraceability();
  const [tab, setTab] = useState('packing');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ ...PACKING_EMPTY });
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!shopId) return;
    supabase.from('export_products').select('id, name').eq('shop_id', shopId).then(({ data }) => setProducts(data || []));
  }, [shopId]);

  const handleCreate = async () => {
    if (!form.container_number) return;
    const ok = await createPacking(form);
    if (ok) { setDialogOpen(false); setForm({ ...PACKING_EMPTY }); }
  };

  // Group packing by container
  const containers = packingItems.reduce((acc: Record<string, any[]>, item) => {
    const key = item.container_number || 'Unassigned';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const filteredLogs = logs.filter(l =>
    l.lot_number?.toLowerCase().includes(search.toLowerCase()) ||
    l.batch_number?.toLowerCase().includes(search.toLowerCase()) ||
    l.barcode?.toLowerCase().includes(search.toLowerCase()) ||
    l.event_type?.toLowerCase().includes(search.toLowerCase()) ||
    (l as any).export_products?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Packing & Traceability</h1>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="packing"><Package className="h-4 w-4 mr-1" /> Packing Lists</TabsTrigger>
          <TabsTrigger value="trace"><MapPin className="h-4 w-4 mr-1" /> Traceability</TabsTrigger>
        </TabsList>

        {/* ──── PACKING LISTS ──── */}
        <TabsContent value="packing" className="space-y-4 mt-3">
          <div className="flex justify-end">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Item</Button></DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Add Packing Item</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Container # *</Label><Input value={form.container_number} onChange={e => setForm(p => ({ ...p, container_number: e.target.value }))} placeholder="MSKU1234567" /></div>
                    <div><Label>Seal #</Label><Input value={form.seal_number} onChange={e => setForm(p => ({ ...p, seal_number: e.target.value }))} /></div>
                  </div>
                  <div><Label>Container Type</Label>
                    <Select value={form.container_type} onValueChange={v => setForm(p => ({ ...p, container_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{['20ft','40ft','40ft HC','Reefer','Flat Rack','Open Top'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Product</Label>
                    <Select value={form.product_id} onValueChange={v => setForm(p => ({ ...p, product_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Lot #</Label><Input value={form.lot_number} onChange={e => setForm(p => ({ ...p, lot_number: e.target.value }))} /></div>
                    <div><Label>Batch #</Label><Input value={form.batch_number} onChange={e => setForm(p => ({ ...p, batch_number: e.target.value }))} /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><Label>Quantity</Label><Input type="number" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: Number(e.target.value) }))} /></div>
                    <div><Label>Unit</Label>
                      <Select value={form.unit} onValueChange={v => setForm(p => ({ ...p, unit: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{['kg','lbs','tons','bags','boxes','pallets'].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Packages</Label><Input type="number" value={form.packages_count} onChange={e => setForm(p => ({ ...p, packages_count: Number(e.target.value) }))} /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><Label>Gross (kg)</Label><Input type="number" step="0.01" value={form.gross_weight_kg} onChange={e => setForm(p => ({ ...p, gross_weight_kg: Number(e.target.value) }))} /></div>
                    <div><Label>Net (kg)</Label><Input type="number" step="0.01" value={form.net_weight_kg} onChange={e => setForm(p => ({ ...p, net_weight_kg: Number(e.target.value) }))} /></div>
                    <div><Label>CBM</Label><Input type="number" step="0.01" value={form.volume_cbm} onChange={e => setForm(p => ({ ...p, volume_cbm: Number(e.target.value) }))} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Barcode</Label><Input value={form.barcode} onChange={e => setForm(p => ({ ...p, barcode: e.target.value }))} /></div>
                    <div><Label>Position</Label><Input placeholder="e.g. Front-Left" value={form.position_in_container} onChange={e => setForm(p => ({ ...p, position_in_container: e.target.value }))} /></div>
                  </div>
                  <div><Label>Packed By</Label><Input value={form.packed_by} onChange={e => setForm(p => ({ ...p, packed_by: e.target.value }))} /></div>
                  <Button onClick={handleCreate} className="w-full">Add to Packing List</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {loadingPacking ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : Object.keys(containers).length === 0 ? <p className="text-center text-muted-foreground py-8">No packing records. Add items to containers.</p> : (
            <div className="space-y-4">
              {Object.entries(containers).map(([containerNum, items]: [string, any[]]) => {
                const totalGross = items.reduce((s: number, i: any) => s + Number(i.gross_weight_kg || 0), 0);
                const totalNet = items.reduce((s: number, i: any) => s + Number(i.net_weight_kg || 0), 0);
                const totalCbm = items.reduce((s: number, i: any) => s + Number(i.volume_cbm || 0), 0);
                return (
                  <Card key={containerNum}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-foreground flex items-center gap-2">
                            <Package className="h-4 w-4 text-primary" /> {containerNum}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {items[0]?.container_type || '20ft'} • Seal: {items[0]?.seal_number || '—'} • {items.length} items
                          </p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <p>Gross: {totalGross.toFixed(1)} kg</p>
                          <p>Net: {totalNet.toFixed(1)} kg • {totalCbm.toFixed(2)} CBM</p>
                        </div>
                      </div>
                      <div className="divide-y divide-border">
                        {items.map((item: any) => (
                          <div key={item.id} className="py-2 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-foreground">{(item as any).export_products?.name || 'Product'}</p>
                              <p className="text-xs text-muted-foreground">
                                Lot: {item.lot_number || '—'} • Batch: {item.batch_number || '—'} • {Number(item.quantity).toLocaleString()} {item.unit}
                              </p>
                              {item.barcode && <p className="text-xs text-muted-foreground flex items-center gap-1"><Barcode className="h-3 w-3" /> {item.barcode}</p>}
                            </div>
                            <div className="text-right text-xs text-muted-foreground">
                              <p>{Number(item.packages_count || 0)} pkgs</p>
                              {item.position_in_container && <p>{item.position_in_container}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ──── TRACEABILITY ──── */}
        <TabsContent value="trace" className="space-y-4 mt-3">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search by lot, batch, barcode, product..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>

          {loadingTrace ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : filteredLogs.length === 0 ? <p className="text-center text-muted-foreground py-8">No traceability records yet. Events are logged as products move through the supply chain.</p> : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />
              <div className="space-y-3">
                {filteredLogs.map((log: any, i: number) => (
                  <div key={log.id} className="relative flex items-start gap-3 pl-2">
                    <div className={`relative z-10 h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${EVENT_COLORS[log.event_type] || 'bg-gray-100 text-gray-700'}`}>
                      {EVENT_ICONS[log.event_type] || <MapPin className="h-4 w-4" />}
                    </div>
                    <Card className="flex-1"><CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-foreground text-sm capitalize">{log.event_type}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(log.event_at).toLocaleString()}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">{log.export_products?.name || 'Unknown product'}</p>
                      <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                        {log.lot_number && <span>Lot: {log.lot_number}</span>}
                        {log.batch_number && <span>• Batch: {log.batch_number}</span>}
                        {log.quantity && <span>• {Number(log.quantity).toLocaleString()} {log.unit || ''}</span>}
                        {log.location && <span>• 📍 {log.location}</span>}
                        {log.export_warehouses?.name && <span>• 🏭 {log.export_warehouses.name}</span>}
                        {log.export_customers?.company_name && <span>• 👤 {log.export_customers.company_name}</span>}
                      </div>
                      {log.quality_status && <Badge variant="outline" className="text-[10px] mt-1">{log.quality_status}</Badge>}
                      {log.notes && <p className="text-xs text-muted-foreground mt-1">{log.notes}</p>}
                    </CardContent></Card>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
