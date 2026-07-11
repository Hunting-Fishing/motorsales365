import React, { useState } from 'react';
import { useExportSamples } from '@/hooks/export/useExportSamples';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Package, Trash2, Star } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30',
  sent: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  received: 'bg-purple-500/10 text-purple-700 border-purple-500/30',
  feedback_received: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
  converted: 'bg-green-500/10 text-green-700 border-green-500/30',
};

export default function ExportSamples() {
  const { samples, loading, create, update, remove } = useExportSamples();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});

  const handleSubmit = async () => {
    const ok = await create({ ...form, sample_number: form.sample_number || `SMP-${Date.now().toString(36).toUpperCase()}` });
    if (ok) { setOpen(false); setForm({}); }
  };

  if (loading) return <div className="p-4 space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Sample Management</h1>
          <p className="text-sm text-muted-foreground">Track pre-sale samples sent to prospects</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Sample</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Sample</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Product Name</Label><Input value={form.product_name || ''} onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))} /></div>
              <div><Label>Customer Name</Label><Input value={form.customer_name || ''} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Quantity</Label><Input type="number" value={form.quantity || ''} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} /></div>
                <div><Label>Unit</Label><Input value={form.unit || 'pcs'} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} /></div>
              </div>
              <div><Label>Shipping Method</Label><Input value={form.shipping_method || ''} onChange={e => setForm(f => ({ ...f, shipping_method: e.target.value }))} /></div>
              <div><Label>Notes</Label><Textarea value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
              <Button onClick={handleSubmit} className="w-full">Create Sample</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {samples.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><Package className="h-10 w-10 mx-auto mb-2 opacity-40" />No samples yet</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {samples.map(s => (
            <Card key={s.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm truncate">{s.sample_number}</span>
                      <Badge variant="outline" className={statusColors[s.status] || ''}>{s.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{s.product_name} → {s.customer_name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{s.quantity} {s.unit} · {s.shipping_method || 'N/A'}</p>
                    {s.feedback_rating && (
                      <div className="flex items-center gap-1 mt-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`h-3 w-3 ${i < s.feedback_rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {s.status === 'pending' && (
                      <Button size="sm" variant="outline" onClick={() => update(s.id, { status: 'sent', sent_date: new Date().toISOString().split('T')[0] })}>Mark Sent</Button>
                    )}
                    {s.status === 'sent' && (
                      <Button size="sm" variant="outline" onClick={() => update(s.id, { status: 'received', received_date: new Date().toISOString().split('T')[0] })}>Received</Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
