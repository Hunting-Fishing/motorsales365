import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useExportPorts } from '@/hooks/export/useExportPorts';
import { Loader2, Plus, Anchor, MapPin, Pencil, Trash2 } from 'lucide-react';

const portTypes = ['sea', 'air', 'rail', 'inland', 'multimodal'];

export default function ExportPorts() {
  const { ports, loading, create, update, remove } = useExportPorts();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [search, setSearch] = useState('');

  const resetForm = () => { setForm({}); setEditId(null); };
  const openNew = () => { resetForm(); setOpen(true); };
  const openEdit = (p: any) => { setForm(p); setEditId(p.id); setOpen(true); };

  const handleSubmit = async () => {
    const ok = editId ? await update(editId, form) : await create(form);
    if (ok) { setOpen(false); resetForm(); }
  };

  const filtered = ports.filter(p =>
    (p.port_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.country || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.port_code || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Anchor className="h-6 w-6 text-foreground" />
          <h1 className="text-2xl font-bold text-foreground">Ports & Terminals</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />Add Port</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editId ? 'Edit Port' : 'Add Port'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Port Name *</Label><Input value={form.port_name || ''} onChange={e => setForm({...form, port_name: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Port Code</Label><Input value={form.port_code || ''} onChange={e => setForm({...form, port_code: e.target.value})} placeholder="e.g. USNYC" /></div>
                <div><Label>Type</Label>
                  <Select value={form.port_type || 'sea'} onValueChange={v => setForm({...form, port_type: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{portTypes.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Country *</Label><Input value={form.country || ''} onChange={e => setForm({...form, country: e.target.value})} /></div>
                <div><Label>City</Label><Input value={form.city || ''} onChange={e => setForm({...form, city: e.target.value})} /></div>
              </div>
              <div><Label>Terminal Info</Label><Input value={form.terminal_info || ''} onChange={e => setForm({...form, terminal_info: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Contact Name</Label><Input value={form.contact_name || ''} onChange={e => setForm({...form, contact_name: e.target.value})} /></div>
                <div><Label>Contact Phone</Label><Input value={form.contact_phone || ''} onChange={e => setForm({...form, contact_phone: e.target.value})} /></div>
              </div>
              <div><Label>Contact Email</Label><Input value={form.contact_email || ''} onChange={e => setForm({...form, contact_email: e.target.value})} /></div>
              <div><Label>Operating Hours</Label><Input value={form.operating_hours || ''} onChange={e => setForm({...form, operating_hours: e.target.value})} /></div>
              <Button className="w-full" onClick={handleSubmit}>{editId ? 'Update' : 'Add'} Port</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Input placeholder="Search ports..." value={search} onChange={e => setSearch(e.target.value)} />

      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center">
          <Anchor className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-lg font-semibold text-foreground">No Ports</p>
          <p className="text-sm text-muted-foreground">Add ports and terminals to track your logistics network.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10"><MapPin className="h-4 w-4 text-blue-500" /></div>
                    <div>
                      <p className="font-semibold text-foreground">{p.port_name}</p>
                      <p className="text-sm text-muted-foreground">{p.city ? `${p.city}, ` : ''}{p.country}</p>
                      {p.terminal_info && <p className="text-xs text-muted-foreground mt-1">{p.terminal_info}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.port_code && <Badge variant="outline" className="text-xs">{p.port_code}</Badge>}
                    <Badge variant="secondary" className="text-xs">{p.port_type}</Badge>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(p.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
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
