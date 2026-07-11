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
import { Plus, BookOpen, Trash2, Link, Search } from 'lucide-react';
import { StoryBeat, StoryBeatType, StoryConnection, StoryConnectionType } from '@/types/game-development';

const BEAT_TYPES: { value: StoryBeatType; label: string; emoji: string }[] = [
  { value: 'prologue', label: 'Prologue', emoji: '📖' },
  { value: 'act', label: 'Act', emoji: '🎭' },
  { value: 'chapter', label: 'Chapter', emoji: '📑' },
  { value: 'scene', label: 'Scene', emoji: '🎬' },
  { value: 'plot-point', label: 'Plot Point', emoji: '📌' },
  { value: 'twist', label: 'Twist', emoji: '🌀' },
  { value: 'climax', label: 'Climax', emoji: '💥' },
  { value: 'resolution', label: 'Resolution', emoji: '✅' },
  { value: 'character-arc', label: 'Character Arc', emoji: '🦋' },
  { value: 'dialogue', label: 'Dialogue', emoji: '💬' },
  { value: 'flashback', label: 'Flashback', emoji: '⏪' },
  { value: 'foreshadow', label: 'Foreshadow', emoji: '🔮' },
  { value: 'lore', label: 'Lore', emoji: '📜' },
  { value: 'choice', label: 'Choice', emoji: '🔀' },
  { value: 'ending', label: 'Ending', emoji: '🏁' },
];

const CONNECTION_TYPES: { value: StoryConnectionType; label: string }[] = [
  { value: 'leads-to', label: 'Leads To' },
  { value: 'branches-to', label: 'Branches To' },
  { value: 'flashback-to', label: 'Flashback To' },
  { value: 'foreshadows', label: 'Foreshadows' },
  { value: 'reveals', label: 'Reveals' },
  { value: 'parallels', label: 'Parallels' },
  { value: 'contradicts', label: 'Contradicts' },
  { value: 'triggers', label: 'Triggers' },
  { value: 'depends-on', label: 'Depends On' },
];

export default function GameDevStory() {
  const { activeProjectId, storyBeats, storyConnections, addStoryBeat, removeStoryBeat, addStoryConnection, removeStoryConnection } = useGameDevStore();
  const [showAdd, setShowAdd] = useState(false);
  const [showConnect, setShowConnect] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const [newBeat, setNewBeat] = useState({ title: '', beat_type: 'scene' as StoryBeatType, summary: '', content: '' });
  const [newConn, setNewConn] = useState({ source_beat_id: '', target_beat_id: '', connection_type: 'leads-to' as StoryConnectionType });

  const projectBeats = storyBeats.filter(b => b.project_id === activeProjectId);
  const projectConns = storyConnections.filter(c => c.project_id === activeProjectId);

  const filtered = projectBeats.filter(b => {
    if (filterType !== 'all' && b.beat_type !== filterType) return false;
    if (search && !b.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (!activeProjectId) {
    return (
      <div className="p-6 space-y-4">
        <GameDevProjectSelector />
        <Card><CardContent className="py-12 text-center text-muted-foreground">Select or create a project to start tracking your story.</CardContent></Card>
      </div>
    );
  }

  const handleAddBeat = () => {
    if (!newBeat.title.trim()) return;
    addStoryBeat({
      project_id: activeProjectId,
      beat_type: newBeat.beat_type,
      title: newBeat.title,
      summary: newBeat.summary || undefined,
      content: newBeat.content || undefined,
      position_x: Math.random() * 400,
      position_y: Math.random() * 400,
      tags: [],
    });
    setNewBeat({ title: '', beat_type: 'scene', summary: '', content: '' });
    setShowAdd(false);
  };

  const handleAddConnection = () => {
    if (!newConn.source_beat_id || !newConn.target_beat_id) return;
    addStoryConnection({
      project_id: activeProjectId,
      source_beat_id: newConn.source_beat_id,
      target_beat_id: newConn.target_beat_id,
      connection_type: newConn.connection_type,
    });
    setNewConn({ source_beat_id: '', target_beat_id: '', connection_type: 'leads-to' });
    setShowConnect(false);
  };

  const beatTypeInfo = (type: StoryBeatType) => BEAT_TYPES.find(b => b.value === type);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="h-6 w-6 text-primary" /> Story Tracker</h1>
          <p className="text-sm text-muted-foreground">{projectBeats.length} beats, {projectConns.length} connections</p>
        </div>
        <div className="flex items-center gap-2">
          <GameDevProjectSelector />
          <Dialog open={showConnect} onOpenChange={setShowConnect}>
            <DialogTrigger asChild><Button variant="outline" size="sm"><Link className="h-4 w-4 mr-1" /> Connect</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Story Connection</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>From Beat</Label>
                  <Select value={newConn.source_beat_id} onValueChange={v => setNewConn(p => ({ ...p, source_beat_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                    <SelectContent>{projectBeats.map(b => <SelectItem key={b.id} value={b.id}>{b.title}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Connection Type</Label>
                  <Select value={newConn.connection_type} onValueChange={v => setNewConn(p => ({ ...p, connection_type: v as StoryConnectionType }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CONNECTION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>To Beat</Label>
                  <Select value={newConn.target_beat_id} onValueChange={v => setNewConn(p => ({ ...p, target_beat_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select target" /></SelectTrigger>
                    <SelectContent>{projectBeats.map(b => <SelectItem key={b.id} value={b.id}>{b.title}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddConnection} className="w-full">Add Connection</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Beat</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Story Beat</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Title</Label><Input value={newBeat.title} onChange={e => setNewBeat(p => ({ ...p, title: e.target.value }))} placeholder="Beat title" /></div>
                <div>
                  <Label>Beat Type</Label>
                  <Select value={newBeat.beat_type} onValueChange={v => setNewBeat(p => ({ ...p, beat_type: v as StoryBeatType }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{BEAT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.emoji} {t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Summary</Label><Textarea value={newBeat.summary} onChange={e => setNewBeat(p => ({ ...p, summary: e.target.value }))} placeholder="Brief summary" rows={2} /></div>
                <div><Label>Content</Label><Textarea value={newBeat.content} onChange={e => setNewBeat(p => ({ ...p, content: e.target.value }))} placeholder="Full content..." rows={4} /></div>
                <Button onClick={handleAddBeat} className="w-full">Create Beat</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search beats..." className="pl-9" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {BEAT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.emoji} {t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No story beats yet. Click "Add Beat" to start building your narrative.</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(beat => {
            const info = beatTypeInfo(beat.beat_type);
            const connections = projectConns.filter(c => c.source_beat_id === beat.id || c.target_beat_id === beat.id);
            return (
              <Card key={beat.id} className="group hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span>{info?.emoji}</span>
                      {beat.title}
                    </CardTitle>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => removeStoryBeat(beat.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                  <Badge variant="secondary" className="text-xs w-fit">{info?.label}</Badge>
                </CardHeader>
                <CardContent className="space-y-2">
                  {beat.summary && <p className="text-sm text-muted-foreground line-clamp-2">{beat.summary}</p>}
                  {connections.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {connections.map(c => {
                        const target = projectBeats.find(b => b.id === (c.source_beat_id === beat.id ? c.target_beat_id : c.source_beat_id));
                        const connType = CONNECTION_TYPES.find(t => t.value === c.connection_type);
                        return (
                          <Badge key={c.id} variant="outline" className="text-xs cursor-pointer" onClick={() => removeStoryConnection(c.id)}>
                            {connType?.label} → {target?.title || '?'}
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
