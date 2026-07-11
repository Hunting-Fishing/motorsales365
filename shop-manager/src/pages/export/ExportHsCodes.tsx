import React, { useState } from 'react';
import { useExportHsCodes } from '@/hooks/export/useExportHsCodes';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Hash, Trash2, Search, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function ExportHsCodes() {
  const { hsCodes, loading, create, remove } = useExportHsCodes();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [search, setSearch] = useState('');

  const handleSubmit = async () => {
    const ok = await create(form);
    if (ok) { setOpen(false); setForm({}); }
  };

  if (loading) return <div className="p-4 space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>;

  const filtered = hsCodes.filter(h =>
    h.hs_code.toLowerCase().includes(search.toLowerCase()) ||
    h.description.toLowerCase().includes(search.toLowerCase()) ||
    (h.destination_country || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">HS Codes & Tariffs</h1>
          <p className="text-sm text-muted-foreground">{hsCodes.length} codes in database</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add HS Code</Button></DialogTrigger>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add HS Code</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>HS Code</Label><Input value={form.hs_code || ''} onChange={e => setForm(f => ({ ...f, hs_code: e.target.value }))} placeholder="0712.90" /></div>
              <div><Label>Description</Label><Textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Dried vegetables, whole..." /></div>
              <div><Label>Product Category</Label><Input value={form.product_category || ''} onChange={e => setForm(f => ({ ...f, product_category: e.target.value }))} /></div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label>Chapter</Label><Input value={form.chapter || ''} onChange={e => setForm(f => ({ ...f, chapter: e.target.value }))} /></div>
                <div><Label>Heading</Label><Input value={form.heading || ''} onChange={e => setForm(f => ({ ...f, heading: e.target.value }))} /></div>
                <div><Label>Subheading</Label><Input value={form.subheading || ''} onChange={e => setForm(f => ({ ...f, subheading: e.target.value }))} /></div>
              </div>
              <div><Label>Destination Country</Label><Input value={form.destination_country || ''} onChange={e => setForm(f => ({ ...f, destination_country: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Import Duty %</Label><Input type="number" step="0.01" value={form.import_duty_rate || ''} onChange={e => setForm(f => ({ ...f, import_duty_rate: e.target.value }))} /></div>
                <div><Label>VAT %</Label><Input type="number" step="0.01" value={form.vat_rate || ''} onChange={e => setForm(f => ({ ...f, vat_rate: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Excise %</Label><Input type="number" step="0.01" value={form.excise_rate || ''} onChange={e => setForm(f => ({ ...f, excise_rate: e.target.value }))} /></div>
                <div><Label>Preferential %</Label><Input type="number" step="0.01" value={form.preferential_rate || ''} onChange={e => setForm(f => ({ ...f, preferential_rate: e.target.value }))} /></div>
              </div>
              <div><Label>Trade Agreement</Label><Input value={form.trade_agreement || ''} onChange={e => setForm(f => ({ ...f, trade_agreement: e.target.value }))} placeholder="CARICOM, EPA, etc." /></div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.requires_license || false} onCheckedChange={v => setForm(f => ({ ...f, requires_license: v }))} />Requires License</label>
                <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.restricted || false} onCheckedChange={v => setForm(f => ({ ...f, restricted: v }))} />Restricted</label>
              </div>
              <div><Label>Notes</Label><Textarea value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
              <Button onClick={handleSubmit} className="w-full">Add HS Code</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search HS codes, descriptions..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><Hash className="h-10 w-10 mx-auto mb-2 opacity-40" />{hsCodes.length === 0 ? 'No HS codes yet' : 'No results'}</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(h => (
            <Card key={h.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="font-mono font-semibold text-sm bg-muted px-1.5 py-0.5 rounded">{h.hs_code}</code>
                      {h.restricted && <Badge variant="destructive" className="text-xs">Restricted</Badge>}
                      {h.requires_license && <Badge variant="outline" className="text-xs border-yellow-500/30 text-yellow-700">License Req</Badge>}
                    </div>
                    <p className="text-sm text-foreground">{h.description}</p>
                    {h.destination_country && <p className="text-xs text-muted-foreground mt-1">→ {h.destination_country}</p>}
                    <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                      {h.import_duty_rate !== null && <span>Duty: {h.import_duty_rate}%</span>}
                      {h.vat_rate !== null && <span>VAT: {h.vat_rate}%</span>}
                      {h.preferential_rate !== null && <span>Pref: {h.preferential_rate}%</span>}
                      {h.trade_agreement && <Badge variant="secondary" className="text-xs">{h.trade_agreement}</Badge>}
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => remove(h.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
