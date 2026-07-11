import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useExportLettersOfCredit } from '@/hooks/export/useExportLettersOfCredit';
import { Loader2, Plus, Landmark, Search } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/formatters';

const statusColors: Record<string, string> = {
  draft: 'bg-slate-500/10 text-slate-500',
  issued: 'bg-blue-500/10 text-blue-500',
  amended: 'bg-orange-500/10 text-orange-500',
  presented: 'bg-indigo-500/10 text-indigo-500',
  accepted: 'bg-green-500/10 text-green-500',
  paid: 'bg-emerald-500/10 text-emerald-500',
  expired: 'bg-red-500/10 text-red-500',
  cancelled: 'bg-gray-500/10 text-gray-500',
};

export default function ExportLettersOfCredit() {
  const { lcs, loading, create } = useExportLettersOfCredit();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    lc_number: '',
    customer_name: '',
    issuing_bank: '',
    advising_bank: '',
    beneficiary: '',
    amount: '',
    currency: 'USD',
    lc_type: 'irrevocable',
    issue_date: '',
    expiry_date: '',
    payment_terms: '',
    notes: '',
  });

  const filtered = lcs.filter(l =>
    l.lc_number?.toLowerCase().includes(search.toLowerCase()) ||
    l.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.issuing_bank?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    await create({
      lc_number: form.lc_number || `LC-${Date.now().toString(36).toUpperCase()}`,
      customer_name: form.customer_name || null,
      issuing_bank: form.issuing_bank || null,
      advising_bank: form.advising_bank || null,
      beneficiary: form.beneficiary || null,
      amount: parseFloat(form.amount) || 0,
      currency: form.currency,
      lc_type: form.lc_type,
      issue_date: form.issue_date || null,
      expiry_date: form.expiry_date || null,
      payment_terms: form.payment_terms || null,
      notes: form.notes || null,
    });
    setOpen(false);
    setForm({ lc_number: '', customer_name: '', issuing_bank: '', advising_bank: '', beneficiary: '', amount: '', currency: 'USD', lc_type: 'irrevocable', issue_date: '', expiry_date: '', payment_terms: '', notes: '' });
  };

  const totalAmount = lcs.reduce((s, l) => s + (Number(l.amount) || 0), 0);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Landmark className="h-6 w-6 text-foreground" />
          <h1 className="text-2xl font-bold text-foreground">Letters of Credit</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New LC</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New Letter of Credit</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>LC Number</Label><Input placeholder="Auto" value={form.lc_number} onChange={e => setForm({ ...form, lc_number: e.target.value })} /></div>
                <div><Label>Type</Label>
                  <Select value={form.lc_type} onValueChange={v => setForm({ ...form, lc_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="irrevocable">Irrevocable</SelectItem>
                      <SelectItem value="revocable">Revocable</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="standby">Standby</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Customer</Label><Input value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Issuing Bank</Label><Input value={form.issuing_bank} onChange={e => setForm({ ...form, issuing_bank: e.target.value })} /></div>
                <div><Label>Advising Bank</Label><Input value={form.advising_bank} onChange={e => setForm({ ...form, advising_bank: e.target.value })} /></div>
              </div>
              <div><Label>Beneficiary</Label><Input value={form.beneficiary} onChange={e => setForm({ ...form, beneficiary: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Amount</Label><Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
                <div><Label>Currency</Label>
                  <Select value={form.currency} onValueChange={v => setForm({ ...form, currency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Issue Date</Label><Input type="date" value={form.issue_date} onChange={e => setForm({ ...form, issue_date: e.target.value })} /></div>
                <div><Label>Expiry Date</Label><Input type="date" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })} /></div>
              </div>
              <div><Label>Payment Terms</Label><Input value={form.payment_terms} onChange={e => setForm({ ...form, payment_terms: e.target.value })} /></div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <Button className="w-full" onClick={handleCreate}>Create LC</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-foreground">{lcs.length}</p><p className="text-xs text-muted-foreground">Total LCs</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-blue-500">{lcs.filter(l => l.status === 'issued').length}</p><p className="text-xs text-muted-foreground">Active</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-foreground">{formatCurrency(totalAmount)}</p><p className="text-xs text-muted-foreground">Total Value</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-emerald-500">{lcs.filter(l => l.status === 'paid').length}</p><p className="text-xs text-muted-foreground">Paid</p></CardContent></Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search LCs..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center">
          <Landmark className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-lg font-semibold text-foreground">No Letters of Credit</p>
          <p className="text-sm text-muted-foreground">Create an LC to manage trade finance.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(l => (
            <Card key={l.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{l.lc_number}</span>
                      <Badge variant="outline" className={statusColors[l.status] || ''}>{l.status}</Badge>
                      <Badge variant="secondary">{l.lc_type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{formatCurrency(Number(l.amount))} {l.currency}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                      {l.customer_name && <span>Client: {l.customer_name}</span>}
                      {l.issuing_bank && <span>Bank: {l.issuing_bank}</span>}
                      {l.expiry_date && <span>Expires: {formatDate(l.expiry_date)}</span>}
                    </div>
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
