import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useExportContracts } from '@/hooks/export/useExportContracts';
import { Loader2, Plus, FileSignature, CalendarClock, RefreshCw } from 'lucide-react';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  expired: 'bg-red-500/10 text-red-600 border-red-500/20',
  terminated: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
  pending_renewal: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
};

export default function ExportContracts() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const { contracts, loading, create } = useExportContracts({ status: statusFilter });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    contract_number: '',
    title: '',
    contract_type: 'supply',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    auto_renew: false,
    renewal_notice_days: '30',
    total_value: '',
    currency: 'USD',
    payment_terms: '',
    incoterm: 'FOB',
    status: 'draft',
    notes: '',
  });

  const handleCreate = async () => {
    const ok = await create({
      ...form,
      total_value: Number(form.total_value || 0),
      renewal_notice_days: Number(form.renewal_notice_days || 30),
    });
    if (ok) { setOpen(false); setForm({ ...form, contract_number: '', title: '', end_date: '', total_value: '', payment_terms: '', notes: '' }); }
  };

  const renewingSoon = contracts.filter(c => {
    if (c.status !== 'active' || !c.end_date) return false;
    const daysLeft = (new Date(c.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysLeft > 0 && daysLeft <= (c.renewal_notice_days || 30);
  });

  const totalActiveValue = contracts.filter(c => c.status === 'active').reduce((s, c) => s + Number(c.total_value || 0), 0);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSignature className="h-6 w-6 text-foreground" />
          <h1 className="text-2xl font-bold text-foreground">Contracts & Agreements</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white"><Plus className="h-4 w-4 mr-1" /> New Contract</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New Contract</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Contract #</Label><Input placeholder="CON-001" value={form.contract_number} onChange={e => setForm(f => ({ ...f, contract_number: e.target.value }))} /></div>
              <div><Label>Title</Label><Input placeholder="Annual Supply Agreement" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
              <div><Label>Type</Label>
                <Select value={form.contract_type} onValueChange={v => setForm(f => ({ ...f, contract_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="supply">Supply Agreement</SelectItem>
                    <SelectItem value="purchase">Purchase Agreement</SelectItem>
                    <SelectItem value="distribution">Distribution</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="framework">Framework</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
                <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Total Value</Label><Input type="number" placeholder="0.00" value={form.total_value} onChange={e => setForm(f => ({ ...f, total_value: e.target.value }))} /></div>
                <div><Label>Currency</Label>
                  <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem><SelectItem value="GBP">GBP</SelectItem><SelectItem value="HTG">HTG</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Payment Terms</Label><Input placeholder="Net 30" value={form.payment_terms} onChange={e => setForm(f => ({ ...f, payment_terms: e.target.value }))} /></div>
                <div><Label>Incoterm</Label>
                  <Select value={form.incoterm} onValueChange={v => setForm(f => ({ ...f, incoterm: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="FOB">FOB</SelectItem><SelectItem value="CIF">CIF</SelectItem><SelectItem value="EXW">EXW</SelectItem><SelectItem value="DDP">DDP</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.auto_renew} onChange={e => setForm(f => ({ ...f, auto_renew: e.target.checked }))} className="rounded" />
                <Label>Auto-renew</Label>
                {form.auto_renew && <Input type="number" className="w-20 ml-2" placeholder="30" value={form.renewal_notice_days} onChange={e => setForm(f => ({ ...f, renewal_notice_days: e.target.value }))} />}
                {form.auto_renew && <span className="text-xs text-muted-foreground">days notice</span>}
              </div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="pending_renewal">Pending Renewal</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
              <Button className="w-full" onClick={handleCreate}>Create Contract</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-emerald-500/20 bg-emerald-500/5"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Active Contract Value</p>
          <p className="text-xl font-bold text-foreground">${totalActiveValue.toLocaleString()}</p>
        </CardContent></Card>
        <Card className="border-amber-500/20 bg-amber-500/5"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Renewal Alerts</p>
          <p className="text-xl font-bold text-amber-600">{renewingSoon.length}</p>
        </CardContent></Card>
      </div>

      {renewingSoon.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5"><CardContent className="p-3 flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-amber-500" />
          <p className="text-sm text-amber-600 font-medium">{renewingSoon.length} contract(s) approaching renewal deadline</p>
        </CardContent></Card>
      )}

      <Tabs defaultValue="all" onValueChange={v => setStatusFilter(v === 'all' ? undefined : v)}>
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="expired">Expired</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : contracts.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No contracts yet.</p>
      ) : (
        <div className="space-y-3">
          {contracts.map(c => {
            const daysLeft = c.end_date ? Math.ceil((new Date(c.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
            return (
              <Card key={c.id}><CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{c.title}</p>
                    <p className="text-xs text-muted-foreground">{c.contract_number} • {c.contract_type}</p>
                    <p className="text-xs text-muted-foreground">
                      {(c as any).export_customers?.company_name || (c as any).export_suppliers?.company_name || 'No party'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <CalendarClock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {new Date(c.start_date).toLocaleDateString()} – {new Date(c.end_date).toLocaleDateString()}
                      </span>
                    </div>
                    {c.auto_renew && <p className="text-xs text-blue-500 mt-0.5">↻ Auto-renew ({c.renewal_notice_days}d notice)</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-foreground">{c.currency} {Number(c.total_value || 0).toLocaleString()}</p>
                    <Badge variant="outline" className={statusColors[c.status] || ''}>{c.status}</Badge>
                    {daysLeft !== null && daysLeft > 0 && daysLeft <= 60 && (
                      <p className="text-xs text-amber-500 mt-1">{daysLeft}d remaining</p>
                    )}
                  </div>
                </div>
              </CardContent></Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
