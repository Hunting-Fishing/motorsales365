import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useExportTransportLegs } from '@/hooks/export/useExportTransportLegs';
import { Loader2, Plus, Route, Ship, Plane, Train, Truck, Pencil, Trash2, ArrowRight } from 'lucide-react';

const modes = ['sea', 'air', 'rail', 'road'];
const statuses = ['planned', 'in_transit', 'arrived', 'delayed', 'cancelled'];
const modeIcons: Record<string, React.ReactNode> = {
  sea: <Ship className="h-4 w-4" />, air: <Plane className="h-4 w-4" />,
  rail: <Train className="h-4 w-4" />, road: <Truck className="h-4 w-4" />,
};
const statusColors: Record<string, string> = {
  planned: 'bg-slate-100 text-slate-700', in_transit: 'bg-blue-100 text-blue-700',
  arrived: 'bg-emerald-100 text-emerald-700', delayed: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function ExportIntermodal() {
  const { legs, loading, create, update, remove } = useExportTransportLegs();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});

  const resetForm = () => { setForm({}); setEditId(null); };
  const openNew = () => { resetForm(); setOpen(true); };
  const openEdit = (l: any) => { setForm(l); setEditId(l.id); setOpen(true); };

  const handleSubmit = async () => {
    const ok = editId ? await update(editId, form) : await create(form);
    if (ok) { setOpen(false); resetForm(); }
  };

  // Group by shipment_reference
  const grouped = legs.reduce((acc: Record<string, any[]>, leg) => {
    const ref = leg.shipment_reference || 'Unassigned';
    if (!acc[ref]) acc[ref] = [];
    acc[ref].push(leg);
    return acc;
  }, {});

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Route className="h-6 w-6 text-foreground" />
          <h1 className="text-2xl font-bold text-foreground">Intermodal Transport</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />Add Leg</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editId ? 'Edit' : 'Add'} Transport Leg</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Shipment Ref</Label><Input value={form.shipment_reference || ''} onChange={e => setForm({...form, shipment_reference: e.target.value})} /></div>
                <div><Label>Leg #</Label><Input type="number" value={form.leg_number || 1} onChange={e => setForm({...form, leg_number: parseInt(e.target.value)})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Mode</Label>
                  <Select value={form.transport_mode || 'sea'} onValueChange={v => setForm({...form, transport_mode: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{modes.map(m => <SelectItem key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Status</Label>
                  <Select value={form.status || 'planned'} onValueChange={v => setForm({...form, status: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{statuses.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Carrier</Label><Input value={form.carrier_name || ''} onChange={e => setForm({...form, carrier_name: e.target.value})} /></div>
              <div><Label>Vessel / Vehicle</Label><Input value={form.vessel_or_vehicle || ''} onChange={e => setForm({...form, vessel_or_vehicle: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Origin *</Label><Input value={form.origin_location || ''} onChange={e => setForm({...form, origin_location: e.target.value})} /></div>
                <div><Label>Destination *</Label><Input value={form.destination_location || ''} onChange={e => setForm({...form, destination_location: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Departure</Label><Input type="datetime-local" value={form.departure_date?.slice(0,16) || ''} onChange={e => setForm({...form, departure_date: e.target.value})} /></div>
                <div><Label>Arrival</Label><Input type="datetime-local" value={form.arrival_date?.slice(0,16) || ''} onChange={e => setForm({...form, arrival_date: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Container #</Label><Input value={form.container_number || ''} onChange={e => setForm({...form, container_number: e.target.value})} /></div>
                <div><Label>Cost ($)</Label><Input type="number" value={form.cost || ''} onChange={e => setForm({...form, cost: e.target.value})} /></div>
              </div>
              <div><Label>Tracking #</Label><Input value={form.tracking_number || ''} onChange={e => setForm({...form, tracking_number: e.target.value})} /></div>
              <Button className="w-full" onClick={handleSubmit}>{editId ? 'Update' : 'Add'} Leg</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : Object.keys(grouped).length === 0 ? (
        <Card><CardContent className="p-8 text-center">
          <Route className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-lg font-semibold text-foreground">No Transport Legs</p>
          <p className="text-sm text-muted-foreground">Track multi-leg shipment journeys (sea → rail → truck).</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([ref, refLegs]) => (
            <Card key={ref}>
              <CardContent className="p-4">
                <p className="font-semibold text-foreground mb-3">Shipment: {ref}</p>
                <div className="space-y-2">
                  {(refLegs as any[]).sort((a, b) => a.leg_number - b.leg_number).map((leg: any, i: number) => (
                    <div key={leg.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                      <div className="p-1.5 rounded bg-muted">{modeIcons[leg.transport_mode] || <Route className="h-4 w-4" />}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 text-sm">
                          <span className="font-medium text-foreground">{leg.origin_location}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium text-foreground">{leg.destination_location}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{leg.carrier_name || 'No carrier'} {leg.vessel_or_vehicle ? `• ${leg.vessel_or_vehicle}` : ''}</p>
                      </div>
                      <Badge className={`text-xs ${statusColors[leg.status] || ''}`}>{(leg.status || '').replace(/_/g, ' ')}</Badge>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(leg)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(leg.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
