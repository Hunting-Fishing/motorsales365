import { useState } from 'react';
import { useGameDevStore } from '@/stores/game-dev-store';
import { GameDevProjectSelector } from '@/components/game-development/GameDevProjectSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Scroll, Trash2, Search, Target } from 'lucide-react';
import { Quest, QuestType, PlanningStatus, Priority, QUEST_TYPE_CONFIG } from '@/types/game-development';

const STATUSES: PlanningStatus[] = ['idea', 'planned', 'in-progress', 'review', 'done', 'blocked', 'cut', 'backlog'];
const PRIORITIES: Priority[] = ['critical', 'high', 'medium', 'low', 'backlog'];

export default function GameDevQuests() {
  const { activeProjectId, quests, addQuest, removeQuest } = useGameDevStore();
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [form, setForm] = useState({
    name: '', description: '', quest_type: 'main' as QuestType,
    status: 'planned' as PlanningStatus, priority: 'medium' as Priority,
    estimated_duration: '',
  });

  const projectQuests = quests.filter(q => q.project_id === activeProjectId);
  const filtered = projectQuests.filter(q => {
    if (filterType !== 'all' && q.quest_type !== filterType) return false;
    if (search && !q.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (!activeProjectId) {
    return (
      <div className="p-6 space-y-4">
        <GameDevProjectSelector />
        <Card><CardContent className="py-12 text-center text-muted-foreground">Select a project to manage quests.</CardContent></Card>
      </div>
    );
  }

  const handleAdd = () => {
    if (!form.name.trim()) return;
    addQuest({
      project_id: activeProjectId,
      name: form.name,
      description: form.description || undefined,
      quest_type: form.quest_type,
      objectives: [],
      prerequisites: [],
      rewards: [],
      linked_character_ids: [],
      chain_order: 0,
      status: form.status,
      priority: form.priority,
      tags: [],
      estimated_duration: form.estimated_duration || undefined,
    });
    setForm({ name: '', description: '', quest_type: 'main', status: 'planned', priority: 'medium', estimated_duration: '' });
    setShowAdd(false);
  };

  const statusColor = (s: PlanningStatus) => {
    const map: Record<string, string> = { done: 'bg-green-500/10 text-green-700', 'in-progress': 'bg-blue-500/10 text-blue-700', blocked: 'bg-red-500/10 text-red-700', cut: 'bg-muted text-muted-foreground' };
    return map[s] || 'bg-secondary text-secondary-foreground';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Scroll className="h-6 w-6 text-primary" /> Quest Designer</h1>
          <p className="text-sm text-muted-foreground">{projectQuests.length} quests</p>
        </div>
        <div className="flex items-center gap-2">
          <GameDevProjectSelector />
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Quest</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Quest</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Name</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Quest name" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Type</Label>
                    <Select value={form.quest_type} onValueChange={v => setForm(p => ({ ...p, quest_type: v as QuestType }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(QUEST_TYPE_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.emoji} {v.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v as Priority }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v as PlanningStatus }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Quest description..." rows={3} /></div>
                <div><Label>Estimated Duration</Label><Input value={form.estimated_duration} onChange={e => setForm(p => ({ ...p, estimated_duration: e.target.value }))} placeholder="e.g. 30 min" /></div>
                <Button onClick={handleAdd} className="w-full">Create Quest</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search quests..." className="pl-9" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(QUEST_TYPE_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.emoji} {v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No quests yet. Design your first quest to get started.</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(quest => {
            const typeConfig = QUEST_TYPE_CONFIG[quest.quest_type];
            return (
              <Card key={quest.id} className="group hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span>{typeConfig.emoji}</span>
                      {quest.name}
                    </CardTitle>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => removeQuest(quest.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    <Badge variant="secondary" className="text-xs">{typeConfig.label}</Badge>
                    <Badge className={`text-xs ${statusColor(quest.status)}`}>{quest.status}</Badge>
                    <Badge variant="outline" className="text-xs capitalize">{quest.priority}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {quest.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{quest.description}</p>}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {quest.objectives.length > 0 && <span className="flex items-center gap-1"><Target className="h-3 w-3" />{quest.objectives.length} objectives</span>}
                    {quest.estimated_duration && <span>⏱ {quest.estimated_duration}</span>}
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
