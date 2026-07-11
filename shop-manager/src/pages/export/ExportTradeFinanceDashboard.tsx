import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useExportTradeFinance } from '@/hooks/export/useExportTradeFinance';
import { Loader2, Plus, Landmark, TrendingUp, CreditCard, Shield, FileText, Trash2 } from 'lucide-react';

export default function ExportTradeFinanceDashboard() {
  const { snapshots, loading, create, remove } = useExportTradeFinance();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});

  const handleSubmit = async () => {
    const ok = await create(form);
    if (ok) { setOpen(false); setForm({}); }
  };

  const latest = snapshots.length > 0 ? snapshots[0] : null;

  const cards = latest ? [
    { label: 'Open Letters of Credit', value: latest.open_lc_count, amount: latest.open_lc_value, icon: FileText, color: 'text-blue-500' },
    { label: 'Active Guarantees', value: latest.active_guarantees_count, amount: latest.active_guarantees_value, icon: Shield, color: 'text-indigo-500' },
    { label: 'Total Receivables', value: null, amount: latest.total_receivables, icon: TrendingUp, color: 'text-emerald-500' },
    { label: 'Overdue Receivables', value: null, amount: latest.overdue_receivables, icon: CreditCard, color: 'text-red-500' },
    { label: 'Credit Exposure', value: null, amount: latest.total_credit_exposure, icon: CreditCard, color: 'text-amber-500' },
    { label: 'Pending Drawbacks', value: null, amount: latest.pending_duty_drawbacks, icon: Landmark, color: 'text-teal-500' },
  ] : [];

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Landmark className="h-6 w-6 text-foreground" />
          <h1 className="text-2xl font-bold text-foreground">Trade Finance</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => { setForm({}); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />Snapshot</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Record Finance Snapshot</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Snapshot Date</Label><Input type="date" value={form.snapshot_date || new Date().toISOString().slice(0,10)} onChange={e => setForm({...form, snapshot_date: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Open LC Count</Label><Input type="number" value={form.open_lc_count || ''} onChange={e => setForm({...form, open_lc_count: parseInt(e.target.value)})} /></div>
                <div><Label>Open LC Value ($)</Label><Input type="number" value={form.open_lc_value || ''} onChange={e => setForm({...form, open_lc_value: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Guarantees Count</Label><Input type="number" value={form.active_guarantees_count || ''} onChange={e => setForm({...form, active_guarantees_count: parseInt(e.target.value)})} /></div>
                <div><Label>Guarantees Value ($)</Label><Input type="number" value={form.active_guarantees_value || ''} onChange={e => setForm({...form, active_guarantees_value: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Total Receivables ($)</Label><Input type="number" value={form.total_receivables || ''} onChange={e => setForm({...form, total_receivables: e.target.value})} /></div>
                <div><Label>Overdue ($)</Label><Input type="number" value={form.overdue_receivables || ''} onChange={e => setForm({...form, overdue_receivables: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Credit Exposure ($)</Label><Input type="number" value={form.total_credit_exposure || ''} onChange={e => setForm({...form, total_credit_exposure: e.target.value})} /></div>
                <div><Label>Pending Drawbacks ($)</Label><Input type="number" value={form.pending_duty_drawbacks || ''} onChange={e => setForm({...form, pending_duty_drawbacks: e.target.value})} /></div>
              </div>
              <Button className="w-full" onClick={handleSubmit}>Save Snapshot</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : !latest ? (
        <Card><CardContent className="p-8 text-center">
          <Landmark className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-lg font-semibold text-foreground">No Finance Data</p>
          <p className="text-sm text-muted-foreground">Record a snapshot of your trade finance position.</p>
        </CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            {cards.map((c, i) => (
              <Card key={i}><CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <c.icon className={`h-4 w-4 ${c.color}`} />
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                </div>
                <p className="text-lg font-bold text-foreground">${Number(c.amount || 0).toLocaleString()}</p>
                {c.value !== null && <p className="text-xs text-muted-foreground">{c.value} active</p>}
              </CardContent></Card>
            ))}
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-muted-foreground">History</p>
            {snapshots.map(s => (
              <Card key={s.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{s.snapshot_date}</p>
                    <p className="text-xs text-muted-foreground">Receivables: ${Number(s.total_receivables || 0).toLocaleString()} • Exposure: ${Number(s.total_credit_exposure || 0).toLocaleString()}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => remove(s.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
