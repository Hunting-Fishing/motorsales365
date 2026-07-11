import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useExportQualityInspections } from '@/hooks/export/useExportQualityInspections';
import { Loader2, Plus, ClipboardCheck, Search } from 'lucide-react';
import { formatDate } from '@/utils/formatters';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-500',
  in_progress: 'bg-blue-500/10 text-blue-500',
  passed: 'bg-green-500/10 text-green-500',
  failed: 'bg-red-500/10 text-red-500',
  conditional: 'bg-orange-500/10 text-orange-500',
};

const gradeColors: Record<string, string> = {
  A: 'bg-emerald-500/10 text-emerald-500',
  B: 'bg-blue-500/10 text-blue-500',
  C: 'bg-yellow-500/10 text-yellow-500',
  D: 'bg-orange-500/10 text-orange-500',
  F: 'bg-red-500/10 text-red-500',
};

export default function ExportQualityControl() {
  const { inspections, loading, create } = useExportQualityInspections();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    inspection_number: '',
    entity_type: 'shipment',
    entity_label: '',
    inspector_name: '',
    inspection_type: 'pre_shipment',
    overall_grade: '',
    findings: '',
    corrective_actions: '',
    certificate_number: '',
  });

  const filtered = inspections.filter(i =>
    i.inspection_number?.toLowerCase().includes(search.toLowerCase()) ||
    i.entity_label?.toLowerCase().includes(search.toLowerCase()) ||
    i.inspector_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    await create({
      inspection_number: form.inspection_number || `QC-${Date.now().toString(36).toUpperCase()}`,
      entity_type: form.entity_type,
      entity_label: form.entity_label,
      inspector_name: form.inspector_name,
      inspection_type: form.inspection_type,
      overall_grade: form.overall_grade || null,
      findings: form.findings || null,
      corrective_actions: form.corrective_actions || null,
      certificate_number: form.certificate_number || null,
    });
    setOpen(false);
    setForm({ inspection_number: '', entity_type: 'shipment', entity_label: '', inspector_name: '', inspection_type: 'pre_shipment', overall_grade: '', findings: '', corrective_actions: '', certificate_number: '' });
  };

  const stats = {
    total: inspections.length,
    passed: inspections.filter(i => i.status === 'passed').length,
    failed: inspections.filter(i => i.status === 'failed').length,
    pending: inspections.filter(i => i.status === 'pending').length,
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-6 w-6 text-foreground" />
          <h1 className="text-2xl font-bold text-foreground">Quality Control</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Inspection</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New Inspection</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Inspection #</Label><Input placeholder="Auto" value={form.inspection_number} onChange={e => setForm({ ...form, inspection_number: e.target.value })} /></div>
                <div><Label>Type</Label>
                  <Select value={form.inspection_type} onValueChange={v => setForm({ ...form, inspection_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pre_shipment">Pre-Shipment</SelectItem>
                      <SelectItem value="incoming">Incoming</SelectItem>
                      <SelectItem value="final">Final</SelectItem>
                      <SelectItem value="random">Random</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Entity Type</Label>
                  <Select value={form.entity_type} onValueChange={v => setForm({ ...form, entity_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shipment">Shipment</SelectItem>
                      <SelectItem value="product">Product</SelectItem>
                      <SelectItem value="lot">Lot/Batch</SelectItem>
                      <SelectItem value="container">Container</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Entity Label</Label><Input value={form.entity_label} onChange={e => setForm({ ...form, entity_label: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Inspector</Label><Input value={form.inspector_name} onChange={e => setForm({ ...form, inspector_name: e.target.value })} /></div>
                <div><Label>Grade</Label>
                  <Select value={form.overall_grade} onValueChange={v => setForm({ ...form, overall_grade: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {['A', 'B', 'C', 'D', 'F'].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Findings</Label><Textarea value={form.findings} onChange={e => setForm({ ...form, findings: e.target.value })} /></div>
              <div><Label>Corrective Actions</Label><Textarea value={form.corrective_actions} onChange={e => setForm({ ...form, corrective_actions: e.target.value })} /></div>
              <div><Label>Certificate #</Label><Input value={form.certificate_number} onChange={e => setForm({ ...form, certificate_number: e.target.value })} /></div>
              <Button className="w-full" onClick={handleCreate}>Create Inspection</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-foreground">{stats.total}</p><p className="text-xs text-muted-foreground">Total</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-500">{stats.passed}</p><p className="text-xs text-muted-foreground">Passed</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-red-500">{stats.failed}</p><p className="text-xs text-muted-foreground">Failed</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-yellow-500">{stats.pending}</p><p className="text-xs text-muted-foreground">Pending</p></CardContent></Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search inspections..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center">
          <ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-lg font-semibold text-foreground">No Inspections</p>
          <p className="text-sm text-muted-foreground">Create a quality inspection to begin.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(i => (
            <Card key={i.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{i.inspection_number}</span>
                      <Badge variant="outline" className={statusColors[i.status] || ''}>{i.status}</Badge>
                      {i.overall_grade && <Badge variant="outline" className={gradeColors[i.overall_grade] || ''}>Grade {i.overall_grade}</Badge>}
                      <Badge variant="secondary">{i.inspection_type?.replace('_', '-')}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{i.entity_type}: {i.entity_label || 'N/A'}</p>
                    {i.inspector_name && <p className="text-xs text-muted-foreground">Inspector: {i.inspector_name}</p>}
                    {i.findings && <p className="text-xs text-muted-foreground mt-1 truncate">{i.findings}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(i.inspection_date)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
