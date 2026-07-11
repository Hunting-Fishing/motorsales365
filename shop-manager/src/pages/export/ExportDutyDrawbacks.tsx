import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useExportDutyDrawbacks } from '@/hooks/export/useExportDutyDrawbacks';
import { Loader2, Plus, Receipt, Search } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/formatters';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-500',
  filed: 'bg-blue-500/10 text-blue-500',
  under_review: 'bg-indigo-500/10 text-indigo-500',
  approved: 'bg-green-500/10 text-green-500',
  paid: 'bg-emerald-500/10 text-emerald-500',
  denied: 'bg-red-500/10 text-red-500',
};

export default function ExportDutyDrawbacks() {
  const { drawbacks, loading, create } = useExportDutyDrawbacks();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    claim_number: '',
    import_entry_number: '',
    export_entry_number: '',
    product_description: '',
    import_date: '',
    export_date: '',
    duty_paid: '',
    claim_amount: '',
    customs_reference: '',
    notes: '',
  });

  const filtered = drawbacks.filter(d =>
    d.claim_number?.toLowerCase().includes(search.toLowerCase()) ||
    d.product_description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    await create({
      claim_number: form.claim_number || `DD-${Date.now().toString(36).toUpperCase()}`,
      import_entry_number: form.import_entry_number || null,
      export_entry_number: form.export_entry_number || null,
      product_description: form.product_description || null,
      import_date: form.import_date || null,
      export_date: form.export_date || null,
      duty_paid: parseFloat(form.duty_paid) || 0,
      claim_amount: parseFloat(form.claim_amount) || 0,
      customs_reference: form.customs_reference || null,
      notes: form.notes || null,
    });
    setOpen(false);
    setForm({ claim_number: '', import_entry_number: '', export_entry_number: '', product_description: '', import_date: '', export_date: '', duty_paid: '', claim_amount: '', customs_reference: '', notes: '' });
  };

  const totalClaimed = drawbacks.reduce((s, d) => s + (Number(d.claim_amount) || 0), 0);
  const totalRefunded = drawbacks.reduce((s, d) => s + (Number(d.refund_received) || 0), 0);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="h-6 w-6 text-foreground" />
          <h1 className="text-2xl font-bold text-foreground">Duty Drawbacks</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Claim</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New Duty Drawback Claim</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Claim #</Label><Input placeholder="Auto" value={form.claim_number} onChange={e => setForm({ ...form, claim_number: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Import Entry #</Label><Input value={form.import_entry_number} onChange={e => setForm({ ...form, import_entry_number: e.target.value })} /></div>
                <div><Label>Export Entry #</Label><Input value={form.export_entry_number} onChange={e => setForm({ ...form, export_entry_number: e.target.value })} /></div>
              </div>
              <div><Label>Product Description</Label><Input value={form.product_description} onChange={e => setForm({ ...form, product_description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Import Date</Label><Input type="date" value={form.import_date} onChange={e => setForm({ ...form, import_date: e.target.value })} /></div>
                <div><Label>Export Date</Label><Input type="date" value={form.export_date} onChange={e => setForm({ ...form, export_date: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Duty Paid</Label><Input type="number" value={form.duty_paid} onChange={e => setForm({ ...form, duty_paid: e.target.value })} /></div>
                <div><Label>Claim Amount</Label><Input type="number" value={form.claim_amount} onChange={e => setForm({ ...form, claim_amount: e.target.value })} /></div>
              </div>
              <div><Label>Customs Reference</Label><Input value={form.customs_reference} onChange={e => setForm({ ...form, customs_reference: e.target.value })} /></div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <Button className="w-full" onClick={handleCreate}>Submit Claim</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-foreground">{drawbacks.length}</p><p className="text-xs text-muted-foreground">Total Claims</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-blue-500">{formatCurrency(totalClaimed)}</p><p className="text-xs text-muted-foreground">Claimed</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-emerald-500">{formatCurrency(totalRefunded)}</p><p className="text-xs text-muted-foreground">Refunded</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-yellow-500">{drawbacks.filter(d => d.status === 'pending' || d.status === 'filed').length}</p><p className="text-xs text-muted-foreground">In Progress</p></CardContent></Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search claims..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center">
          <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-lg font-semibold text-foreground">No Duty Drawback Claims</p>
          <p className="text-sm text-muted-foreground">File a claim for re-exported goods.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(d => (
            <Card key={d.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{d.claim_number}</span>
                      <Badge variant="outline" className={statusColors[d.status] || ''}>{d.status?.replace('_', ' ')}</Badge>
                    </div>
                    {d.product_description && <p className="text-sm text-muted-foreground mt-1">{d.product_description}</p>}
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                      <span>Duty Paid: {formatCurrency(Number(d.duty_paid))}</span>
                      <span>Claim: {formatCurrency(Number(d.claim_amount))}</span>
                      {Number(d.refund_received) > 0 && <span className="text-emerald-500">Refunded: {formatCurrency(Number(d.refund_received))}</span>}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(d.created_at)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
