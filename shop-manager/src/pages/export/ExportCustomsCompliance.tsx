import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useExportCustomsDocuments } from '@/hooks/export/useExportCustomsDocuments';
import { Loader2, Plus, FileCheck, Shield, Leaf, Bug, ScrollText } from 'lucide-react';

const docTypeIcons: Record<string, React.ReactNode> = {
  certificate_of_origin: <ScrollText className="h-4 w-4" />,
  phytosanitary: <Leaf className="h-4 w-4" />,
  fumigation: <Bug className="h-4 w-4" />,
  customs_declaration: <Shield className="h-4 w-4" />,
  health_certificate: <FileCheck className="h-4 w-4" />,
  inspection_certificate: <FileCheck className="h-4 w-4" />,
};

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  submitted: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  approved: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-600 border-red-500/20',
  expired: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
};

export default function ExportCustomsCompliance() {
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const { documents, loading, create } = useExportCustomsDocuments({ documentType: typeFilter });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    document_type: 'certificate_of_origin',
    document_number: '',
    issuing_authority: '',
    issue_date: '',
    expiry_date: '',
    hs_code: '',
    country_of_origin: '',
    destination_country: '',
    status: 'draft',
    inspector_name: '',
    inspection_result: '',
    notes: '',
  });

  const handleCreate = async () => {
    const ok = await create(form);
    if (ok) { setOpen(false); setForm({ ...form, document_number: '', issuing_authority: '', issue_date: '', expiry_date: '', hs_code: '', country_of_origin: '', destination_country: '', inspector_name: '', inspection_result: '', notes: '' }); }
  };

  const expiringSoon = documents.filter(d => {
    if (!d.expiry_date) return false;
    const days = (new Date(d.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return days > 0 && days <= 30;
  });

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Customs & Compliance</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white"><Plus className="h-4 w-4 mr-1" /> Add Document</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New Compliance Document</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Document Type</Label>
                <Select value={form.document_type} onValueChange={v => setForm(f => ({ ...f, document_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="certificate_of_origin">Certificate of Origin</SelectItem>
                    <SelectItem value="phytosanitary">Phytosanitary Certificate</SelectItem>
                    <SelectItem value="fumigation">Fumigation Certificate</SelectItem>
                    <SelectItem value="customs_declaration">Customs Declaration</SelectItem>
                    <SelectItem value="health_certificate">Health Certificate</SelectItem>
                    <SelectItem value="inspection_certificate">Inspection Certificate</SelectItem>
                    <SelectItem value="export_license">Export License</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Document Number</Label><Input value={form.document_number} onChange={e => setForm(f => ({ ...f, document_number: e.target.value }))} /></div>
              <div><Label>Issuing Authority</Label><Input value={form.issuing_authority} onChange={e => setForm(f => ({ ...f, issuing_authority: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Issue Date</Label><Input type="date" value={form.issue_date} onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))} /></div>
                <div><Label>Expiry Date</Label><Input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} /></div>
              </div>
              <div><Label>HS Code</Label><Input placeholder="e.g. 2501.00" value={form.hs_code} onChange={e => setForm(f => ({ ...f, hs_code: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Origin Country</Label><Input value={form.country_of_origin} onChange={e => setForm(f => ({ ...f, country_of_origin: e.target.value }))} /></div>
                <div><Label>Destination</Label><Input value={form.destination_country} onChange={e => setForm(f => ({ ...f, destination_country: e.target.value }))} /></div>
              </div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="submitted">Submitted</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="rejected">Rejected</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
              <Button className="w-full" onClick={handleCreate}>Save Document</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {expiringSoon.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-3">
            <p className="text-sm font-semibold text-amber-600">⚠️ {expiringSoon.length} document(s) expiring within 30 days</p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="all" onValueChange={v => setTypeFilter(v === 'all' ? undefined : v)}>
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="certificate_of_origin">CoO</TabsTrigger>
          <TabsTrigger value="phytosanitary">Phyto</TabsTrigger>
          <TabsTrigger value="customs_declaration">Customs</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : documents.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No compliance documents yet.</p>
      ) : (
        <div className="space-y-3">
          {documents.map(d => (
            <Card key={d.id}><CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">{docTypeIcons[d.document_type] || <FileCheck className="h-4 w-4" />}</div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{d.document_type?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</p>
                    <p className="text-xs text-muted-foreground">{d.document_number || 'No number'}</p>
                    {d.hs_code && <p className="text-xs text-blue-500">HS: {d.hs_code}</p>}
                    {d.country_of_origin && d.destination_country && (
                      <p className="text-xs text-muted-foreground">{d.country_of_origin} → {d.destination_country}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className={statusColors[d.status] || ''}>{d.status}</Badge>
                  {d.expiry_date && <p className="text-xs text-muted-foreground mt-1">Exp: {new Date(d.expiry_date).toLocaleDateString()}</p>}
                </div>
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}
