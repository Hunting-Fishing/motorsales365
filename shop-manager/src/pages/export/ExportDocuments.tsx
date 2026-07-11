import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Loader2, FileText } from 'lucide-react';

export default function ExportDocuments() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: '', document_type: 'export_license', document_number: '', issue_date: '', expiry_date: '', issued_by: '', notes: '' });

  const fetchData = async () => { if (!shopId) return; setLoading(true); const { data } = await supabase.from('export_documents').select('*').eq('shop_id', shopId).order('created_at', { ascending: false }); setDocs(data || []); setLoading(false); };
  useEffect(() => { fetchData(); }, [shopId]);

  const handleCreate = async () => {
    if (!shopId || !form.title || !form.document_type) return;
    const { error } = await supabase.from('export_documents').insert({ ...form, shop_id: shopId, issue_date: form.issue_date || null, expiry_date: form.expiry_date || null });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Document added' }); setDialogOpen(false); fetchData();
  };

  const filtered = docs.filter(d => d.title.toLowerCase().includes(search.toLowerCase()));
  const typeLabel = (t: string) => ({ export_license: 'Export License', phytosanitary: 'Phytosanitary Cert', customs_declaration: 'Customs Declaration', certificate_of_origin: 'Certificate of Origin', bill_of_lading: 'Bill of Lading', packing_list: 'Packing List', insurance: 'Insurance', other: 'Other' }[t] || t);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Export Documents</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Add Document</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Compliance Document</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
              <div><Label>Document Type</Label><Select value={form.document_type} onValueChange={v => setForm(p => ({ ...p, document_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                {['export_license','phytosanitary','customs_declaration','certificate_of_origin','bill_of_lading','packing_list','insurance','other'].map(t => <SelectItem key={t} value={t}>{typeLabel(t)}</SelectItem>)}
              </SelectContent></Select></div>
              <div><Label>Document Number</Label><Input value={form.document_number} onChange={e => setForm(p => ({ ...p, document_number: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Issue Date</Label><Input type="date" value={form.issue_date} onChange={e => setForm(p => ({ ...p, issue_date: e.target.value }))} /></div>
                <div><Label>Expiry Date</Label><Input type="date" value={form.expiry_date} onChange={e => setForm(p => ({ ...p, expiry_date: e.target.value }))} /></div>
              </div>
              <div><Label>Issued By</Label><Input value={form.issued_by} onChange={e => setForm(p => ({ ...p, issued_by: e.target.value }))} /></div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
              <Button onClick={handleCreate} className="w-full">Add Document</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search documents..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No documents found</p> : (
        <div className="space-y-3">
          {filtered.map(d => (
            <Card key={d.id}><CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-fuchsia-500 to-pink-600 flex items-center justify-center"><FileText className="h-5 w-5 text-white" /></div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">{d.title}</p>
                <p className="text-sm text-muted-foreground">{typeLabel(d.document_type)} • {d.document_number || 'No number'}</p>
                <p className="text-xs text-muted-foreground">{d.issued_by || ''} {d.expiry_date ? `• Expires: ${new Date(d.expiry_date).toLocaleDateString()}` : ''}</p>
              </div>
              <Badge variant={d.status === 'active' ? 'default' : 'outline'}>{d.status}</Badge>
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}
