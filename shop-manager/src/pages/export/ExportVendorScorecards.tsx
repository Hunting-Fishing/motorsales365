import React, { useState } from 'react';
import { useExportVendorScorecards } from '@/hooks/export/useExportVendorScorecards';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Star, Loader2, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';

export default function ExportVendorScorecards() {
  const { scorecards, loading, create, remove } = useExportVendorScorecards();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({ vendor_type: 'supplier' });

  const handleSubmit = async () => {
    const ok = await create(form);
    if (ok) { setOpen(false); setForm({ vendor_type: 'supplier' }); }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-destructive';
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vendor Scorecards</h1>
          <p className="text-muted-foreground">Performance ratings for suppliers and partners</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />Add Scorecard</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Vendor Scorecard</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div><Label>Vendor Name</Label><Input value={form.vendor_name || ''} onChange={e => setForm({...form, vendor_name: e.target.value})} /></div>
              <div><Label>Vendor Type</Label>
                <Select value={form.vendor_type} onValueChange={v => setForm({...form, vendor_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="supplier">Supplier</SelectItem>
                    <SelectItem value="forwarder">Forwarder</SelectItem>
                    <SelectItem value="carrier">Carrier</SelectItem>
                    <SelectItem value="agent">Agent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>On-Time Delivery %</Label><Input type="number" min="0" max="100" value={form.on_time_delivery_pct || ''} onChange={e => setForm({...form, on_time_delivery_pct: Number(e.target.value)})} /></div>
                <div><Label>Quality Score</Label><Input type="number" min="0" max="100" value={form.quality_score || ''} onChange={e => setForm({...form, quality_score: Number(e.target.value)})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Responsiveness</Label><Input type="number" min="0" max="100" value={form.responsiveness_score || ''} onChange={e => setForm({...form, responsiveness_score: Number(e.target.value)})} /></div>
                <div><Label>Cost Competitiveness</Label><Input type="number" min="0" max="100" value={form.cost_competitiveness || ''} onChange={e => setForm({...form, cost_competitiveness: Number(e.target.value)})} /></div>
              </div>
              <div><Label>Review Period</Label><Input value={form.review_period || ''} onChange={e => setForm({...form, review_period: e.target.value})} placeholder="e.g. Q1 2026" /></div>
            </div>
            <Button onClick={handleSubmit} className="w-full">Save Scorecard</Button>
          </DialogContent>
        </Dialog>
      </div>

      {scorecards.length === 0 ? (
        <Card><CardContent className="text-center py-12 text-muted-foreground">No vendor scorecards yet</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {scorecards.map(sc => (
            <Card key={sc.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{sc.vendor_name}</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => remove(sc.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{sc.vendor_type}</Badge>
                  {sc.review_period && <span className="text-xs text-muted-foreground">{sc.review_period}</span>}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-center">
                  <span className={`text-3xl font-bold ${getScoreColor(Number(sc.overall_score))}`}>{Number(sc.overall_score).toFixed(0)}</span>
                  <span className="text-muted-foreground">/100</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">On-Time</span><span>{sc.on_time_delivery_pct}%</span></div>
                  <Progress value={Number(sc.on_time_delivery_pct)} className="h-1.5" />
                  <div className="flex justify-between"><span className="text-muted-foreground">Quality</span><span>{sc.quality_score}%</span></div>
                  <Progress value={Number(sc.quality_score)} className="h-1.5" />
                  <div className="flex justify-between"><span className="text-muted-foreground">Responsive</span><span>{sc.responsiveness_score}%</span></div>
                  <Progress value={Number(sc.responsiveness_score)} className="h-1.5" />
                  <div className="flex justify-between"><span className="text-muted-foreground">Cost</span><span>{sc.cost_competitiveness}%</span></div>
                  <Progress value={Number(sc.cost_competitiveness)} className="h-1.5" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
