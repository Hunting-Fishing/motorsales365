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
import { TestTube, Plus, Trash2, Edit, Calendar, User, Clock } from 'lucide-react';
import { PlaytestSession, PlaytestStatus, FEEDBACK_CATEGORY_CONFIG } from '@/types/game-development';

const STATUS_CONFIG: Record<PlaytestStatus, { label: string; color: string }> = {
  'planned': { label: 'Planned', color: 'bg-blue-500/20 text-blue-400' },
  'in-progress': { label: 'In Progress', color: 'bg-yellow-500/20 text-yellow-400' },
  'completed': { label: 'Completed', color: 'bg-green-500/20 text-green-400' },
  'cancelled': { label: 'Cancelled', color: 'bg-red-500/20 text-red-400' },
};

export default function GameDevPlaytesting() {
  const { activeProjectId, playtestSessions, addPlaytestSession, updatePlaytestSession, removePlaytestSession } = useGameDevStore();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<PlaytestSession | null>(null);

  const [title, setTitle] = useState('');
  const [tester, setTester] = useState('');
  const [build, setBuild] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<PlaytestStatus>('planned');
  const [duration, setDuration] = useState('60');

  const projectSessions = playtestSessions.filter(s => s.project_id === activeProjectId);

  const resetForm = () => { setTitle(''); setTester(''); setBuild(''); setNotes(''); setStatus('planned'); setDuration('60'); };

  const handleSave = () => {
    if (!title.trim() || !activeProjectId) return;
    const data: Partial<PlaytestSession> = {
      title, tester_name: tester, build_version: build, notes, status,
      duration_minutes: Number(duration) || 60,
    };
    if (editing) {
      updatePlaytestSession(editing.id, data);
    } else {
      addPlaytestSession({ ...data, project_id: activeProjectId, feedback: [], action_items: [], tags: [], session_date: new Date().toISOString() } as Omit<PlaytestSession, 'id'>);
    }
    resetForm(); setShowAdd(false); setEditing(null);
  };

  const openEdit = (s: PlaytestSession) => {
    setEditing(s); setTitle(s.title); setTester(s.tester_name || ''); setBuild(s.build_version || '');
    setNotes(s.notes || ''); setStatus(s.status); setDuration(String(s.duration_minutes || 60)); setShowAdd(true);
  };

  if (!activeProjectId) {
    return (
      <div className="p-6 space-y-4">
        <GameDevProjectSelector />
        <Card><CardContent className="p-12 text-center text-muted-foreground">Select a project to manage playtests.</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><TestTube className="h-6 w-6 text-primary" /> Playtesting Journal</h1>
          <p className="text-sm text-muted-foreground">{projectSessions.length} sessions</p>
        </div>
        <div className="flex items-center gap-2">
          <GameDevProjectSelector />
          <Button onClick={() => { resetForm(); setEditing(null); setShowAdd(true); }}><Plus className="h-4 w-4 mr-1" /> New Session</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projectSessions.map(session => {
          const sCfg = STATUS_CONFIG[session.status];
          return (
            <Card key={session.id} className="group hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-sm">🧪 {session.title}</CardTitle>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(session)}><Edit className="h-3 w-3" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removePlaytestSession(session.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <Badge className={sCfg.color}>{sCfg.label}</Badge>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {session.tester_name && <span className="flex items-center gap-1"><User className="h-3 w-3" />{session.tester_name}</span>}
                  {session.build_version && <span>🏷️ {session.build_version}</span>}
                  {session.duration_minutes && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{session.duration_minutes}m</span>}
                  {session.session_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(session.session_date).toLocaleDateString()}</span>}
                </div>
                {session.feedback.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {Object.entries(FEEDBACK_CATEGORY_CONFIG).map(([cat, cfg]) => {
                      const count = session.feedback.filter(f => f.category === cat).length;
                      return count > 0 ? <Badge key={cat} variant="outline" className="text-xs">{cfg.emoji} {count}</Badge> : null;
                    })}
                  </div>
                )}
                {session.notes && <p className="text-xs text-muted-foreground line-clamp-2">{session.notes}</p>}
              </CardContent>
            </Card>
          );
        })}
        {projectSessions.length === 0 && <div className="col-span-full text-center py-12 text-muted-foreground">No playtest sessions yet. Start documenting your testing!</div>}
      </div>

      <Dialog open={showAdd} onOpenChange={v => { if (!v) { setShowAdd(false); setEditing(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Edit Session' : 'New Playtest Session'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Alpha Build Test #1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tester</Label><Input value={tester} onChange={e => setTester(e.target.value)} placeholder="Name" /></div>
              <div><Label>Build Version</Label><Input value={build} onChange={e => setBuild(e.target.value)} placeholder="v0.1.3" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Duration (min)</Label><Input type="number" value={duration} onChange={e => setDuration(e.target.value)} /></div>
              <div>
                <Label>Status</Label>
                <Select value={status} onValueChange={v => setStatus(v as PlaytestStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Key observations..." /></div>
            <Button onClick={handleSave} className="w-full">{editing ? 'Update Session' : 'Create Session'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
