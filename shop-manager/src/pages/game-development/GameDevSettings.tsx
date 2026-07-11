import { useState, useEffect } from 'react';
import { useGameDevStore } from '@/stores/game-dev-store';
import { GameDevProjectSelector } from '@/components/game-development/GameDevProjectSelector';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Settings, Save, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Engine } from '@/types/game-development';

const ENGINES: Engine[] = ['unity', 'unreal', 'godot', 'gamemaker', 'flutter', 'defold', 'cocos', 'custom'];
const GENRES = ['RPG', 'Action', 'Adventure', 'Strategy', 'Simulation', 'Puzzle', 'Horror', 'Platformer', 'Shooter', 'Racing', 'Sports', 'Other'];

export default function GameDevSettings() {
  const { projects, activeProjectId, updateProject, removeProject } = useGameDevStore();
  const { toast } = useToast();
  const project = projects.find(p => p.id === activeProjectId);

  const [form, setForm] = useState({
    name: '',
    engine: '' as Engine | '',
    genre: '',
    description: '',
    platform_targets: '',
  });

  useEffect(() => {
    if (project) {
      setForm({
        name: project.name,
        engine: project.engine || '',
        genre: project.genre || '',
        description: project.description || '',
        platform_targets: project.platform_targets?.join(', ') || '',
      });
    }
  }, [project]);

  if (!activeProjectId || !project) {
    return (
      <div className="p-6 space-y-4">
        <GameDevProjectSelector />
        <Card><CardContent className="py-12 text-center text-muted-foreground">Select a project to manage settings.</CardContent></Card>
      </div>
    );
  }

  const handleSave = () => {
    updateProject(activeProjectId, {
      name: form.name,
      engine: (form.engine || undefined) as Engine | undefined,
      genre: form.genre || undefined,
      description: form.description || undefined,
      platform_targets: form.platform_targets ? form.platform_targets.split(',').map(s => s.trim()).filter(Boolean) : undefined,
    });
    toast({ title: 'Settings saved', description: 'Project settings have been updated.' });
  };

  const handleDelete = () => {
    if (window.confirm(`Delete project "${project.name}"? This cannot be undone.`)) {
      removeProject(activeProjectId);
      toast({ title: 'Project deleted', variant: 'destructive' });
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Settings className="h-6 w-6 text-primary" /> Project Settings</h1>
          <p className="text-sm text-muted-foreground">Configure {project.name}</p>
        </div>
        <GameDevProjectSelector />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">General</CardTitle>
          <CardDescription>Basic project information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Project Name</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Engine</Label>
              <Select value={form.engine} onValueChange={v => setForm(f => ({ ...f, engine: v as Engine }))}>
                <SelectTrigger><SelectValue placeholder="Select engine" /></SelectTrigger>
                <SelectContent>{ENGINES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Genre</Label>
              <Select value={form.genre} onValueChange={v => setForm(f => ({ ...f, genre: v }))}>
                <SelectTrigger><SelectValue placeholder="Select genre" /></SelectTrigger>
                <SelectContent>{GENRES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Target Platforms (comma separated)</Label>
            <Input placeholder="PC, Console, Mobile" value={form.platform_targets} onChange={e => setForm(f => ({ ...f, platform_targets: e.target.value }))} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <Button onClick={handleSave}><Save className="h-4 w-4 mr-1" /> Save Changes</Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-sm text-destructive">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleDelete}><Trash2 className="h-4 w-4 mr-1" /> Delete Project</Button>
        </CardContent>
      </Card>
    </div>
  );
}
