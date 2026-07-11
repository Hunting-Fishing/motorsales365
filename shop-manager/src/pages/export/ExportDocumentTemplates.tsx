import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useExportDocumentTemplates } from '@/hooks/export/useExportDocumentTemplates';
import { Loader2, Plus, FileText, Pencil, Trash2, Star } from 'lucide-react';

const templateTypes = [
  'commercial_invoice', 'packing_list', 'bill_of_lading', 'certificate_of_origin',
  'proforma_invoice', 'shipping_instructions', 'customs_declaration', 'insurance_certificate',
];

export default function ExportDocumentTemplates() {
  const { templates, loading, create, update, remove } = useExportDocumentTemplates();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});

  const resetForm = () => { setForm({}); setEditId(null); };
  const openNew = () => { resetForm(); setOpen(true); };
  const openEdit = (t: any) => { setForm(t); setEditId(t.id); setOpen(true); };

  const handleSubmit = async () => {
    const ok = editId ? await update(editId, form) : await create(form);
    if (ok) { setOpen(false); resetForm(); }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-foreground" />
          <h1 className="text-2xl font-bold text-foreground">Document Templates</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />New Template</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editId ? 'Edit' : 'Create'} Template</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Template Name *</Label><Input value={form.template_name || ''} onChange={e => setForm({...form, template_name: e.target.value})} /></div>
              <div><Label>Type</Label>
                <Select value={form.template_type || 'commercial_invoice'} onValueChange={v => setForm({...form, template_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{templateTypes.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Description</Label><Textarea value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} rows={2} /></div>
              <div><Label>Default Terms</Label><Textarea value={form.default_terms || ''} onChange={e => setForm({...form, default_terms: e.target.value})} rows={3} /></div>
              <div><Label>Logo URL</Label><Input value={form.logo_url || ''} onChange={e => setForm({...form, logo_url: e.target.value})} /></div>
              <div className="flex items-center justify-between">
                <Label>Set as Default</Label>
                <Switch checked={form.is_default || false} onCheckedChange={v => setForm({...form, is_default: v})} />
              </div>
              <Button className="w-full" onClick={handleSubmit}>{editId ? 'Update' : 'Create'} Template</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : templates.length === 0 ? (
        <Card><CardContent className="p-8 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-lg font-semibold text-foreground">No Templates</p>
          <p className="text-sm text-muted-foreground">Create templates for Bills of Lading, Commercial Invoices, Packing Lists, and more.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {templates.map(t => (
            <Card key={t.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-fuchsia-500/10"><FileText className="h-4 w-4 text-fuchsia-500" /></div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground">{t.template_name}</p>
                        {t.is_default && <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />}
                      </div>
                      <Badge variant="outline" className="text-xs mt-1">{(t.template_type || '').replace(/_/g, ' ')}</Badge>
                      {t.description && <p className="text-xs text-muted-foreground mt-1">{t.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="text-xs">v{t.version || 1}</Badge>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(t.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
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
