import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useExportCustomsDeclarations } from '@/hooks/export/useExportCustomsDeclarations';
import { Loader2, Plus, ShieldCheck, Pencil, Trash2 } from 'lucide-react';

const filingTypes = ['AES', 'EEI', 'customs_entry', 'transit', 'warehouse'];
const statuses = ['draft', 'filed', 'accepted', 'rejected', 'amended', 'cancelled'];
const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700', filed: 'bg-blue-100 text-blue-700',
  accepted: 'bg-emerald-100 text-emerald-700', rejected: 'bg-red-100 text-red-700',
  amended: 'bg-amber-100 text-amber-700', cancelled: 'bg-slate-100 text-slate-500',
};

export default function ExportCustomsDeclarations() {
  const { declarations, loading, create, update, remove } = useExportCustomsDeclarations();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});

  const resetForm = () => { setForm({}); setEditId(null); };
  const openNew = () => { resetForm(); setOpen(true); };
  const openEdit = (d: any) => { setForm(d); setEditId(d.id); setOpen(true); };

  const handleSubmit = async () => {
    const ok = editId ? await update(editId, form) : await create(form);
    if (ok) { setOpen(false); resetForm(); }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-foreground" />
          <h1 className="text-2xl font-bold text-foreground">Customs Declarations</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />New Filing</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editId ? 'Edit' : 'New'} Declaration</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Declaration #</Label><Input value={form.declaration_number || ''} onChange={e => setForm({...form, declaration_number: e.target.value})} /></div>
                <div><Label>Filing Type</Label>
                  <Select value={form.filing_type || 'AES'} onValueChange={v => setForm({...form, filing_type: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{filingTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Type</Label>
                  <Select value={form.declaration_type || 'export'} onValueChange={v => setForm({...form, declaration_type: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="export">Export</SelectItem><SelectItem value="import">Import</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>Status</Label>
                  <Select value={form.status || 'draft'} onValueChange={v => setForm({...form, status: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{statuses.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>ITN Number</Label><Input value={form.itn_number || ''} onChange={e => setForm({...form, itn_number: e.target.value})} /></div>
              <div><Label>Shipment Ref</Label><Input value={form.shipment_reference || ''} onChange={e => setForm({...form, shipment_reference: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Exporter</Label><Input value={form.exporter_name || ''} onChange={e => setForm({...form, exporter_name: e.target.value})} /></div>
                <div><Label>Consignee</Label><Input value={form.consignee_name || ''} onChange={e => setForm({...form, consignee_name: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Origin Country</Label><Input value={form.origin_country || ''} onChange={e => setForm({...form, origin_country: e.target.value})} /></div>
                <div><Label>Destination</Label><Input value={form.destination_country || ''} onChange={e => setForm({...form, destination_country: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Value ($)</Label><Input type="number" value={form.total_value || ''} onChange={e => setForm({...form, total_value: e.target.value})} /></div>
                <div><Label>Transport Mode</Label><Input value={form.transport_mode || ''} onChange={e => setForm({...form, transport_mode: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Customs Broker</Label><Input value={form.customs_broker || ''} onChange={e => setForm({...form, customs_broker: e.target.value})} /></div>
                <div><Label>Broker Ref</Label><Input value={form.broker_reference || ''} onChange={e => setForm({...form, broker_reference: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Port of Export</Label><Input value={form.port_of_export || ''} onChange={e => setForm({...form, port_of_export: e.target.value})} /></div>
                <div><Label>Port of Entry</Label><Input value={form.port_of_entry || ''} onChange={e => setForm({...form, port_of_entry: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Filed Date</Label><Input type="date" value={form.filed_date || ''} onChange={e => setForm({...form, filed_date: e.target.value})} /></div>
                <div><Label>Accepted Date</Label><Input type="date" value={form.accepted_date || ''} onChange={e => setForm({...form, accepted_date: e.target.value})} /></div>
              </div>
              <Button className="w-full" onClick={handleSubmit}>{editId ? 'Update' : 'Create'} Declaration</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : declarations.length === 0 ? (
        <Card><CardContent className="p-8 text-center">
          <ShieldCheck className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-lg font-semibold text-foreground">No Declarations</p>
          <p className="text-sm text-muted-foreground">Track AES/EEI filings and customs entries.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {declarations.map(d => (
            <Card key={d.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{d.declaration_number || 'No Number'}</p>
                    <p className="text-sm text-muted-foreground">{d.filing_type} • {d.declaration_type} • {d.destination_country || 'N/A'}</p>
                    {d.shipment_reference && <p className="text-xs text-muted-foreground">Shipment: {d.shipment_reference}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs ${statusColors[d.status] || ''}`}>{d.status}</Badge>
                    {d.total_value > 0 && <span className="text-sm font-medium text-foreground">${Number(d.total_value).toLocaleString()}</span>}
                    <Button variant="ghost" size="icon" onClick={() => openEdit(d)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(d.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
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
