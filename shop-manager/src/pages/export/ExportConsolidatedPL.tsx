import React, { useState } from 'react';
import { useExportConsolidatedPL } from '@/hooks/export/useExportConsolidatedPL';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, DollarSign, Loader2, Trash2 } from 'lucide-react';

export default function ExportConsolidatedPL() {
  const { reports, loading, create, remove } = useExportConsolidatedPL();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({ base_currency: 'USD' });

  const handleSubmit = async () => {
    const net = Number(form.total_revenue || 0) - Number(form.total_cogs || 0) - Number(form.total_freight || 0) - Number(form.total_duties || 0) - Number(form.total_insurance || 0) - Number(form.total_commissions || 0) - Number(form.total_other_costs || 0) + Number(form.fx_gain_loss || 0);
    const ok = await create({ ...form, net_profit: net });
    if (ok) { setOpen(false); setForm({ base_currency: 'USD' }); }
  };

  const fmt = (v: any) => Number(v || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const totalRevenue = reports.reduce((s, r) => s + Number(r.total_revenue || 0), 0);
  const totalProfit = reports.reduce((s, r) => s + Number(r.net_profit || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Multi-Currency P&L</h1>
          <p className="text-muted-foreground">Consolidated profit & loss with FX impact</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />New Report</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>New P&L Report</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
              <div><Label>Report Name</Label><Input value={form.report_name || ''} onChange={e => setForm({...form, report_name: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Period Start</Label><Input type="date" value={form.period_start || ''} onChange={e => setForm({...form, period_start: e.target.value})} /></div>
                <div><Label>Period End</Label><Input type="date" value={form.period_end || ''} onChange={e => setForm({...form, period_end: e.target.value})} /></div>
              </div>
              <div><Label>Revenue</Label><Input type="number" value={form.total_revenue || ''} onChange={e => setForm({...form, total_revenue: Number(e.target.value)})} /></div>
              <div><Label>COGS</Label><Input type="number" value={form.total_cogs || ''} onChange={e => setForm({...form, total_cogs: Number(e.target.value)})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Freight</Label><Input type="number" value={form.total_freight || ''} onChange={e => setForm({...form, total_freight: Number(e.target.value)})} /></div>
                <div><Label>Duties</Label><Input type="number" value={form.total_duties || ''} onChange={e => setForm({...form, total_duties: Number(e.target.value)})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Insurance</Label><Input type="number" value={form.total_insurance || ''} onChange={e => setForm({...form, total_insurance: Number(e.target.value)})} /></div>
                <div><Label>Commissions</Label><Input type="number" value={form.total_commissions || ''} onChange={e => setForm({...form, total_commissions: Number(e.target.value)})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Other Costs</Label><Input type="number" value={form.total_other_costs || ''} onChange={e => setForm({...form, total_other_costs: Number(e.target.value)})} /></div>
                <div><Label>FX Gain/Loss</Label><Input type="number" value={form.fx_gain_loss || ''} onChange={e => setForm({...form, fx_gain_loss: Number(e.target.value)})} /></div>
              </div>
            </div>
            <Button onClick={handleSubmit} className="w-full">Save Report</Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{reports.length}</p><p className="text-xs text-muted-foreground">Reports</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-emerald-600">{fmt(totalRevenue)}</p><p className="text-xs text-muted-foreground">Total Revenue</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>{fmt(totalProfit)}</p><p className="text-xs text-muted-foreground">Net Profit</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{totalRevenue > 0 ? (totalProfit / totalRevenue * 100).toFixed(1) : 0}%</p><p className="text-xs text-muted-foreground">Net Margin</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" />P&L Reports</CardTitle></CardHeader>
        <CardContent>
          {reports.length === 0 ? <p className="text-center py-8 text-muted-foreground">No reports yet</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Report</TableHead><TableHead>Period</TableHead><TableHead className="text-right">Revenue</TableHead><TableHead className="text-right">Gross Profit</TableHead><TableHead className="text-right">FX</TableHead><TableHead className="text-right">Net Profit</TableHead><TableHead>Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {reports.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.report_name}</TableCell>
                      <TableCell className="text-sm">{r.period_start} – {r.period_end}</TableCell>
                      <TableCell className="text-right">{fmt(r.total_revenue)}</TableCell>
                      <TableCell className="text-right">{fmt(r.gross_profit)}</TableCell>
                      <TableCell className="text-right"><Badge className={Number(r.fx_gain_loss) >= 0 ? 'bg-emerald-500/10 text-emerald-700' : 'bg-destructive/10 text-destructive'}>{fmt(r.fx_gain_loss)}</Badge></TableCell>
                      <TableCell className={`text-right font-semibold ${Number(r.net_profit) >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>{fmt(r.net_profit)}</TableCell>
                      <TableCell><Button variant="ghost" size="icon" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
