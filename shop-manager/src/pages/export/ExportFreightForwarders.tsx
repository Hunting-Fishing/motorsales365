import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useExportFreightForwarders } from '@/hooks/export/useExportFreightForwarders';
import { Loader2, Plus, Truck, Search, Star, Phone, Mail, MapPin } from 'lucide-react';

const statusColors: Record<string, string> = {
  active: 'bg-green-500/10 text-green-500',
  inactive: 'bg-slate-500/10 text-slate-500',
  suspended: 'bg-red-500/10 text-red-500',
};

export default function ExportFreightForwarders() {
  const { forwarders, loading, create } = useExportFreightForwarders();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    country: '',
    license_number: '',
    payment_terms: '',
    notes: '',
  });

  const filtered = forwarders.filter(f =>
    f.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    f.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
    f.country?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    await create({
      company_name: form.company_name,
      contact_name: form.contact_name || null,
      email: form.email || null,
      phone: form.phone || null,
      country: form.country || null,
      license_number: form.license_number || null,
      payment_terms: form.payment_terms || null,
      notes: form.notes || null,
    });
    setOpen(false);
    setForm({ company_name: '', contact_name: '', email: '', phone: '', country: '', license_number: '', payment_terms: '', notes: '' });
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="h-6 w-6 text-foreground" />
          <h1 className="text-2xl font-bold text-foreground">Freight Forwarders</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Partner</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add Freight Forwarder</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Company Name *</Label><Input value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Contact</Label><Input value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} /></div>
                <div><Label>Country</Label><Input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>License #</Label><Input value={form.license_number} onChange={e => setForm({ ...form, license_number: e.target.value })} /></div>
                <div><Label>Payment Terms</Label><Input value={form.payment_terms} onChange={e => setForm({ ...form, payment_terms: e.target.value })} /></div>
              </div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <Button className="w-full" onClick={handleCreate} disabled={!form.company_name}>Add Forwarder</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-foreground">{forwarders.length}</p><p className="text-xs text-muted-foreground">Total Partners</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-500">{forwarders.filter(f => f.status === 'active').length}</p><p className="text-xs text-muted-foreground">Active</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-yellow-500">{forwarders.filter(f => f.preferred).length}</p><p className="text-xs text-muted-foreground">Preferred</p></CardContent></Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search forwarders..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center">
          <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-lg font-semibold text-foreground">No Freight Forwarders</p>
          <p className="text-sm text-muted-foreground">Add a logistics partner to get started.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(f => (
            <Card key={f.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{f.company_name}</span>
                      <Badge variant="outline" className={statusColors[f.status] || ''}>{f.status}</Badge>
                      {f.preferred && <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500"><Star className="h-3 w-3 mr-1" />Preferred</Badge>}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                      {f.contact_name && <span>{f.contact_name}</span>}
                      {f.country && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{f.country}</span>}
                      {f.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{f.email}</span>}
                      {f.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{f.phone}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>Shipments: {f.total_shipments}</span>
                      <span>On-time: {Number(f.on_time_rate || 0).toFixed(0)}%</span>
                      {Number(f.rating) > 0 && <span>Rating: {Number(f.rating).toFixed(1)}/5</span>}
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
