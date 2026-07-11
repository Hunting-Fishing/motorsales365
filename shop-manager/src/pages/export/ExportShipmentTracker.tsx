import React, { useState } from 'react';
import { useExportShipmentTracker } from '@/hooks/export/useExportShipmentTracker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, MapPin, Ship, Loader2, Trash2, Eye } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const statusColors: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  in_transit: 'bg-blue-500/10 text-blue-700',
  at_port: 'bg-amber-500/10 text-amber-700',
  customs: 'bg-purple-500/10 text-purple-700',
  delivered: 'bg-emerald-500/10 text-emerald-700',
  delayed: 'bg-destructive/10 text-destructive',
};

export default function ExportShipmentTracker() {
  const { trackers, loading, create, update, remove } = useExportShipmentTracker();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});

  const handleSubmit = async () => {
    const ok = await create(form);
    if (ok) { setOpen(false); setForm({}); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Shipment Tracker</h1>
          <p className="text-muted-foreground">Real-time consolidated shipment tracking</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />Add Tracker</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>New Shipment Tracker</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Origin Port</Label><Input value={form.origin_port || ''} onChange={e => setForm({...form, origin_port: e.target.value})} /></div>
                <div><Label>Destination Port</Label><Input value={form.destination_port || ''} onChange={e => setForm({...form, destination_port: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Vessel Name</Label><Input value={form.vessel_name || ''} onChange={e => setForm({...form, vessel_name: e.target.value})} /></div>
                <div><Label>Container #</Label><Input value={form.container_number || ''} onChange={e => setForm({...form, container_number: e.target.value})} /></div>
              </div>
              <div><Label>Current Location</Label><Input value={form.current_location || ''} onChange={e => setForm({...form, current_location: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>ETD</Label><Input type="datetime-local" value={form.etd || ''} onChange={e => setForm({...form, etd: e.target.value})} /></div>
                <div><Label>ETA</Label><Input type="datetime-local" value={form.eta || ''} onChange={e => setForm({...form, eta: e.target.value})} /></div>
              </div>
              <div><Label>Status</Label>
                <Select value={form.current_status || 'pending'} onValueChange={v => setForm({...form, current_status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(statusColors).map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleSubmit} className="w-full">Create Tracker</Button>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 text-center">
          <p className="text-2xl font-bold text-foreground">{trackers.length}</p>
          <p className="text-xs text-muted-foreground">Total Tracked</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{trackers.filter(t => t.current_status === 'in_transit').length}</p>
          <p className="text-xs text-muted-foreground">In Transit</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{trackers.filter(t => t.current_status === 'delivered').length}</p>
          <p className="text-xs text-muted-foreground">Delivered</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-2xl font-bold text-destructive">{trackers.filter(t => t.current_status === 'delayed').length}</p>
          <p className="text-xs text-muted-foreground">Delayed</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Ship className="h-5 w-5" />Active Shipments</CardTitle></CardHeader>
        <CardContent>
          {trackers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No shipments being tracked</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vessel</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Container</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>ETA</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trackers.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.vessel_name || '-'}</TableCell>
                      <TableCell className="text-sm">{t.origin_port} → {t.destination_port}</TableCell>
                      <TableCell className="font-mono text-sm">{t.container_number || '-'}</TableCell>
                      <TableCell><Badge className={statusColors[t.current_status] || ''}>{t.current_status?.replace('_', ' ')}</Badge></TableCell>
                      <TableCell className="flex items-center gap-1"><MapPin className="h-3 w-3" />{t.current_location || '-'}</TableCell>
                      <TableCell>{t.eta ? new Date(t.eta).toLocaleDateString() : '-'}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
