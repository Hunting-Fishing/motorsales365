import { useState, useMemo } from 'react';
import { useGameDevStore } from '@/stores/game-dev-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, MoreVertical, Pencil, Trash2, Copy, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { Engine, ProjectPhase } from '@/types/game-development';

const statusColors: Record<string, string> = {
  'idea': 'bg-muted text-muted-foreground',
  'planned': 'bg-blue-500/20 text-blue-400',
  'in-progress': 'bg-amber-500/20 text-amber-400',
  'done': 'bg-emerald-500/20 text-emerald-400',
  'blocked': 'bg-destructive/20 text-destructive',
};

const engineOptions: { value: Engine; label: string; emoji: string }[] = [
  { value: 'unity', label: 'Unity', emoji: '🎮' },
  { value: 'unreal', label: 'Unreal Engine', emoji: '🔥' },
  { value: 'godot', label: 'Godot', emoji: '🤖' },
  { value: 'gamemaker', label: 'GameMaker', emoji: '🕹️' },
  { value: 'flutter', label: 'Flutter', emoji: '📱' },
  { value: 'defold', label: 'Defold', emoji: '🎯' },
  { value: 'cocos', label: 'Cocos', emoji: '🥥' },
  { value: 'custom', label: 'Custom / Other', emoji: '⚙️' },
];

const platformOptions = ['PC', 'Console', 'Mobile', 'Web', 'VR', 'AR'];

const defaultForm = {
  name: '', genre: '', engine: 'unity' as Engine, description: '',
  platform_targets: ['PC'], target_audience: '', art_style: '', monetization_model: 'Premium',
  phase: 'concept' as ProjectPhase, team_size: 1,
};

export default function GameDevProjects() {
  const { projects, setActiveProject, addProject, updateProject, removeProject, duplicateProject } = useGameDevStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...defaultForm });
  const [filterEngine, setFilterEngine] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filtered = useMemo(() => {
    let list = [...projects];
    if (filterEngine !== 'all') list = list.filter(p => p.engine === filterEngine);
    if (filterStatus !== 'all') list = list.filter(p => p.status === filterStatus);
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [projects, filterEngine, filterStatus]);

  const togglePlatform = (p: string) => {
    setForm(f => ({
      ...f,
      platform_targets: f.platform_targets.includes(p)
        ? f.platform_targets.filter(x => x !== p)
        : [...f.platform_targets, p],
    }));
  };

  const handleCreate = () => {
    const id = addProject({ ...form, status: 'idea' });
    setActiveProject(id);
    setOpen(false);
    setForm({ ...defaultForm });
    navigate('/game-development');
  };

  const handleEdit = (p: typeof projects[0]) => {
    setForm({
      name: p.name, genre: p.genre, engine: p.engine, description: p.description ?? '',
      platform_targets: p.platform_targets, target_audience: p.target_audience,
      art_style: p.art_style, monetization_model: p.monetization_model,
      phase: p.phase, team_size: p.team_size,
    });
    setEditId(p.id);
  };

  const handleSaveEdit = () => {
    if (editId) {
      updateProject(editId, form);
      toast.success('Project updated');
    }
    setEditId(null);
    setForm({ ...defaultForm });
  };

  const handleDelete = () => {
    if (deleteId) {
      removeProject(deleteId);
      toast.success('Project deleted');
    }
    setDeleteId(null);
  };

  const handleDuplicate = (id: string) => {
    const newId = duplicateProject(id);
    if (newId) {
      setActiveProject(newId);
      toast.success('Project duplicated');
    }
  };

  const projectFormJsx = (
    <div className="space-y-3 mt-2">
      <Input placeholder="Project name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      <Textarea placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      <div className="grid grid-cols-2 gap-3">
        <Input placeholder="Genre (e.g. RPG, FPS)" value={form.genre} onChange={e => setForm(f => ({ ...f, genre: e.target.value }))} />
        <Select value={form.engine} onValueChange={(v: Engine) => setForm(f => ({ ...f, engine: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {engineOptions.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.emoji} {o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input placeholder="Art Style" value={form.art_style} onChange={e => setForm(f => ({ ...f, art_style: e.target.value }))} />
        <Input placeholder="Target Audience" value={form.target_audience} onChange={e => setForm(f => ({ ...f, target_audience: e.target.value }))} />
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
        <Input type="number" placeholder="Team Size" value={form.team_size} onChange={e => setForm(f => ({ ...f, team_size: +e.target.value }))} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-1.5">Platform Targets</p>
        <div className="flex flex-wrap gap-2">
          {platformOptions.map(p => (
            <label key={p} className="flex items-center gap-1.5 text-xs cursor-pointer">
              <Checkbox checked={form.platform_targets.includes(p)} onCheckedChange={() => togglePlatform(p)} />
              {p}
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your game planning projects</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> New Project
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={filterEngine} onValueChange={setFilterEngine}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <Filter className="h-3 w-3 mr-1" /><SelectValue placeholder="Engine" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Engines</SelectItem>
            {engineOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.emoji} {o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <Filter className="h-3 w-3 mr-1" /><SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {['idea', 'planned', 'in-progress', 'done', 'blocked'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Project Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(p => (
          <Card
            key={p.id}
            className="cursor-pointer hover:border-primary/30 transition-all hover:shadow-md"
            onClick={() => { setActiveProject(p.id); navigate('/game-development'); }}
          >
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-base truncate">{p.name}</p>
                  {p.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</p>}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"><MoreVertical className="h-3.5 w-3.5" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={e => { e.stopPropagation(); handleEdit(p); }}><Pencil className="h-3.5 w-3.5 mr-2" /> Edit</DropdownMenuItem>
                    <DropdownMenuItem onClick={e => { e.stopPropagation(); handleDuplicate(p.id); }}><Copy className="h-3.5 w-3.5 mr-2" /> Duplicate</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={e => { e.stopPropagation(); setDeleteId(p.id); }}><Trash2 className="h-3.5 w-3.5 mr-2" /> Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge className={statusColors[p.status] || 'bg-muted'}>{p.status}</Badge>
                <Badge variant="outline" className="text-[10px]">{engineOptions.find(o => o.value === p.engine)?.emoji} {p.engine}</Badge>
                <Badge variant="outline" className="text-[10px]">{p.phase}</Badge>
                {p.genre && <Badge variant="outline" className="text-[10px]">{p.genre}</Badge>}
              </div>
              <div className="text-[10px] text-muted-foreground flex gap-3">
                <span>Team: {p.team_size}</span>
                <span>Platforms: {p.platform_targets.join(', ')}</span>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full flex flex-col items-center py-16 text-muted-foreground">
            <p>No projects found. Create your first game project!</p>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create New Project</DialogTitle></DialogHeader>
          {projectFormJsx}
          <Button onClick={handleCreate} disabled={!form.name} className="w-full mt-2">Create Project</Button>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editId} onOpenChange={() => setEditId(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Project</DialogTitle></DialogHeader>
          {projectFormJsx}
          <Button onClick={handleSaveEdit} disabled={!form.name} className="w-full mt-2">Save Changes</Button>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the project and all its data.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
