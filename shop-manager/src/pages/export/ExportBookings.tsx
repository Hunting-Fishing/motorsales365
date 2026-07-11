import React, { useState } from 'react';
import { useExportBookings } from '@/hooks/export/useExportBookings';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Ship, Trash2, Anchor } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30',
  confirmed: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  loaded: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/30',
  in_transit: 'bg-purple-500/10 text-purple-700 border-purple-500/30',
  arrived: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
  completed: 'bg-green-500/10 text-green-700 border-green-500/30',
};

export default function ExportBookings() {
  const { bookings, loading, create, update, remove } = useExportBookings();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({ transport_mode: 'ocean' });

  const handleSubmit = async () => {
    const ok = await create({ ...form, booking_number: form.booking_number || `BK-${Date.now().toString(36).toUpperCase()}` });
    if (ok) { setOpen(false); setForm({ transport_mode: 'ocean' }); }
  };

  if (loading) return <div className="p-4 space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Bookings & Vessels</h1>
          <p className="text-sm text-muted-foreground">Freight booking and vessel scheduling</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Booking</Button></DialogTrigger>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Booking</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Carrier</Label><Input value={form.carrier_name || ''} onChange={e => setForm(f => ({ ...f, carrier_name: e.target.value }))} /></div>
              <div><Label>Vessel Name</Label><Input value={form.vessel_name || ''} onChange={e => setForm(f => ({ ...f, vessel_name: e.target.value }))} /></div>
              <div><Label>Transport Mode</Label>
                <Select value={form.transport_mode} onValueChange={v => setForm(f => ({ ...f, transport_mode: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ocean">Ocean</SelectItem>
                    <SelectItem value="air">Air</SelectItem>
                    <SelectItem value="road">Road</SelectItem>
                    <SelectItem value="rail">Rail</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Origin Port</Label><Input value={form.origin_port || ''} onChange={e => setForm(f => ({ ...f, origin_port: e.target.value }))} /></div>
                <div><Label>Destination Port</Label><Input value={form.destination_port || ''} onChange={e => setForm(f => ({ ...f, destination_port: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>ETD</Label><Input type="date" value={form.etd || ''} onChange={e => setForm(f => ({ ...f, etd: e.target.value }))} /></div>
                <div><Label>ETA</Label><Input type="date" value={form.eta || ''} onChange={e => setForm(f => ({ ...f, eta: e.target.value }))} /></div>
              </div>
              <div><Label>Container Type</Label><Input value={form.container_type || ''} onChange={e => setForm(f => ({ ...f, container_type: e.target.value }))} placeholder="20ft, 40ft, Reefer" /></div>
              <div><Label>Freight Cost</Label><Input type="number" value={form.freight_cost || ''} onChange={e => setForm(f => ({ ...f, freight_cost: e.target.value }))} /></div>
              <div><Label>Notes</Label><Textarea value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
              <Button onClick={handleSubmit} className="w-full">Create Booking</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {bookings.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><Anchor className="h-10 w-10 mx-auto mb-2 opacity-40" />No bookings yet</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {bookings.map(b => (
            <Card key={b.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm truncate">{b.booking_number}</span>
                      <Badge variant="outline" className={statusColors[b.status] || ''}>{b.status}</Badge>
                      <Badge variant="secondary" className="text-xs">{b.transport_mode}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{b.carrier_name} {b.vessel_name ? `· ${b.vessel_name}` : ''}</p>
                    <p className="text-xs text-muted-foreground">{b.origin_port} → {b.destination_port}</p>
                    {b.etd && <p className="text-xs text-muted-foreground mt-1">ETD: {b.etd} · ETA: {b.eta || 'TBD'}</p>}
                    {Number(b.demurrage_days) > 0 && <p className="text-xs text-destructive">Demurrage: {b.demurrage_days}d · ${Number(b.demurrage_cost).toFixed(2)}</p>}
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => remove(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
