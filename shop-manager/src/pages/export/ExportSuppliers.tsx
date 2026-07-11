import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useExportSuppliers } from '@/hooks/export/useExportSuppliers';
import { Plus, Search, Loader2, Factory, Star, Clock, Trash2 } from 'lucide-react';

const EMPTY = {
  company_name: '', contact_name: '', email: '', phone: '', website: '',
  country: '', city: '', address: '', tax_id: '',
  payment_terms: 'Net 30', currency: 'USD',
  lead_time_days: 0, notes: '',
};

export default function ExportSuppliers() {
  const { suppliers, loading, create, remove } = useExportSuppliers();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  const handleCreate = async () => {
    if (!form.company_name) return;
    const ok = await create(form);
    if (ok) { setDialogOpen(false); setForm({ ...EMPTY }); }
  };

  const filtered = suppliers.filter(s =>
    s.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.country?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Suppliers</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Add Supplier</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add Supplier</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Company Name *</Label><Input value={form.company_name} onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))} /></div>
              <div><Label>Contact Name</Label><Input value={form.contact_name} onChange={e => setForm(p => ({ ...p, contact_name: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
                <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Country</Label><Input value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))} /></div>
                <div><Label>City</Label><Input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} /></div>
              </div>
              <div><Label>Address</Label><Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Payment Terms</Label>
                  <Select value={form.payment_terms} onValueChange={v => setForm(p => ({ ...p, payment_terms: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{['Prepaid','Net 15','Net 30','Net 45','Net 60','Net 90'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Lead Time (days)</Label><Input type="number" value={form.lead_time_days} onChange={e => setForm(p => ({ ...p, lead_time_days: Number(e.target.value) }))} /></div>
              </div>
              <div><Label>Website</Label><Input value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} /></div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
              <Button onClick={handleCreate} className="w-full">Add Supplier</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search suppliers..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>

      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No suppliers found</p> : (
        <div className="space-y-3">
          {filtered.map(s => (
            <Card key={s.id}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shrink-0">
                  <Factory className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground truncate">{s.company_name}</p>
                    {s.is_preferred && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{s.contact_name || 'No contact'} • {s.country || 'N/A'}{s.city ? `, ${s.city}` : ''}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {s.lead_time_days || 0}d lead</span>
                    <span>{s.payment_terms || 'Net 30'}</span>
                    {Number(s.total_orders || 0) > 0 && <span>{s.total_orders} orders</span>}
                    {Number(s.total_spend || 0) > 0 && <span>${Number(s.total_spend).toLocaleString()}</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge variant={s.is_active !== false ? 'default' : 'secondary'} className="text-[10px]">{s.is_active !== false ? 'Active' : 'Inactive'}</Badge>
                  {Number(s.quality_rating || 0) > 0 && (
                    <div className="flex items-center gap-0.5">
                      {[1,2,3,4,5].map(n => <Star key={n} className={`h-3 w-3 ${n <= Number(s.quality_rating) ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground/30'}`} />)}
                    </div>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); remove(s.id); }}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
