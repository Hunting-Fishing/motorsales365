import React, { useState } from 'react';
import { useExportCountryRequirements } from '@/hooks/export/useExportCountryRequirements';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Globe2, Trash2, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function ExportCountryRequirements() {
  const { requirements, loading, create, remove } = useExportCountryRequirements();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});

  const handleSubmit = async () => {
    const ok = await create({
      ...form,
      required_documents: form.required_documents?.split(',').map((s: string) => s.trim()).filter(Boolean) || [],
      restricted_items: form.restricted_items?.split(',').map((s: string) => s.trim()).filter(Boolean) || [],
      certification_needed: form.certification_needed?.split(',').map((s: string) => s.trim()).filter(Boolean) || [],
    });
    if (ok) { setOpen(false); setForm({}); }
  };

  if (loading) return <div className="p-4 space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Country Requirements</h1>
          <p className="text-sm text-muted-foreground">Per-destination import regulations</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Country</Button></DialogTrigger>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add Country Requirements</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Country Code</Label><Input value={form.country_code || ''} onChange={e => setForm(f => ({ ...f, country_code: e.target.value.toUpperCase() }))} placeholder="US" /></div>
                <div><Label>Country Name</Label><Input value={form.country_name || ''} onChange={e => setForm(f => ({ ...f, country_name: e.target.value }))} /></div>
              </div>
              <div><Label>Product Category</Label><Input value={form.product_category || ''} onChange={e => setForm(f => ({ ...f, product_category: e.target.value }))} /></div>
              <div><Label>Required Documents (comma-separated)</Label><Textarea value={form.required_documents || ''} onChange={e => setForm(f => ({ ...f, required_documents: e.target.value }))} placeholder="Bill of Lading, Certificate of Origin" /></div>
              <div><Label>Restricted Items (comma-separated)</Label><Textarea value={form.restricted_items || ''} onChange={e => setForm(f => ({ ...f, restricted_items: e.target.value }))} /></div>
              <div><Label>Certifications Needed (comma-separated)</Label><Input value={form.certification_needed || ''} onChange={e => setForm(f => ({ ...f, certification_needed: e.target.value }))} /></div>
              <div><Label>Labeling Rules</Label><Textarea value={form.labeling_rules || ''} onChange={e => setForm(f => ({ ...f, labeling_rules: e.target.value }))} /></div>
              <div><Label>Quarantine Requirements</Label><Textarea value={form.quarantine_requirements || ''} onChange={e => setForm(f => ({ ...f, quarantine_requirements: e.target.value }))} /></div>
              <div><Label>Import Duties Info</Label><Textarea value={form.import_duties_info || ''} onChange={e => setForm(f => ({ ...f, import_duties_info: e.target.value }))} /></div>
              <div><Label>Special Notes</Label><Textarea value={form.special_notes || ''} onChange={e => setForm(f => ({ ...f, special_notes: e.target.value }))} /></div>
              <Button onClick={handleSubmit} className="w-full">Save Requirements</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {requirements.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><Globe2 className="h-10 w-10 mx-auto mb-2 opacity-40" />No country requirements yet</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {requirements.map(r => (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">{r.country_code}</span>
                      <span className="text-sm text-foreground">{r.country_name}</span>
                      {r.product_category && <Badge variant="secondary" className="text-xs">{r.product_category}</Badge>}
                    </div>
                    {r.required_documents?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {r.required_documents.map((d: string, i: number) => <Badge key={i} variant="outline" className="text-xs">{d}</Badge>)}
                      </div>
                    )}
                    {r.restricted_items?.length > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <AlertTriangle className="h-3 w-3 text-destructive" />
                        <span className="text-xs text-destructive">{r.restricted_items.join(', ')}</span>
                      </div>
                    )}
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
