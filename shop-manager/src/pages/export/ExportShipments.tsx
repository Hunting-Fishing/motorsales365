import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Loader2, Ship } from 'lucide-react';

export default function ExportShipments() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ shipment_number: '', container_number: '', bill_of_lading: '', vessel_name: '', shipping_line: '', port_of_origin: '', port_of_destination: '', etd: '', eta: '', weight_kg: '', notes: '' });

  const fetchData = async () => { if (!shopId) return; setLoading(true); const { data } = await supabase.from('export_shipments').select('*').eq('shop_id', shopId).order('created_at', { ascending: false }); setShipments(data || []); setLoading(false); };
  useEffect(() => { fetchData(); }, [shopId]);

  const handleCreate = async () => {
    if (!shopId || !form.shipment_number) return;
    const { error } = await supabase.from('export_shipments').insert({ ...form, shop_id: shopId, weight_kg: form.weight_kg ? Number(form.weight_kg) : null, etd: form.etd || null, eta: form.eta || null });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Shipment created' }); setDialogOpen(false); fetchData();
  };

  const filtered = shipments.filter(s => s.shipment_number.toLowerCase().includes(search.toLowerCase()) || s.container_number?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Shipments</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> New Shipment</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Shipment</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Shipment Number *</Label><Input value={form.shipment_number} onChange={e => setForm(p => ({ ...p, shipment_number: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Container #</Label><Input value={form.container_number} onChange={e => setForm(p => ({ ...p, container_number: e.target.value }))} /></div>
                <div><Label>Bill of Lading</Label><Input value={form.bill_of_lading} onChange={e => setForm(p => ({ ...p, bill_of_lading: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Vessel Name</Label><Input value={form.vessel_name} onChange={e => setForm(p => ({ ...p, vessel_name: e.target.value }))} /></div>
                <div><Label>Shipping Line</Label><Input value={form.shipping_line} onChange={e => setForm(p => ({ ...p, shipping_line: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Port of Origin</Label><Input value={form.port_of_origin} onChange={e => setForm(p => ({ ...p, port_of_origin: e.target.value }))} /></div>
                <div><Label>Port of Destination</Label><Input value={form.port_of_destination} onChange={e => setForm(p => ({ ...p, port_of_destination: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>ETD</Label><Input type="date" value={form.etd} onChange={e => setForm(p => ({ ...p, etd: e.target.value }))} /></div>
                <div><Label>ETA</Label><Input type="date" value={form.eta} onChange={e => setForm(p => ({ ...p, eta: e.target.value }))} /></div>
              </div>
              <div><Label>Weight (kg)</Label><Input type="number" value={form.weight_kg} onChange={e => setForm(p => ({ ...p, weight_kg: e.target.value }))} /></div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
              <Button onClick={handleCreate} className="w-full">Create Shipment</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search shipments..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No shipments found</p> : (
        <div className="space-y-3">
          {filtered.map(s => (
            <Card key={s.id}><CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center"><Ship className="h-6 w-6 text-white" /></div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">{s.shipment_number}</p>
                <p className="text-sm text-muted-foreground">{s.vessel_name || 'No vessel'} • {s.shipping_line || 'N/A'}</p>
                <p className="text-xs text-muted-foreground">{s.port_of_origin || '?'} → {s.port_of_destination || '?'} • Container: {s.container_number || 'N/A'}</p>
              </div>
              <div className="text-right">
                <Badge variant={s.status === 'in_transit' ? 'default' : s.status === 'delivered' ? 'secondary' : 'outline'}>{s.status}</Badge>
                {s.eta && <p className="text-xs text-muted-foreground mt-1">ETA: {new Date(s.eta).toLocaleDateString()}</p>}
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}
