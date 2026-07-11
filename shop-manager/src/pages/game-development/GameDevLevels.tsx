import { useState } from 'react';
import { useGameDevStore } from '@/stores/game-dev-store';
import { GameDevProjectSelector } from '@/components/game-development/GameDevProjectSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Map, Plus, Search, Trash2, Edit, Link2 } from 'lucide-react';
import { WorldZone, ZoneType, PlanningStatus, Priority, ZONE_TYPE_CONFIG } from '@/types/game-development';

const STATUS_COLORS: Record<PlanningStatus, string> = {
  'idea': 'bg-muted', 'planned': 'bg-blue-500/20 text-blue-400', 'in-progress': 'bg-yellow-500/20 text-yellow-400',
  'review': 'bg-purple-500/20 text-purple-400', 'done': 'bg-green-500/20 text-green-400', 'blocked': 'bg-red-500/20 text-red-400',
  'cut': 'bg-muted line-through', 'backlog': 'bg-muted',
};

export default function GameDevLevels() {
  const { activeProjectId, worldZones, addWorldZone, updateWorldZone, removeWorldZone } = useGameDevStore();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<WorldZone | null>(null);

  const [zoneName, setZoneName] = useState('');
  const [zoneDesc, setZoneDesc] = useState('');
  const [zoneType, setZoneType] = useState<ZoneType>('overworld');
  const [zoneStatus, setZoneStatus] = useState<PlanningStatus>('planned');
  const [zonePriority, setZonePriority] = useState<Priority>('medium');

  const projectZones = worldZones.filter(z => z.project_id === activeProjectId);
  const filtered = projectZones.filter(z => {
    if (search && !z.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType !== 'all' && z.zone_type !== filterType) return false;
    return true;
  });

  const resetForm = () => { setZoneName(''); setZoneDesc(''); setZoneType('overworld'); setZoneStatus('planned'); setZonePriority('medium'); };

  const handleSave = () => {
    if (!zoneName.trim() || !activeProjectId) return;
    const data: Partial<WorldZone> = { name: zoneName, description: zoneDesc, zone_type: zoneType, status: zoneStatus, priority: zonePriority };
    if (editing) {
      updateWorldZone(editing.id, data);
    } else {
      addWorldZone({ ...data, project_id: activeProjectId, grid_data: {}, encounters: [], connected_zone_ids: [], tags: [] } as Omit<WorldZone, 'id'>);
    }
    resetForm(); setShowAdd(false); setEditing(null);
  };

  const openEdit = (z: WorldZone) => {
    setEditing(z); setZoneName(z.name); setZoneDesc(z.description || '');
    setZoneType(z.zone_type); setZoneStatus(z.status); setZonePriority(z.priority); setShowAdd(true);
  };

  if (!activeProjectId) {
    return (
      <div className="p-6 space-y-4">
        <GameDevProjectSelector />
        <Card><CardContent className="p-12 text-center text-muted-foreground">Select a project to design levels.</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Map className="h-6 w-6 text-primary" /> Level & World Editor</h1>
          <p className="text-sm text-muted-foreground">{projectZones.length} zones</p>
        </div>
        <div className="flex items-center gap-2">
          <GameDevProjectSelector />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search zones..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(ZONE_TYPE_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.emoji} {v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={() => { resetForm(); setEditing(null); setShowAdd(true); }}><Plus className="h-4 w-4 mr-1" /> Add Zone</Button>
      </div>

      {/* Zone map visualization */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(zone => {
          const cfg = ZONE_TYPE_CONFIG[zone.zone_type];
          return (
            <Card key={zone.id} className="group hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-sm">{cfg.emoji} {zone.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">{zone.description || 'No description'}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(zone)}><Edit className="h-3 w-3" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeWorldZone(zone.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-1 flex-wrap">
                  <Badge variant="outline" style={{ borderColor: `hsl(${cfg.color})`, color: `hsl(${cfg.color})` }}>{cfg.label}</Badge>
                  <Badge className={STATUS_COLORS[zone.status]}>{zone.status}</Badge>
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <span>⚔️ {zone.encounters.length} encounters</span>
                  {zone.connected_zone_ids.length > 0 && <span><Link2 className="h-3 w-3 inline" /> {zone.connected_zone_ids.length} connections</span>}
                </div>
                {zone.tags.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {zone.tags.map(t => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && <div className="col-span-full text-center py-12 text-muted-foreground">No zones found. Create your first world zone!</div>}
      </div>

      <Dialog open={showAdd} onOpenChange={v => { if (!v) { setShowAdd(false); setEditing(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Edit Zone' : 'Add Zone'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={zoneName} onChange={e => setZoneName(e.target.value)} placeholder="Dark Forest" /></div>
            <div><Label>Description</Label><Textarea value={zoneDesc} onChange={e => setZoneDesc(e.target.value)} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Zone Type</Label>
                <Select value={zoneType} onValueChange={v => setZoneType(v as ZoneType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(ZONE_TYPE_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.emoji} {v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={zoneStatus} onValueChange={v => setZoneStatus(v as PlanningStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['planned','in-progress','review','done','blocked'] as PlanningStatus[]).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleSave} className="w-full">{editing ? 'Update Zone' : 'Create Zone'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
