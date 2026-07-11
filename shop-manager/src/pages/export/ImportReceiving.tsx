import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useImportReceiving } from '@/hooks/export/useImportReceiving';
import { Loader2, Plus, PackageCheck, CheckCircle2, XCircle } from 'lucide-react';

export default function ImportReceiving() {
  const { records, loading, create } = useImportReceiving();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    received_date: new Date().toISOString().split('T')[0],
    quantity_received: '',
    unit: 'kg',
    lot_number: '',
    batch_number: '',
    expiry_date: '',
    condition_on_arrival: 'good',
    inspection_passed: true,
    inspection_notes: '',
    received_by: '',
    notes: '',
  });

  const handleCreate = async () => {
    const ok = await create({ ...form, quantity_received: Number(form.quantity_received) });
    if (ok) { setOpen(false); setForm({ ...form, quantity_received: '', lot_number: '', batch_number: '', expiry_date: '', inspection_notes: '', received_by: '', notes: '' }); }
  };

  const totalReceived = records.reduce((s, r) => s + Number(r.quantity_received), 0);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PackageCheck className="h-6 w-6 text-green-500" />
          <h1 className="text-2xl font-bold text-foreground">Import Receiving</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-gradient-to-r from-green-500 to-emerald-600 text-white"><Plus className="h-4 w-4 mr-1" /> Log Receipt</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Log Goods Receipt</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Date Received</Label><Input type="date" value={form.received_date} onChange={e => setForm(f => ({ ...f, received_date: e.target.value }))} /></div>
                <div><Label>Quantity</Label><Input type="number" value={form.quantity_received} onChange={e => setForm(f => ({ ...f, quantity_received: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Unit</Label>
                  <Select value={form.unit} onValueChange={v => setForm(f => ({ ...f, unit: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="kg">kg</SelectItem><SelectItem value="lbs">lbs</SelectItem><SelectItem value="units">units</SelectItem><SelectItem value="pallets">pallets</SelectItem><SelectItem value="containers">containers</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>Condition</Label>
                  <Select value={form.condition_on_arrival} onValueChange={v => setForm(f => ({ ...f, condition_on_arrival: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="good">Good</SelectItem><SelectItem value="damaged">Damaged</SelectItem><SelectItem value="partial">Partial</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Lot #</Label><Input value={form.lot_number} onChange={e => setForm(f => ({ ...f, lot_number: e.target.value }))} /></div>
                <div><Label>Batch #</Label><Input value={form.batch_number} onChange={e => setForm(f => ({ ...f, batch_number: e.target.value }))} /></div>
              </div>
              <div><Label>Expiry Date</Label><Input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} /></div>
              <div><Label>Received By</Label><Input value={form.received_by} onChange={e => setForm(f => ({ ...f, received_by: e.target.value }))} /></div>
              <div><Label>Inspection Notes</Label><Input value={form.inspection_notes} onChange={e => setForm(f => ({ ...f, inspection_notes: e.target.value }))} /></div>
              <Button className="w-full" onClick={handleCreate}>Log Receipt</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-green-500/20 bg-green-500/5"><CardContent className="p-4 flex items-center justify-between">
        <div><p className="text-xs text-muted-foreground">Total Records</p><p className="text-xl font-bold text-foreground">{records.length}</p></div>
        <div><p className="text-xs text-muted-foreground">Total Received</p><p className="text-xl font-bold text-foreground">{totalReceived.toLocaleString()}</p></div>
      </CardContent></Card>

      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : records.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No receiving records yet.</p>
      ) : (
        <div className="space-y-3">
          {records.map(r => (
            <Card key={r.id}><CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    {r.inspection_passed ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{(r as any).export_products?.name || 'Product'}</p>
                    <p className="text-xs text-muted-foreground">PO: {(r as any).import_purchase_orders?.po_number || 'N/A'}</p>
                    <p className="text-xs text-muted-foreground">Lot: {r.lot_number || 'N/A'} • Batch: {r.batch_number || 'N/A'}</p>
                    {r.received_by && <p className="text-xs text-muted-foreground">By: {r.received_by}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-foreground">{Number(r.quantity_received).toLocaleString()} {r.unit}</p>
                  <Badge variant="outline" className={r.condition_on_arrival === 'good' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}>{r.condition_on_arrival}</Badge>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(r.received_date).toLocaleDateString()}</p>
                </div>
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}
