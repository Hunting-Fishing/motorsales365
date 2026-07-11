import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useExportReturns } from '@/hooks/export/useExportReturns';
import { Loader2, Plus, RotateCcw, Search, FileText, DollarSign } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/formatters';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-500',
  approved: 'bg-blue-500/10 text-blue-500',
  rejected: 'bg-red-500/10 text-red-500',
  resolved: 'bg-green-500/10 text-green-500',
  credited: 'bg-emerald-500/10 text-emerald-500',
};

const typeLabels: Record<string, string> = {
  return: 'Return',
  claim: 'Claim',
  dispute: 'Dispute',
};

export default function ExportReturns() {
  const { returns, loading, create } = useExportReturns();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    return_number: '',
    customer_name: '',
    return_type: 'return',
    reason: '',
    total_value: '',
    credit_note_number: '',
    credit_note_amount: '',
    debit_note_number: '',
    debit_note_amount: '',
  });

  const filtered = returns.filter(r =>
    r.return_number?.toLowerCase().includes(search.toLowerCase()) ||
    r.customer_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    await create({
      return_number: form.return_number || `RTN-${Date.now().toString(36).toUpperCase()}`,
      customer_name: form.customer_name,
      return_type: form.return_type,
      reason: form.reason,
      total_value: parseFloat(form.total_value) || 0,
      credit_note_number: form.credit_note_number || null,
      credit_note_amount: parseFloat(form.credit_note_amount) || null,
      debit_note_number: form.debit_note_number || null,
      debit_note_amount: parseFloat(form.debit_note_amount) || null,
    });
    setOpen(false);
    setForm({ return_number: '', customer_name: '', return_type: 'return', reason: '', total_value: '', credit_note_number: '', credit_note_amount: '', debit_note_number: '', debit_note_amount: '' });
  };

  const stats = {
    total: returns.length,
    pending: returns.filter(r => r.status === 'pending').length,
    totalValue: returns.reduce((s, r) => s + (Number(r.total_value) || 0), 0),
    credited: returns.filter(r => r.status === 'credited').length,
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RotateCcw className="h-6 w-6 text-foreground" />
          <h1 className="text-2xl font-bold text-foreground">Returns & Claims</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New Return / Claim</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Return #</Label><Input placeholder="Auto-generated" value={form.return_number} onChange={e => setForm({ ...form, return_number: e.target.value })} /></div>
                <div><Label>Type</Label>
                  <Select value={form.return_type} onValueChange={v => setForm({ ...form, return_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="return">Return</SelectItem>
                      <SelectItem value="claim">Claim</SelectItem>
                      <SelectItem value="dispute">Dispute</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Customer</Label><Input value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} /></div>
              <div><Label>Reason</Label><Textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} /></div>
              <div><Label>Total Value</Label><Input type="number" value={form.total_value} onChange={e => setForm({ ...form, total_value: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Credit Note #</Label><Input value={form.credit_note_number} onChange={e => setForm({ ...form, credit_note_number: e.target.value })} /></div>
                <div><Label>Credit Amount</Label><Input type="number" value={form.credit_note_amount} onChange={e => setForm({ ...form, credit_note_amount: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Debit Note #</Label><Input value={form.debit_note_number} onChange={e => setForm({ ...form, debit_note_number: e.target.value })} /></div>
                <div><Label>Debit Amount</Label><Input type="number" value={form.debit_note_amount} onChange={e => setForm({ ...form, debit_note_amount: e.target.value })} /></div>
              </div>
              <Button className="w-full" onClick={handleCreate}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-foreground">{stats.total}</p><p className="text-xs text-muted-foreground">Total</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-yellow-500">{stats.pending}</p><p className="text-xs text-muted-foreground">Pending</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-foreground">{formatCurrency(stats.totalValue)}</p><p className="text-xs text-muted-foreground">Total Value</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-emerald-500">{stats.credited}</p><p className="text-xs text-muted-foreground">Credited</p></CardContent></Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search returns..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center">
          <RotateCcw className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-lg font-semibold text-foreground">No Returns or Claims</p>
          <p className="text-sm text-muted-foreground">Create one to start tracking.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => (
            <Card key={r.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{r.return_number}</span>
                      <Badge variant="outline" className={statusColors[r.status] || ''}>{r.status}</Badge>
                      <Badge variant="secondary">{typeLabels[r.return_type] || r.return_type}</Badge>
                    </div>
                    {r.customer_name && <p className="text-sm text-muted-foreground mt-1">{r.customer_name}</p>}
                    {r.reason && <p className="text-xs text-muted-foreground mt-0.5 truncate">{r.reason}</p>}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      {r.total_value > 0 && <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{formatCurrency(Number(r.total_value))}</span>}
                      {r.credit_note_number && <span className="flex items-center gap-1"><FileText className="h-3 w-3" />CN: {r.credit_note_number}</span>}
                      {r.debit_note_number && <span className="flex items-center gap-1"><FileText className="h-3 w-3" />DN: {r.debit_note_number}</span>}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(r.created_at)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
