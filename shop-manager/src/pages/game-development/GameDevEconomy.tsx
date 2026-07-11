import { useState } from 'react';
import { useGameDevStore } from '@/stores/game-dev-store';
import { GameDevProjectSelector } from '@/components/game-development/GameDevProjectSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { TrendingUp, Plus, Trash2, Edit } from 'lucide-react';
import { EconomyCurve, CurveType, EconomyCurvePoint } from '@/types/game-development';

const CURVE_TYPES: Record<CurveType, { label: string; emoji: string; color: string }> = {
  'xp':            { label: 'XP Curve',       emoji: '📈', color: '142 70% 45%' },
  'currency':      { label: 'Currency',        emoji: '💰', color: '45 100% 50%' },
  'drop-rate':     { label: 'Drop Rate',       emoji: '🎲', color: '265 85% 65%' },
  'currency-flow': { label: 'Currency Flow',   emoji: '💸', color: '200 90% 55%' },
};

export default function GameDevEconomy() {
  const { activeProjectId, economyCurves, addEconomyCurve, updateEconomyCurve, removeEconomyCurve } = useGameDevStore();
  const [showAdd, setShowAdd] = useState(false);
  const [editingCurve, setEditingCurve] = useState<EconomyCurve | null>(null);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [curveType, setCurveType] = useState<CurveType>('xp');
  const [points, setPoints] = useState<EconomyCurvePoint[]>([{ level: 1, value: 100 }, { level: 10, value: 1000 }, { level: 50, value: 50000 }]);

  const projectCurves = economyCurves.filter(c => c.project_id === activeProjectId);

  const resetForm = () => { setName(''); setDesc(''); setCurveType('xp'); setPoints([{ level: 1, value: 100 }, { level: 10, value: 1000 }]); };

  const handleSave = () => {
    if (!name.trim() || !activeProjectId) return;
    if (editingCurve) {
      updateEconomyCurve(editingCurve.id, { name, description: desc, curve_type: curveType, data_points: points });
    } else {
      addEconomyCurve({ project_id: activeProjectId, name, description: desc, curve_type: curveType, data_points: points } as Omit<EconomyCurve, 'id'>);
    }
    resetForm(); setShowAdd(false); setEditingCurve(null);
  };

  const openEdit = (c: EconomyCurve) => {
    setEditingCurve(c); setName(c.name); setDesc(c.description || ''); setCurveType(c.curve_type); setPoints([...c.data_points]); setShowAdd(true);
  };

  const addPoint = () => setPoints(p => [...p, { level: (p[p.length - 1]?.level || 0) + 10, value: 0 }]);
  const removePoint = (i: number) => setPoints(p => p.filter((_, idx) => idx !== i));
  const updatePoint = (i: number, field: 'level' | 'value', val: number) =>
    setPoints(p => p.map((pt, idx) => idx === i ? { ...pt, [field]: val } : pt));

  // Simple inline chart
  const renderMiniChart = (pts: EconomyCurvePoint[]) => {
    if (pts.length < 2) return null;
    const maxVal = Math.max(...pts.map(p => p.value), 1);
    const w = 200, h = 60;
    const pathPoints = pts.map((p, i) => {
      const x = (i / (pts.length - 1)) * w;
      const y = h - (p.value / maxVal) * h;
      return `${x},${y}`;
    }).join(' ');
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-16 mt-2">
        <polyline points={pathPoints} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" />
        {pts.map((p, i) => {
          const x = (i / (pts.length - 1)) * w;
          const y = h - (p.value / maxVal) * h;
          return <circle key={i} cx={x} cy={y} r="3" fill="hsl(var(--primary))" />;
        })}
      </svg>
    );
  };

  if (!activeProjectId) {
    return (
      <div className="p-6 space-y-4">
        <GameDevProjectSelector />
        <Card><CardContent className="p-12 text-center text-muted-foreground">Select a project to simulate economy.</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><TrendingUp className="h-6 w-6 text-primary" /> Economy Simulation</h1>
          <p className="text-sm text-muted-foreground">{projectCurves.length} curves defined</p>
        </div>
        <div className="flex items-center gap-2">
          <GameDevProjectSelector />
          <Button onClick={() => { resetForm(); setEditingCurve(null); setShowAdd(true); }}><Plus className="h-4 w-4 mr-1" /> Add Curve</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projectCurves.map(c => {
          const cfg = CURVE_TYPES[c.curve_type];
          return (
            <Card key={c.id} className="group hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{cfg.emoji} {c.name}</CardTitle>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(c)}><Edit className="h-3 w-3" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeEconomyCurve(c.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{c.description || cfg.label}</p>
                <p className="text-xs mt-1">{c.data_points.length} data points</p>
                {renderMiniChart(c.data_points)}
              </CardContent>
            </Card>
          );
        })}
        {projectCurves.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">No economy curves yet. Create XP tables, currency flows, or drop rate curves.</div>
        )}
      </div>

      <Dialog open={showAdd} onOpenChange={v => { if (!v) { setShowAdd(false); setEditingCurve(null); } }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingCurve ? 'Edit Curve' : 'Add Economy Curve'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="XP per Level" /></div>
            <div><Label>Description</Label><Textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} /></div>
            <div>
              <Label>Curve Type</Label>
              <Select value={curveType} onValueChange={v => setCurveType(v as CurveType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(CURVE_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v.emoji} {v.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Data Points</Label>
                <Button size="sm" variant="outline" onClick={addPoint}><Plus className="h-3 w-3 mr-1" /> Point</Button>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {points.map((pt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input type="number" value={pt.level} onChange={e => updatePoint(i, 'level', Number(e.target.value))} className="w-20" placeholder="Lvl" />
                    <Input type="number" value={pt.value} onChange={e => updatePoint(i, 'value', Number(e.target.value))} className="flex-1" placeholder="Value" />
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removePoint(i)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                ))}
              </div>
            </div>
            {renderMiniChart(points)}
            <Button onClick={handleSave} className="w-full">{editingCurve ? 'Update Curve' : 'Create Curve'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
