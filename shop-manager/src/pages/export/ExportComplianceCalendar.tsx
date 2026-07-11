import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useExportComplianceCalendar } from '@/hooks/export/useExportComplianceCalendar';
import { Loader2, Plus, CalendarDays, Search, AlertTriangle } from 'lucide-react';
import { formatDate } from '@/utils/formatters';

const statusColors: Record<string, string> = {
  upcoming: 'bg-blue-500/10 text-blue-500',
  due_soon: 'bg-yellow-500/10 text-yellow-500',
  overdue: 'bg-red-500/10 text-red-500',
  completed: 'bg-green-500/10 text-green-500',
  cancelled: 'bg-slate-500/10 text-slate-500',
};

const priorityColors: Record<string, string> = {
  low: 'bg-slate-500/10 text-slate-500',
  medium: 'bg-blue-500/10 text-blue-500',
  high: 'bg-orange-500/10 text-orange-500',
  critical: 'bg-red-500/10 text-red-500',
};

export default function ExportComplianceCalendar() {
  const { items, loading, create } = useExportComplianceCalendar();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    compliance_type: 'license_renewal',
    entity_label: '',
    due_date: '',
    reminder_days: '30',
    priority: 'medium',
    authority: '',
    reference_number: '',
    notes: '',
  });

  const filtered = items.filter(i =>
    i.title?.toLowerCase().includes(search.toLowerCase()) ||
    i.authority?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    await create({
      title: form.title,
      compliance_type: form.compliance_type,
      entity_label: form.entity_label || null,
      due_date: form.due_date,
      reminder_days: parseInt(form.reminder_days) || 30,
      priority: form.priority,
      authority: form.authority || null,
      reference_number: form.reference_number || null,
      notes: form.notes || null,
    });
    setOpen(false);
    setForm({ title: '', compliance_type: 'license_renewal', entity_label: '', due_date: '', reminder_days: '30', priority: 'medium', authority: '', reference_number: '', notes: '' });
  };

  const overdue = items.filter(i => i.status === 'overdue').length;
  const dueSoon = items.filter(i => i.status === 'due_soon').length;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-foreground" />
          <h1 className="text-2xl font-bold text-foreground">Compliance Calendar</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Item</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add Compliance Item</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Type</Label>
                  <Select value={form.compliance_type} onValueChange={v => setForm({ ...form, compliance_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="license_renewal">License Renewal</SelectItem>
                      <SelectItem value="certificate_expiry">Certificate Expiry</SelectItem>
                      <SelectItem value="filing_deadline">Filing Deadline</SelectItem>
                      <SelectItem value="inspection">Inspection</SelectItem>
                      <SelectItem value="audit">Audit</SelectItem>
                      <SelectItem value="permit">Permit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Priority</Label>
                  <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Due Date *</Label><Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
                <div><Label>Reminder (days before)</Label><Input type="number" value={form.reminder_days} onChange={e => setForm({ ...form, reminder_days: e.target.value })} /></div>
              </div>
              <div><Label>Entity / Subject</Label><Input value={form.entity_label} onChange={e => setForm({ ...form, entity_label: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Authority</Label><Input value={form.authority} onChange={e => setForm({ ...form, authority: e.target.value })} /></div>
                <div><Label>Reference #</Label><Input value={form.reference_number} onChange={e => setForm({ ...form, reference_number: e.target.value })} /></div>
              </div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <Button className="w-full" onClick={handleCreate} disabled={!form.title || !form.due_date}>Add Item</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-foreground">{items.length}</p><p className="text-xs text-muted-foreground">Total</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-red-500">{overdue}</p><p className="text-xs text-muted-foreground">Overdue</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-yellow-500">{dueSoon}</p><p className="text-xs text-muted-foreground">Due Soon</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-500">{items.filter(i => i.status === 'completed').length}</p><p className="text-xs text-muted-foreground">Completed</p></CardContent></Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search compliance items..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center">
          <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-lg font-semibold text-foreground">No Compliance Items</p>
          <p className="text-sm text-muted-foreground">Track licenses, certificates, and filing deadlines.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(i => (
            <Card key={i.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {i.status === 'overdue' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                      <span className="font-semibold text-foreground">{i.title}</span>
                      <Badge variant="outline" className={statusColors[i.status] || ''}>{i.status?.replace('_', ' ')}</Badge>
                      <Badge variant="outline" className={priorityColors[i.priority] || ''}>{i.priority}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                      <span>{i.compliance_type?.replace('_', ' ')}</span>
                      {i.authority && <span>Authority: {i.authority}</span>}
                      {i.entity_label && <span>Re: {i.entity_label}</span>}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">Due: {formatDate(i.due_date)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
