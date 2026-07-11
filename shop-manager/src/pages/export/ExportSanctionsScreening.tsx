import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useExportSanctionsScreenings } from '@/hooks/export/useExportSanctionsScreenings';
import { Loader2, Plus, ShieldAlert, Search } from 'lucide-react';
import { formatDate } from '@/utils/formatters';

const resultColors: Record<string, string> = {
  clear: 'bg-green-500/10 text-green-500',
  potential_match: 'bg-yellow-500/10 text-yellow-500',
  confirmed_match: 'bg-red-500/10 text-red-500',
  escalated: 'bg-orange-500/10 text-orange-500',
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-500',
  reviewed: 'bg-blue-500/10 text-blue-500',
  cleared: 'bg-green-500/10 text-green-500',
  blocked: 'bg-red-500/10 text-red-500',
};

export default function ExportSanctionsScreening() {
  const { screenings, loading, create } = useExportSanctionsScreenings();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    screened_entity: '',
    entity_type: 'customer',
    screening_source: 'OFAC',
    result: 'clear',
    risk_score: '',
    review_notes: '',
  });

  const filtered = screenings.filter(s =>
    s.screened_entity?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    await create({
      screened_entity: form.screened_entity,
      entity_type: form.entity_type,
      screening_source: form.screening_source,
      result: form.result,
      risk_score: parseFloat(form.risk_score) || 0,
      review_notes: form.review_notes || null,
    });
    setOpen(false);
    setForm({ screened_entity: '', entity_type: 'customer', screening_source: 'OFAC', result: 'clear', risk_score: '', review_notes: '' });
  };

  const matches = screenings.filter(s => s.result === 'potential_match' || s.result === 'confirmed_match').length;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-foreground" />
          <h1 className="text-2xl font-bold text-foreground">Sanctions Screening</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Screen Entity</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Screen Entity</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Entity Name *</Label><Input value={form.screened_entity} onChange={e => setForm({ ...form, screened_entity: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Entity Type</Label>
                  <Select value={form.entity_type} onValueChange={v => setForm({ ...form, entity_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="supplier">Supplier</SelectItem>
                      <SelectItem value="bank">Bank</SelectItem>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="vessel">Vessel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Source</Label>
                  <Select value={form.screening_source} onValueChange={v => setForm({ ...form, screening_source: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OFAC">OFAC</SelectItem>
                      <SelectItem value="EU">EU</SelectItem>
                      <SelectItem value="UN">UN</SelectItem>
                      <SelectItem value="BIS">BIS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Result</Label>
                  <Select value={form.result} onValueChange={v => setForm({ ...form, result: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clear">Clear</SelectItem>
                      <SelectItem value="potential_match">Potential Match</SelectItem>
                      <SelectItem value="confirmed_match">Confirmed Match</SelectItem>
                      <SelectItem value="escalated">Escalated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Risk Score (0-100)</Label><Input type="number" min="0" max="100" value={form.risk_score} onChange={e => setForm({ ...form, risk_score: e.target.value })} /></div>
              </div>
              <div><Label>Review Notes</Label><Textarea value={form.review_notes} onChange={e => setForm({ ...form, review_notes: e.target.value })} /></div>
              <Button className="w-full" onClick={handleCreate} disabled={!form.screened_entity}>Submit Screening</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-foreground">{screenings.length}</p><p className="text-xs text-muted-foreground">Total Screenings</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-500">{screenings.filter(s => s.result === 'clear').length}</p><p className="text-xs text-muted-foreground">Clear</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-red-500">{matches}</p><p className="text-xs text-muted-foreground">Matches</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-yellow-500">{screenings.filter(s => s.status === 'pending').length}</p><p className="text-xs text-muted-foreground">Pending Review</p></CardContent></Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search screenings..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center">
          <ShieldAlert className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-lg font-semibold text-foreground">No Screenings</p>
          <p className="text-sm text-muted-foreground">Screen customers and partners against sanctions lists.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(s => (
            <Card key={s.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{s.screened_entity}</span>
                      <Badge variant="outline" className={resultColors[s.result] || ''}>{s.result?.replace('_', ' ')}</Badge>
                      <Badge variant="outline" className={statusColors[s.status] || ''}>{s.status}</Badge>
                      <Badge variant="secondary">{s.entity_type}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>Source: {s.screening_source}</span>
                      {Number(s.risk_score) > 0 && <span>Risk: {Number(s.risk_score).toFixed(0)}%</span>}
                      {s.reviewed_by && <span>Reviewed by: {s.reviewed_by}</span>}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(s.screening_date)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
