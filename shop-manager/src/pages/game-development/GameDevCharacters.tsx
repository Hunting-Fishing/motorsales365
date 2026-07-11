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
import { Plus, Users, Trash2, Search } from 'lucide-react';
import { GameCharacter, CharacterRole, CHARACTER_ROLE_CONFIG } from '@/types/game-development';

const ROLES = Object.entries(CHARACTER_ROLE_CONFIG) as [CharacterRole, typeof CHARACTER_ROLE_CONFIG[CharacterRole]][];

export default function GameDevCharacters() {
  const { activeProjectId, characters, addCharacter, removeCharacter } = useGameDevStore();
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [form, setForm] = useState({ name: '', role: 'npc' as CharacterRole, bio: '', personality: '', species: '', age: '' });

  const projectChars = characters.filter(c => c.project_id === activeProjectId);
  const filtered = projectChars.filter(c => {
    if (filterRole !== 'all' && c.role !== filterRole) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (!activeProjectId) {
    return (
      <div className="p-6 space-y-4">
        <GameDevProjectSelector />
        <Card><CardContent className="py-12 text-center text-muted-foreground">Select a project to manage characters.</CardContent></Card>
      </div>
    );
  }

  const handleAdd = () => {
    if (!form.name.trim()) return;
    addCharacter({
      project_id: activeProjectId,
      name: form.name,
      role: form.role,
      bio: form.bio || undefined,
      personality: form.personality || undefined,
      species: form.species || undefined,
      age: form.age || undefined,
      position_x: Math.random() * 400,
      position_y: Math.random() * 400,
      tags: [],
    });
    setForm({ name: '', role: 'npc', bio: '', personality: '', species: '', age: '' });
    setShowAdd(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6 text-primary" /> Character Development</h1>
          <p className="text-sm text-muted-foreground">{projectChars.length} characters</p>
        </div>
        <div className="flex items-center gap-2">
          <GameDevProjectSelector />
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Character</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Character</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Name</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Character name" /></div>
                <div>
                  <Label>Role</Label>
                  <Select value={form.role} onValueChange={v => setForm(p => ({ ...p, role: v as CharacterRole }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ROLES.map(([k, v]) => <SelectItem key={k} value={k}>{v.emoji} {v.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Species</Label><Input value={form.species} onChange={e => setForm(p => ({ ...p, species: e.target.value }))} placeholder="Human, Elf..." /></div>
                  <div><Label>Age</Label><Input value={form.age} onChange={e => setForm(p => ({ ...p, age: e.target.value }))} placeholder="25" /></div>
                </div>
                <div><Label>Bio</Label><Textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} placeholder="Character backstory..." rows={2} /></div>
                <div><Label>Personality</Label><Textarea value={form.personality} onChange={e => setForm(p => ({ ...p, personality: e.target.value }))} placeholder="Traits, quirks..." rows={2} /></div>
                <Button onClick={handleAdd} className="w-full">Create Character</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search characters..." className="pl-9" />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {ROLES.map(([k, v]) => <SelectItem key={k} value={k}>{v.emoji} {v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No characters yet. Add your first character to begin.</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(char => {
            const roleConfig = CHARACTER_ROLE_CONFIG[char.role];
            return (
              <Card key={char.id} className="group hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span className="text-lg">{roleConfig.emoji}</span>
                      {char.name}
                    </CardTitle>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => removeCharacter(char.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                  <div className="flex gap-1.5">
                    <Badge variant="secondary" className="text-xs">{roleConfig.label}</Badge>
                    {char.species && <Badge variant="outline" className="text-xs">{char.species}</Badge>}
                    {char.age && <Badge variant="outline" className="text-xs">Age: {char.age}</Badge>}
                  </div>
                </CardHeader>
                <CardContent>
                  {char.bio && <p className="text-sm text-muted-foreground line-clamp-2 mb-1">{char.bio}</p>}
                  {char.personality && <p className="text-xs text-muted-foreground/70 italic line-clamp-1">{char.personality}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
