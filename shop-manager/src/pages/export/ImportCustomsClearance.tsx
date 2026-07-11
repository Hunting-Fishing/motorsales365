import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useImportCustomsClearance } from '@/hooks/export/useImportCustomsClearance';
import { Loader2, Plus, Shield, CheckCircle2 } from 'lucide-react';

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  in_progress: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  inspection: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  cleared: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  held: 'bg-red-500/10 text-red-600 border-red-500/20',
};

export default function ImportCustomsClearance() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const { clearances, loading, create, update } = useImportCustomsClearance({ status: statusFilter });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    declaration_number: '',
    customs_broker: '',
    broker_contact: '',
    entry_port: '',
    arrival_date: '',
    duty_amount: '',
    tax_amount: '',
    status: 'pending',
    inspection_required: false,
    notes: '',
  });

  const handleCreate = async () => {
    const ok = await create({ ...form, duty_amount: Number(form.duty_amount || 0), tax_amount: Number(form.tax_amount || 0) });
    if (ok) { setOpen(false); setForm({ ...form, declaration_number: '', customs_broker: '', broker_contact: '', entry_port: '', arrival_date: '', duty_amount: '', tax_amount: '', notes: '' }); }
  };

  const totalDuties = clearances.reduce((s, c) => s + Number(c.duty_amount || 0) + Number(c.tax_amount || 0), 0);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-purple-500" />
          <h1 className="text-2xl font-bold text-foreground">Customs Clearance</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white"><Plus className="h-4 w-4 mr-1" /> New Entry</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New Customs Entry</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Declaration Number</Label><Input value={form.declaration_number} onChange={e => setForm(f => ({ ...f, declaration_number: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Customs Broker</Label><Input value={form.customs_broker} onChange={e => setForm(f => ({ ...f, customs_broker: e.target.value }))} /></div>
                <div><Label>Broker Contact</Label><Input value={form.broker_contact} onChange={e => setForm(f => ({ ...f, broker_contact: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Entry Port</Label><Input value={form.entry_port} onChange={e => setForm(f => ({ ...f, entry_port: e.target.value }))} /></div>
                <div><Label>Arrival Date</Label><Input type="date" value={form.arrival_date} onChange={e => setForm(f => ({ ...f, arrival_date: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Duty Amount</Label><Input type="number" placeholder="0.00" value={form.duty_amount} onChange={e => setForm(f => ({ ...f, duty_amount: e.target.value }))} /></div>
                <div><Label>Tax Amount</Label><Input type="number" placeholder="0.00" value={form.tax_amount} onChange={e => setForm(f => ({ ...f, tax_amount: e.target.value }))} /></div>
              </div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="inspection">Inspection</SelectItem><SelectItem value="cleared">Cleared</SelectItem><SelectItem value="held">Held</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
              <Button className="w-full" onClick={handleCreate}>Submit Entry</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-purple-500/20 bg-purple-500/5"><CardContent className="p-4 flex items-center justify-between">
        <div><p className="text-xs text-muted-foreground">Total Duties & Taxes</p><p className="text-xl font-bold text-foreground">${totalDuties.toLocaleString()}</p></div>
        <div><p className="text-xs text-muted-foreground">Pending Clearance</p><p className="text-xl font-bold text-foreground">{clearances.filter(c => c.status !== 'cleared').length}</p></div>
      </CardContent></Card>

      <Tabs defaultValue="all" onValueChange={v => setStatusFilter(v === 'all' ? undefined : v)}>
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="inspection">Inspection</TabsTrigger>
          <TabsTrigger value="cleared">Cleared</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : clearances.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No customs clearance records yet.</p>
      ) : (
        <div className="space-y-3">
          {clearances.map(c => (
            <Card key={c.id}><CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-foreground">{c.declaration_number || 'No declaration #'}</p>
                  <p className="text-xs text-muted-foreground">PO: {(c as any).import_purchase_orders?.po_number || 'N/A'}</p>
                  <p className="text-xs text-muted-foreground">Broker: {c.customs_broker || 'N/A'}</p>
                  {c.entry_port && <p className="text-xs text-muted-foreground">Port: {c.entry_port}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground">
                    Duty: ${Number(c.duty_amount || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Tax: ${Number(c.tax_amount || 0).toLocaleString()}</p>
                  <Badge variant="outline" className={statusColors[c.status] || ''}>{c.status}</Badge>
                  {c.status !== 'cleared' && (
                    <Button size="sm" variant="ghost" className="mt-1 text-xs text-emerald-600" onClick={() => update(c.id, { status: 'cleared', clearance_date: new Date().toISOString().split('T')[0] })}>
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Mark Cleared
                    </Button>
                  )}
                </div>
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}
