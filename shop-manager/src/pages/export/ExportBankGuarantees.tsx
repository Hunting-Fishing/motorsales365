import React, { useState } from 'react';
import { useExportBankGuarantees } from '@/hooks/export/useExportBankGuarantees';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Shield, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const statusColors: Record<string, string> = {
  active: 'bg-green-500/10 text-green-700 border-green-500/30',
  expired: 'bg-gray-500/10 text-gray-700 border-gray-500/30',
  claimed: 'bg-red-500/10 text-red-700 border-red-500/30',
  released: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  extended: 'bg-purple-500/10 text-purple-700 border-purple-500/30',
};

export default function ExportBankGuarantees() {
  const { guarantees, loading, create, remove } = useExportBankGuarantees();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({ guarantee_type: 'performance', currency: 'USD' });

  const handleSubmit = async () => {
    const ok = await create({ ...form, guarantee_number: form.guarantee_number || `BG-${Date.now().toString(36).toUpperCase()}` });
    if (ok) { setOpen(false); setForm({ guarantee_type: 'performance', currency: 'USD' }); }
  };

  if (loading) return <div className="p-4 space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>;

  const totalActive = guarantees.filter(g => g.status === 'active').reduce((s, g) => s + Number(g.amount), 0);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Bank Guarantees & Bonds</h1>
          <p className="text-sm text-muted-foreground">{guarantees.length} guarantees · ${totalActive.toLocaleString()} active</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Guarantee</Button></DialogTrigger>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add Bank Guarantee</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Type</Label>
                <Select value={form.guarantee_type} onValueChange={v => setForm(f => ({ ...f, guarantee_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="performance">Performance</SelectItem>
                    <SelectItem value="advance_payment">Advance Payment</SelectItem>
                    <SelectItem value="bid">Bid Bond</SelectItem>
                    <SelectItem value="retention">Retention</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Issuing Bank</Label><Input value={form.issuing_bank || ''} onChange={e => setForm(f => ({ ...f, issuing_bank: e.target.value }))} /></div>
              <div><Label>Beneficiary</Label><Input value={form.beneficiary || ''} onChange={e => setForm(f => ({ ...f, beneficiary: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Amount</Label><Input type="number" value={form.amount || ''} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
                <div><Label>Currency</Label><Input value={form.currency || 'USD'} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Issue Date</Label><Input type="date" value={form.issue_date || ''} onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))} /></div>
                <div><Label>Expiry Date</Label><Input type="date" value={form.expiry_date || ''} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} /></div>
              </div>
              <div><Label>Related Contract</Label><Input value={form.related_contract || ''} onChange={e => setForm(f => ({ ...f, related_contract: e.target.value }))} /></div>
              <div><Label>Margin %</Label><Input type="number" step="0.01" value={form.margin_percentage || ''} onChange={e => setForm(f => ({ ...f, margin_percentage: e.target.value }))} /></div>
              <div><Label>Notes</Label><Textarea value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
              <Button onClick={handleSubmit} className="w-full">Add Guarantee</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {guarantees.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><Shield className="h-10 w-10 mx-auto mb-2 opacity-40" />No bank guarantees yet</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {guarantees.map(g => (
            <Card key={g.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm truncate">{g.guarantee_number}</span>
                      <Badge variant="outline" className={statusColors[g.status] || ''}>{g.status}</Badge>
                      <Badge variant="secondary" className="text-xs">{g.guarantee_type.replace('_', ' ')}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{g.issuing_bank} → {g.beneficiary}</p>
                    <p className="text-sm font-medium mt-1">{g.currency} {Number(g.amount).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{g.issue_date} → {g.expiry_date}</p>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => remove(g.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
