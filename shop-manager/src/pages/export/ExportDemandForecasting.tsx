import React, { useState } from 'react';
import { useExportDemandForecasts } from '@/hooks/export/useExportDemandForecasts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, TrendingUp, Loader2, Trash2 } from 'lucide-react';

export default function ExportDemandForecasting() {
  const { forecasts, loading, create, remove } = useExportDemandForecasts();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({ method: 'manual' });

  const handleSubmit = async () => {
    const ok = await create(form);
    if (ok) { setOpen(false); setForm({ method: 'manual' }); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Demand Forecasting</h1>
          <p className="text-muted-foreground">Predictive analysis by product and region</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />New Forecast</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Demand Forecast</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div><Label>Product Name</Label><Input value={form.product_name || ''} onChange={e => setForm({...form, product_name: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Region</Label><Input value={form.region || ''} onChange={e => setForm({...form, region: e.target.value})} /></div>
                <div><Label>Period</Label><Input value={form.forecast_period || ''} onChange={e => setForm({...form, forecast_period: e.target.value})} placeholder="e.g. 2026-Q2" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Forecast Qty</Label><Input type="number" value={form.forecast_qty || ''} onChange={e => setForm({...form, forecast_qty: Number(e.target.value)})} /></div>
                <div><Label>Actual Qty</Label><Input type="number" value={form.actual_qty || ''} onChange={e => setForm({...form, actual_qty: Number(e.target.value)})} /></div>
              </div>
              <div><Label>Confidence %</Label><Input type="number" min="0" max="100" value={form.confidence_level || ''} onChange={e => setForm({...form, confidence_level: Number(e.target.value)})} /></div>
            </div>
            <Button onClick={handleSubmit} className="w-full">Save Forecast</Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 text-center">
          <p className="text-2xl font-bold">{forecasts.length}</p><p className="text-xs text-muted-foreground">Forecasts</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-2xl font-bold">{forecasts.reduce((s, f) => s + Number(f.forecast_qty || 0), 0).toLocaleString()}</p><p className="text-xs text-muted-foreground">Total Forecast</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-2xl font-bold">{forecasts.reduce((s, f) => s + Number(f.actual_qty || 0), 0).toLocaleString()}</p><p className="text-xs text-muted-foreground">Total Actual</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-2xl font-bold">{forecasts.length > 0 ? (forecasts.reduce((s, f) => s + Number(f.confidence_level || 0), 0) / forecasts.length).toFixed(0) : 0}%</p><p className="text-xs text-muted-foreground">Avg Confidence</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Forecasts</CardTitle></CardHeader>
        <CardContent>
          {forecasts.length === 0 ? <p className="text-center text-muted-foreground py-8">No forecasts yet</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Product</TableHead><TableHead>Region</TableHead><TableHead>Period</TableHead><TableHead className="text-right">Forecast</TableHead><TableHead className="text-right">Actual</TableHead><TableHead className="text-right">Variance</TableHead><TableHead>Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {forecasts.map(f => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{f.product_name}</TableCell>
                      <TableCell>{f.region || '-'}</TableCell>
                      <TableCell>{f.forecast_period}</TableCell>
                      <TableCell className="text-right">{Number(f.forecast_qty).toLocaleString()}</TableCell>
                      <TableCell className="text-right">{Number(f.actual_qty || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <Badge className={Number(f.variance_pct) > 0 ? 'bg-emerald-500/10 text-emerald-700' : Number(f.variance_pct) < -10 ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}>
                          {Number(f.variance_pct).toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell><Button variant="ghost" size="icon" onClick={() => remove(f.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
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
