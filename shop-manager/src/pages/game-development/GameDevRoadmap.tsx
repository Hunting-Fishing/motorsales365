import { useState, useCallback, useMemo } from 'react';
import { useGameDevStore } from '@/stores/game-dev-store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { GameDevProjectSelector } from '@/components/game-development/GameDevProjectSelector';
import { toast } from 'sonner';
import {
  Map, Plus, Flag, GripVertical, Sparkles, Send, Pencil, Trash2, Search, Filter,
} from 'lucide-react';
import type { PlanningStatus, Priority, ProjectPhase, PlanTaskStatus } from '@/types/game-development';

const statusColors: Record<string, string> = {
  'idea': 'bg-muted text-muted-foreground',
  'planned': 'bg-blue-500/20 text-blue-400',
  'in-progress': 'bg-amber-500/20 text-amber-400',
  'review': 'bg-primary/20 text-primary',
  'done': 'bg-emerald-500/20 text-emerald-400',
  'blocked': 'bg-destructive/20 text-destructive',
};

const planColumns: { status: PlanTaskStatus; label: string; color: string }[] = [
  { status: 'draft', label: 'Drafts', color: '220 15% 50%' },
  { status: 'active', label: 'Active', color: '200 90% 55%' },
  { status: 'ready', label: 'Ready', color: '38 92% 55%' },
  { status: 'done', label: 'Done', color: '142 70% 45%' },
];

