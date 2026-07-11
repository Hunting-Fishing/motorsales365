import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useExportBondedWarehouses } from '@/hooks/export/useExportBondedWarehouses';
import { Loader2, Plus, Warehouse, Pencil, Trash2 } from 'lucide-react';

const warehouseTypes = ['bonded', 'free_trade_zone', 'customs_bonded', 'foreign_trade_zone'];

export default function ExportBondedWarehouses() {
  const { warehouses, loading, create, update, remove } = useExportBondedWarehouses();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});

  const resetForm = () => { setForm({}); setEditId(null); };
  const openNew = () => { resetForm(); setOpen(true); };
  const openEdit = (w: any) => { setForm(w); setEditId(w.id); setOpen(true); };

  const handleSubmit = async () => {
    const ok = editId ? await update(editId, form) : await create(form);
    if (ok) { setOpen(false); resetForm(); }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Warehouse className="h-6 w-6 text-foreground" />
          <h1 className="text-2xl font-bold text-foreground">Bonded Warehouses & FTZ</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />Add Warehouse</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editId ? 'Edit' : 'Add'} Bonded Warehouse</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Warehouse Name *</Label><Input value={form.warehouse_name || ''} onChange={e => setForm({...form, warehouse_name: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Type</Label>
                  <Select value={form.warehouse_type || 'bonded'} onValueChange={v => setForm({...form, warehouse_type: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{warehouseTypes.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>License #</Label><Input value={form.license_number || ''} onChange={e => setForm({...form, license_number: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Location</Label><Input value={form.location || ''} onChange={e => setForm({...form, location: e.target.value})} /></div>
                <div><Label>Country</Label><Input value={form.country || ''} onChange={e => setForm({...form, country: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Capacity Total</Label><Input type="number" value={form.capacity_total || ''} onChange={e => setForm({...form, capacity_total: e.target.value})} /></div>
                <div><Label>Capacity Used</Label><Input type="number" value={form.capacity_used || ''} onChange={e => setForm({...form, capacity_used: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Storage Rate/Day ($)</Label><Input type="number" value={form.storage_rate_per_day || ''} onChange={e => setForm({...form, storage_rate_per_day: e.target.value})} /></div>
                <div><Label>Bond Amount ($)</Label><Input type="number" value={form.bond_amount || ''} onChange={e => setForm({...form, bond_amount: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>License Expiry</Label><Input type="date" value={form.license_expiry || ''} onChange={e => setForm({...form, license_expiry: e.target.value})} /></div>
                <div><Label>Bond Expiry</Label><Input type="date" value={form.bond_expiry || ''} onChange={e => setForm({...form, bond_expiry: e.target.value})} /></div>
              </div>
              <div><Label>Customs Office</Label><Input value={form.customs_office || ''} onChange={e => setForm({...form, customs_office: e.target.value})} /></div>
              <div><Label>Contact Name</Label><Input value={form.contact_name || ''} onChange={e => setForm({...form, contact_name: e.target.value})} /></div>
              <Button className="w-full" onClick={handleSubmit}>{editId ? 'Update' : 'Add'} Warehouse</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : warehouses.length === 0 ? (
        <Card><CardContent className="p-8 text-center">
          <Warehouse className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-lg font-semibold text-foreground">No Bonded Warehouses</p>
          <p className="text-sm text-muted-foreground">Track bonded storage and free trade zone inventory.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {warehouses.map(w => {
            const cap = Number(w.capacity_total) || 1;
            const used = Number(w.capacity_used) || 0;
            const pct = Math.min((used / cap) * 100, 100);
            return (
              <Card key={w.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-foreground">{w.warehouse_name}</p>
                      <p className="text-sm text-muted-foreground">{w.location ? `${w.location}, ` : ''}{w.country || ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">{(w.warehouse_type || '').replace(/_/g, ' ')}</Badge>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(w)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(w.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Capacity: {used.toLocaleString()} / {cap.toLocaleString()}</span>
                      <span>{pct.toFixed(0)}%</span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                  {w.license_number && <p className="text-xs text-muted-foreground mt-2">License: {w.license_number}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
