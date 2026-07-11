import React, { useState } from 'react';
import { useExportContainerLoadPlans } from '@/hooks/export/useExportContainerLoadPlans';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Container, Loader2, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';

const containerDefaults: Record<string, { weight: number; volume: number }> = {
  '20ft': { weight: 21770, volume: 33.2 },
  '40ft': { weight: 26780, volume: 67.7 },
  '40ft_HC': { weight: 26580, volume: 76.3 },
  '45ft_HC': { weight: 25600, volume: 86.0 },
};

export default function ExportContainerLoadPlanning() {
  const { plans, loading, create, remove } = useExportContainerLoadPlans();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({ container_type: '40ft', max_weight_kg: 26780, max_volume_cbm: 67.7, status: 'draft' });

  const handleContainerChange = (type: string) => {
    const def = containerDefaults[type] || containerDefaults['40ft'];
    setForm({ ...form, container_type: type, max_weight_kg: def.weight, max_volume_cbm: def.volume });
  };

  const handleSubmit = async () => {
    const ok = await create(form);
    if (ok) { setOpen(false); setForm({ container_type: '40ft', max_weight_kg: 26780, max_volume_cbm: 67.7, status: 'draft' }); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Container Load Planning</h1>
          <p className="text-muted-foreground">Visual bin-packing and CBM calculator</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />New Plan</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Container Load Plan</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div><Label>Plan Name</Label><Input value={form.plan_name || ''} onChange={e => setForm({...form, plan_name: e.target.value})} /></div>
              <div><Label>Container Type</Label>
                <Select value={form.container_type} onValueChange={handleContainerChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(containerDefaults).map(t => <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Max Weight (kg)</Label><Input type="number" value={form.max_weight_kg} onChange={e => setForm({...form, max_weight_kg: Number(e.target.value)})} /></div>
                <div><Label>Max Volume (CBM)</Label><Input type="number" value={form.max_volume_cbm} onChange={e => setForm({...form, max_volume_cbm: Number(e.target.value)})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Planned Weight (kg)</Label><Input type="number" value={form.planned_weight_kg || ''} onChange={e => setForm({...form, planned_weight_kg: Number(e.target.value)})} /></div>
                <div><Label>Planned Volume (CBM)</Label><Input type="number" value={form.planned_volume_cbm || ''} onChange={e => setForm({...form, planned_volume_cbm: Number(e.target.value)})} /></div>
              </div>
            </div>
            <Button onClick={handleSubmit} className="w-full">Create Plan</Button>
          </DialogContent>
        </Dialog>
      </div>

      {plans.length === 0 ? (
        <Card><CardContent className="text-center py-12 text-muted-foreground">No load plans yet</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map(p => (
            <Card key={p.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2"><Container className="h-5 w-5" />{p.plan_name}</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{p.container_type?.replace('_', ' ')}</Badge>
                  <Badge className={p.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-muted text-muted-foreground'}>{p.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground">Weight</span><span>{Number(p.planned_weight_kg || 0).toLocaleString()} / {Number(p.max_weight_kg).toLocaleString()} kg</span></div>
                  <Progress value={Number(p.utilization_weight_pct || 0)} className="h-2" />
                  <p className="text-xs text-right text-muted-foreground mt-0.5">{Number(p.utilization_weight_pct || 0).toFixed(1)}%</p>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground">Volume</span><span>{Number(p.planned_volume_cbm || 0).toFixed(1)} / {Number(p.max_volume_cbm).toFixed(1)} CBM</span></div>
                  <Progress value={Number(p.utilization_volume_pct || 0)} className="h-2" />
                  <p className="text-xs text-right text-muted-foreground mt-0.5">{Number(p.utilization_volume_pct || 0).toFixed(1)}%</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