export default function GameDevRoadmap() {
  const {
    milestones, planTasks, activeProjectId,
    addMilestone, updateMilestone,
    addPlanTask, updatePlanTask, removePlanTask,
  } = useGameDevStore();

  const [open, setOpen] = useState(false);
  const [planInput, setPlanInput] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [planDraggedId, setPlanDraggedId] = useState<string | null>(null);
  const [filterSearch, setFilterSearch] = useState('');
  const [form, setForm] = useState({ title: '', description: '', phase: 'pre-production' as ProjectPhase, priority: 'medium' as Priority, due_date: '' });

  const projMilestones = useMemo(
    () => milestones.filter(m => m.project_id === activeProjectId),
    [milestones, activeProjectId],
  );

  const projPlanTasks = useMemo(
    () => planTasks.filter(t => t.project_id === activeProjectId),
    [planTasks, activeProjectId],
  );

  const filteredTasks = useMemo(() => {
    if (!filterSearch) return projPlanTasks;
    const q = filterSearch.toLowerCase();
    return projPlanTasks.filter(t => t.title.toLowerCase().includes(q));
  }, [projPlanTasks, filterSearch]);

  const handleCreate = () => {
    if (!activeProjectId || !form.title) return;
    addMilestone({ ...form, due_date: form.due_date || undefined, project_id: activeProjectId, status: 'idea', order_index: projMilestones.length });
    setOpen(false);
    setForm({ title: '', description: '', phase: 'pre-production', priority: 'medium', due_date: '' });
  };

  const handlePlanSubmit = () => {
    if (!activeProjectId || !planInput.trim()) return;
    addPlanTask({
      project_id: activeProjectId,
      title: planInput.trim(),
      status: 'draft',
      order_index: projPlanTasks.length,
    });
    setPlanInput('');
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handlePlanDragStart = useCallback((e: React.DragEvent, id: string) => {
    setPlanDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handlePlanDrop = useCallback((e: React.DragEvent, targetStatus: PlanTaskStatus) => {
    e.preventDefault();
    if (planDraggedId) {
      updatePlanTask(planDraggedId, { status: targetStatus });
      setPlanDraggedId(null);
    }
  }, [planDraggedId, updatePlanTask]);

  const handleStartEdit = (id: string, title: string) => { setEditingTaskId(id); setEditTitle(title); };
  const handleSaveEdit = () => {
    if (editingTaskId && editTitle.trim()) updatePlanTask(editingTaskId, { title: editTitle.trim() });
    setEditingTaskId(null); setEditTitle('');
  };

  if (!activeProjectId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 p-6 animate-fade-in">
        <div className="p-4 rounded-full bg-primary/10"><Sparkles className="h-10 w-10 text-primary" /></div>
        <p className="text-muted-foreground">Select a project to view its roadmap</p>
        <GameDevProjectSelector />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Map className="h-6 w-6 text-primary" /> Roadmap
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {projMilestones.length} milestones · {projPlanTasks.length} tasks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <GameDevProjectSelector />
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setOpen(true)}>
            <Flag className="h-3.5 w-3.5" /> Add Milestone
          </Button>
        </div>
      </div>

      {/* Milestones */}
      {projMilestones.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Milestones</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {projMilestones.map(m => (
              <Card key={m.id} className="hover:border-primary/30 transition-all">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm truncate">{m.title}</span>
                    <Badge className={`text-[10px] ${statusColors[m.status] || 'bg-muted'}`}>{m.status}</Badge>
                  </div>
                  {m.description && <p className="text-xs text-muted-foreground line-clamp-2">{m.description}</p>}
                  <div className="flex gap-1">
                    <Badge variant="outline" className="text-[10px]">{m.phase}</Badge>
                    <Badge variant="outline" className="text-[10px]">{m.priority}</Badge>
                    {m.due_date && <Badge variant="outline" className="text-[10px]">{m.due_date}</Badge>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Quick add task */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            className="h-9 pr-10"
            placeholder="Quick add task..."
            value={planInput}
            onChange={e => setPlanInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handlePlanSubmit()}
          />
          <Button size="icon" variant="ghost" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={handlePlanSubmit} disabled={!planInput.trim()}>
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="relative max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input className="h-9 pl-8 text-xs" placeholder="Filter tasks..." value={filterSearch} onChange={e => setFilterSearch(e.target.value)} />
        </div>
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {planColumns.map(col => {
          const colTasks = filteredTasks.filter(t => t.status === col.status);
          return (
            <div
              key={col.status}
              className="space-y-2"
              onDragOver={handleDragOver}
              onDrop={e => handlePlanDrop(e, col.status)}
            >
              <div className="flex items-center gap-2 px-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: `hsl(${col.color})` }} />
                <span className="text-xs font-semibold uppercase tracking-wider">{col.label}</span>
                <Badge variant="secondary" className="text-[10px] ml-auto">{colTasks.length}</Badge>
              </div>
              <div className="space-y-2 min-h-[100px] rounded-lg border border-dashed border-border/50 p-2">
                {colTasks.map(task => (
                  <Card
                    key={task.id}
                    draggable
                    onDragStart={e => handlePlanDragStart(e, task.id)}
                    className={`cursor-grab active:cursor-grabbing hover:border-primary/30 transition-all group ${planDraggedId === task.id ? 'opacity-50' : ''}`}
                  >
                    <CardContent className="p-2.5">
                      {editingTaskId === task.id ? (
                        <div className="flex items-center gap-1">
                          <Input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSaveEdit()} className="h-6 text-xs px-1.5" autoFocus />
                          <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={handleSaveEdit}>
                            <Send className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-start gap-1.5">
                          <GripVertical className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                          <p className="text-xs font-medium truncate flex-1">{task.title}</p>
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => handleStartEdit(task.id, task.title)}>
                              <Pencil className="h-2.5 w-2.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-5 w-5 text-destructive" onClick={() => removePlanTask(task.id)}>
                              <Trash2 className="h-2.5 w-2.5" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Milestone Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Milestone</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Milestone title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            <Textarea placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <Select value={form.phase} onValueChange={(v: ProjectPhase) => setForm(f => ({ ...f, phase: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="concept">Concept</SelectItem>
                  <SelectItem value="pre-production">Pre-Production</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                  <SelectItem value="post-production">Post-Production</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                </SelectContent>
              </Select>
              <Select value={form.priority} onValueChange={(v: Priority) => setForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            <Button onClick={handleCreate} disabled={!form.title} className="w-full">Create Milestone</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
