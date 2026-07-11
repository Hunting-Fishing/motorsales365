import React, { useState } from 'react';
import { useExportTradeLanes } from '@/hooks/export/useExportTradeLanes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Globe, Loader2, Trash2, ArrowRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ExportTradeLaneAnalytics() {
  const { lanes, loading, create, remove } = useExportTradeLanes();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({ primary_transport_mode: 'sea' });

  const handleSubmit = async () => {
    const ok = await create(form);
    if (ok) { setOpen(false); setForm({ primary_transport_mode: 'sea' }); }
  };

  const fmt = (v: any) => Number(v || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Trade Lane Analytics</h1>
          <p className="text-muted-foreground">Volume and revenue visualization by corridor</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />Add Lane</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Trade Lane</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Origin Country</Label><Input value={form.origin_country || ''} onChange={e => setForm({...form, origin_country: e.target.value})} /></div>
                <div><Label>Destination Country</Label><Input value={form.destination_country || ''} onChange={e => setForm({...form, destination_country: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Origin Port</Label><Input value={form.origin_port || ''} onChange={e => setForm({...form, origin_port: e.target.value})} /></div>
                <div><Label>Destination Port</Label><Input value={form.destination_port || ''} onChange={e => setForm({...form, destination_port: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Total Shipments</Label><Input type="number" value={form.total_shipments || ''} onChange={e => setForm({...form, total_shipments: Number(e.target.value)})} /></div>
                <div><Label>Total Revenue</Label><Input type="number" value={form.total_revenue || ''} onChange={e => setForm({...form, total_revenue: Number(e.target.value)})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Volume (CBM)</Label><Input type="number" value={form.total_volume_cbm || ''} onChange={e => setForm({...form, total_volume_cbm: Number(e.target.value)})} /></div>
                <div><Label>Avg Transit (days)</Label><Input type="number" value={form.avg_transit_days || ''} onChange={e => setForm({...form, avg_transit_days: Number(e.target.value)})} /></div>
              </div>
              <div><Label>Transport Mode</Label>
                <Select value={form.primary_transport_mode} onValueChange={v => setForm({...form, primary_transport_mode: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sea">Sea</SelectItem>
                    <SelectItem value="air">Air</SelectItem>
                    <SelectItem value="rail">Rail</SelectItem>
                    <SelectItem value="road">Road</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Period</Label><Input value={form.period || ''} onChange={e => setForm({...form, period: e.target.value})} placeholder="e.g. 2026" /></div>
            </div>
            <Button onClick={handleSubmit} className="w-full">Save Lane</Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{lanes.length}</p><p className="text-xs text-muted-foreground">Trade Lanes</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{lanes.reduce((s, l) => s + Number(l.total_shipments || 0), 0)}</p><p className="text-xs text-muted-foreground">Total Shipments</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-emerald-600">{fmt(lanes.reduce((s, l) => s + Number(l.total_revenue || 0), 0))}</p><p className="text-xs text-muted-foreground">Total Revenue</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{lanes.reduce((s, l) => s + Number(l.total_volume_cbm || 0), 0).toLocaleString()} CBM</p><p className="text-xs text-muted-foreground">Total Volume</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" />Trade Corridors</CardTitle></CardHeader>
        <CardContent>
          {lanes.length === 0 ? <p className="text-center py-8 text-muted-foreground">No trade lanes recorded</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Route</TableHead><TableHead>Mode</TableHead><TableHead className="text-right">Shipments</TableHead><TableHead className="text-right">Revenue</TableHead><TableHead className="text-right">Volume</TableHead><TableHead className="text-right">Avg Transit</TableHead><TableHead>Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {lanes.map(l => (
                    <TableRow key={l.id}>
                      <TableCell>
                        <div className="flex items-center gap-1 font-medium">
                          <span>{l.origin_country}</span><ArrowRight className="h-3 w-3 text-muted-foreground" /><span>{l.destination_country}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{l.origin_port} → {l.destination_port}</span>
                      </TableCell>
                      <TableCell><Badge variant="outline">{l.primary_transport_mode}</Badge></TableCell>
                      <TableCell className="text-right">{l.total_shipments}</TableCell>
                      <TableCell className="text-right font-semibold">{fmt(l.total_revenue)}</TableCell>
                      <TableCell className="text-right">{Number(l.total_volume_cbm || 0).toLocaleString()} CBM</TableCell>
                      <TableCell className="text-right">{l.avg_transit_days} days</TableCell>
                      <TableCell><Button variant="ghost" size="icon" onClick={() => remove(l.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
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
