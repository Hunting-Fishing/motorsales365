import React, { useState } from 'react';
import { useExportKpiWidgets } from '@/hooks/export/useExportKpiWidgets';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, BarChart3, Loader2, Trash2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';

const kpiTypes = [
  'fill_rate', 'on_time_shipment', 'order_accuracy', 'collection_cycle',
  'customer_satisfaction', 'inventory_turnover', 'cost_per_unit', 'margin',
  'customs_clearance_time', 'document_accuracy', 'claim_rate', 'capacity_utilization'
];

export default function ExportKpiDashboard() {
  const { widgets, loading, create, remove } = useExportKpiWidgets();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({ unit: '%', period: 'monthly', trend: 'stable' });

  const handleSubmit = async () => {
    const ok = await create({ ...form, display_order: widgets.length });
    if (ok) { setOpen(false); setForm({ unit: '%', period: 'monthly', trend: 'stable' }); }
  };

  const trendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-emerald-500" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-destructive" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">KPI Dashboard</h1>
          <p className="text-muted-foreground">Configurable widgets for key performance indicators</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />Add Widget</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New KPI Widget</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div><Label>Widget Name</Label><Input value={form.widget_name || ''} onChange={e => setForm({...form, widget_name: e.target.value})} /></div>
              <div><Label>KPI Type</Label>
                <Select value={form.kpi_type || ''} onValueChange={v => setForm({...form, kpi_type: v})}>
                  <SelectTrigger><SelectValue placeholder="Select KPI" /></SelectTrigger>
                  <SelectContent>
                    {kpiTypes.map(k => <SelectItem key={k} value={k}>{k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Current Value</Label><Input type="number" value={form.current_value || ''} onChange={e => setForm({...form, current_value: Number(e.target.value)})} /></div>
                <div><Label>Target Value</Label><Input type="number" value={form.target_value || ''} onChange={e => setForm({...form, target_value: Number(e.target.value)})} /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Unit</Label><Input value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} /></div>
                <div><Label>Trend</Label>
                  <Select value={form.trend} onValueChange={v => setForm({...form, trend: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="up">Up</SelectItem>
                      <SelectItem value="down">Down</SelectItem>
                      <SelectItem value="stable">Stable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Trend Value</Label><Input type="number" value={form.trend_value || ''} onChange={e => setForm({...form, trend_value: Number(e.target.value)})} /></div>
              </div>
              <div><Label>Period</Label>
                <Select value={form.period} onValueChange={v => setForm({...form, period: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleSubmit} className="w-full">Add Widget</Button>
          </DialogContent>
        </Dialog>
      </div>

      {widgets.length === 0 ? (
        <Card><CardContent className="text-center py-12 text-muted-foreground">No KPI widgets configured. Add your first KPI to get started.</CardContent></Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {widgets.filter(w => w.is_visible).map(w => {
            const progress = w.target_value ? Math.min(100, (Number(w.current_value) / Number(w.target_value)) * 100) : 0;
            return (
              <Card key={w.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{w.widget_name}</CardTitle>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => remove(w.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-2 mb-2">
                    <span className="text-3xl font-bold text-foreground">{Number(w.current_value).toLocaleString()}</span>
                    <span className="text-sm text-muted-foreground mb-1">{w.unit}</span>
                  </div>
                  {w.target_value && (
                    <div className="mb-2">
                      <Progress value={progress} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">Target: {Number(w.target_value).toLocaleString()}{w.unit} ({progress.toFixed(0)}%)</p>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    {trendIcon(w.trend)}
                    <span className={`text-sm font-medium ${w.trend === 'up' ? 'text-emerald-600' : w.trend === 'down' ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {w.trend_value > 0 ? '+' : ''}{w.trend_value}{w.unit}
                    </span>
                    <Badge variant="outline" className="ml-auto text-xs">{w.period}</Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
