import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useExportPayments } from '@/hooks/export/useExportPayments';
import { Loader2, Plus, DollarSign, CreditCard, Building2, Landmark } from 'lucide-react';

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  confirmed: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  failed: 'bg-red-500/10 text-red-600 border-red-500/20',
  partial: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
};

const methodIcons: Record<string, React.ReactNode> = {
  wire_transfer: <Building2 className="h-4 w-4" />,
  letter_of_credit: <Landmark className="h-4 w-4" />,
  credit_card: <CreditCard className="h-4 w-4" />,
  cash: <DollarSign className="h-4 w-4" />,
};

export default function ExportPayments() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const { payments, loading, create } = useExportPayments({ status: statusFilter });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    amount: '',
    currency: 'USD',
    payment_method: 'wire_transfer',
    payment_type: 'standard',
    reference_number: '',
    bank_name: '',
    swift_code: '',
    lc_number: '',
    lc_issuing_bank: '',
    status: 'pending',
    notes: '',
  });

  const handleCreate = async () => {
    const ok = await create({ ...form, amount: Number(form.amount) });
    if (ok) { setOpen(false); setForm({ ...form, amount: '', reference_number: '', notes: '', bank_name: '', swift_code: '', lc_number: '', lc_issuing_bank: '' }); }
  };

  const totalPending = payments.filter(p => p.status === 'pending').reduce((s, p) => s + Number(p.amount), 0);
  const totalConfirmed = payments.filter(p => p.status === 'confirmed').reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Payments & Collections</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white"><Plus className="h-4 w-4 mr-1" /> Record Payment</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Date</Label><Input type="date" value={form.payment_date} onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))} /></div>
                <div><Label>Amount</Label><Input type="number" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Currency</Label>
                  <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem><SelectItem value="GBP">GBP</SelectItem><SelectItem value="HTG">HTG</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>Method</Label>
                  <Select value={form.payment_method} onValueChange={v => setForm(f => ({ ...f, payment_method: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wire_transfer">Wire Transfer</SelectItem>
                      <SelectItem value="letter_of_credit">Letter of Credit</SelectItem>
                      <SelectItem value="credit_card">Credit Card</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Reference #</Label><Input value={form.reference_number} onChange={e => setForm(f => ({ ...f, reference_number: e.target.value }))} /></div>
              {form.payment_method === 'wire_transfer' && (
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Bank Name</Label><Input value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} /></div>
                  <div><Label>SWIFT Code</Label><Input value={form.swift_code} onChange={e => setForm(f => ({ ...f, swift_code: e.target.value }))} /></div>
                </div>
              )}
              {form.payment_method === 'letter_of_credit' && (
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>LC Number</Label><Input value={form.lc_number} onChange={e => setForm(f => ({ ...f, lc_number: e.target.value }))} /></div>
                  <div><Label>Issuing Bank</Label><Input value={form.lc_issuing_bank} onChange={e => setForm(f => ({ ...f, lc_issuing_bank: e.target.value }))} /></div>
                </div>
              )}
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="confirmed">Confirmed</SelectItem><SelectItem value="partial">Partial</SelectItem><SelectItem value="failed">Failed</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
              <Button className="w-full" onClick={handleCreate}>Save Payment</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-amber-500/20 bg-amber-500/5"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Pending</p>
          <p className="text-xl font-bold text-amber-600">${totalPending.toLocaleString()}</p>
        </CardContent></Card>
        <Card className="border-emerald-500/20 bg-emerald-500/5"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Confirmed</p>
          <p className="text-xl font-bold text-emerald-600">${totalConfirmed.toLocaleString()}</p>
        </CardContent></Card>
      </div>

      {/* Filter Tabs */}
      <Tabs defaultValue="all" onValueChange={v => setStatusFilter(v === 'all' ? undefined : v)}>
        <TabsList className="w-full">
          <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
          <TabsTrigger value="pending" className="flex-1">Pending</TabsTrigger>
          <TabsTrigger value="confirmed" className="flex-1">Confirmed</TabsTrigger>
          <TabsTrigger value="partial" className="flex-1">Partial</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : payments.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No payments recorded yet.</p>
      ) : (
        <div className="space-y-3">
          {payments.map(p => (
            <Card key={p.id}><CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">{methodIcons[p.payment_method] || <DollarSign className="h-4 w-4" />}</div>
                  <div>
                    <p className="font-semibold text-foreground">{p.payment_method?.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</p>
                    <p className="text-xs text-muted-foreground">{p.reference_number || 'No ref'} • {new Date(p.payment_date).toLocaleDateString()}</p>
                    {(p as any).export_customers?.company_name && <p className="text-xs text-muted-foreground">{(p as any).export_customers.company_name}</p>}
                    {p.lc_number && <p className="text-xs text-blue-500">LC: {p.lc_number}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-foreground">{p.currency} {Number(p.amount).toLocaleString()}</p>
                  <Badge variant="outline" className={statusColors[p.status] || ''}>{p.status}</Badge>
                </div>
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}
