import React, { useState } from 'react';
import { useExportAgingReports } from '@/hooks/export/useExportAgingReports';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Loader2, Trash2, CreditCard } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ExportAgingReports() {
  const { records, loading, create, remove } = useExportAgingReports();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({ report_type: 'receivable', currency: 'USD' });
  const [tab, setTab] = useState('receivable');

  const handleSubmit = async () => {
    const total = Number(form.current_amount || 0) + Number(form.days_30 || 0) + Number(form.days_60 || 0) + Number(form.days_90 || 0) + Number(form.days_120_plus || 0);
    const ok = await create({ ...form, total_outstanding: total });
    if (ok) { setOpen(false); setForm({ report_type: 'receivable', currency: 'USD' }); }
  };

  const fmt = (v: any) => Number(v || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });
  const filtered = records.filter(r => r.report_type === tab);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AR/AP Aging Reports</h1>
          <p className="text-muted-foreground">Receivables and payables breakdown by age</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />Add Record</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Aging Record</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div><Label>Type</Label>
                <Select value={form.report_type} onValueChange={v => setForm({...form, report_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receivable">Receivable (AR)</SelectItem>
                    <SelectItem value="payable">Payable (AP)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Counterparty</Label><Input value={form.counterparty_name || ''} onChange={e => setForm({...form, counterparty_name: e.target.value})} /></div>
              <div><Label>As of Date</Label><Input type="date" value={form.as_of_date || ''} onChange={e => setForm({...form, as_of_date: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Current</Label><Input type="number" value={form.current_amount || ''} onChange={e => setForm({...form, current_amount: Number(e.target.value)})} /></div>
                <div><Label>30 Days</Label><Input type="number" value={form.days_30 || ''} onChange={e => setForm({...form, days_30: Number(e.target.value)})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>60 Days</Label><Input type="number" value={form.days_60 || ''} onChange={e => setForm({...form, days_60: Number(e.target.value)})} /></div>
                <div><Label>90 Days</Label><Input type="number" value={form.days_90 || ''} onChange={e => setForm({...form, days_90: Number(e.target.value)})} /></div>
              </div>
              <div><Label>120+ Days</Label><Input type="number" value={form.days_120_plus || ''} onChange={e => setForm({...form, days_120_plus: Number(e.target.value)})} /></div>
            </div>
            <Button onClick={handleSubmit} className="w-full">Save Record</Button>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList><TabsTrigger value="receivable">Receivables (AR)</TabsTrigger><TabsTrigger value="payable">Payables (AP)</TabsTrigger></TabsList>
        <TabsContent value={tab}>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <Card><CardContent className="pt-3 text-center"><p className="text-lg font-bold">{fmt(filtered.reduce((s, r) => s + Number(r.current_amount || 0), 0))}</p><p className="text-xs text-muted-foreground">Current</p></CardContent></Card>
            <Card><CardContent className="pt-3 text-center"><p className="text-lg font-bold text-amber-600">{fmt(filtered.reduce((s, r) => s + Number(r.days_30 || 0), 0))}</p><p className="text-xs text-muted-foreground">30 Days</p></CardContent></Card>
            <Card><CardContent className="pt-3 text-center"><p className="text-lg font-bold text-orange-600">{fmt(filtered.reduce((s, r) => s + Number(r.days_60 || 0), 0))}</p><p className="text-xs text-muted-foreground">60 Days</p></CardContent></Card>
            <Card><CardContent className="pt-3 text-center"><p className="text-lg font-bold text-red-600">{fmt(filtered.reduce((s, r) => s + Number(r.days_90 || 0), 0))}</p><p className="text-xs text-muted-foreground">90 Days</p></CardContent></Card>
            <Card><CardContent className="pt-3 text-center"><p className="text-lg font-bold text-destructive">{fmt(filtered.reduce((s, r) => s + Number(r.days_120_plus || 0), 0))}</p><p className="text-xs text-muted-foreground">120+ Days</p></CardContent></Card>
          </div>
          <Card>
            <CardContent className="pt-4">
              {filtered.length === 0 ? <p className="text-center py-8 text-muted-foreground">No records</p> : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Counterparty</TableHead><TableHead>As Of</TableHead><TableHead className="text-right">Current</TableHead><TableHead className="text-right">30d</TableHead><TableHead className="text-right">60d</TableHead><TableHead className="text-right">90d</TableHead><TableHead className="text-right">120+</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Actions</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {filtered.map(r => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.counterparty_name}</TableCell>
                          <TableCell>{r.as_of_date}</TableCell>
                          <TableCell className="text-right">{fmt(r.current_amount)}</TableCell>
                          <TableCell className="text-right">{fmt(r.days_30)}</TableCell>
                          <TableCell className="text-right">{fmt(r.days_60)}</TableCell>
                          <TableCell className="text-right">{fmt(r.days_90)}</TableCell>
                          <TableCell className="text-right">{fmt(r.days_120_plus)}</TableCell>
                          <TableCell className="text-right font-semibold">{fmt(r.total_outstanding)}</TableCell>
                          <TableCell><Button variant="ghost" size="icon" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
