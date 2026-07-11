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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Swords, Calendar, Trash2, Search, Users, Clock } from 'lucide-react';
import {
  RaidPlan, EventPlan, RaidDifficulty, EventType, EventRecurrence,
  PlanningStatus, Priority, RAID_DIFFICULTY_CONFIG, EVENT_TYPE_CONFIG, EVENT_RECURRENCE_CONFIG,
} from '@/types/game-development';

const STATUSES: PlanningStatus[] = ['idea', 'planned', 'in-progress', 'review', 'done', 'blocked'];
const PRIORITIES: Priority[] = ['critical', 'high', 'medium', 'low', 'backlog'];

export default function GameDevRaids() {
  const { activeProjectId, raids, events, addRaid, removeRaid, addEvent, removeEvent } = useGameDevStore();
  const [tab, setTab] = useState('raids');
  const [showAddRaid, setShowAddRaid] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [search, setSearch] = useState('');

  const [raidForm, setRaidForm] = useState({
    name: '', description: '', difficulty: 'normal' as RaidDifficulty,
    player_count_min: 4, player_count_max: 8, boss_count: 1,
    status: 'planned' as PlanningStatus, priority: 'medium' as Priority,
  });
  const [eventForm, setEventForm] = useState({
    name: '', description: '', event_type: 'seasonal' as EventType,
    recurrence: 'one-time' as EventRecurrence,
    status: 'planned' as PlanningStatus, priority: 'medium' as Priority,
  });

  const projectRaids = raids.filter(r => r.project_id === activeProjectId);
  const projectEvents = events.filter(e => e.project_id === activeProjectId);

  if (!activeProjectId) {
    return (
      <div className="p-6 space-y-4">
        <GameDevProjectSelector />
        <Card><CardContent className="py-12 text-center text-muted-foreground">Select a project to manage raids & events.</CardContent></Card>
      </div>
    );
  }

  const handleAddRaid = () => {
    if (!raidForm.name.trim()) return;
    addRaid({
      project_id: activeProjectId, name: raidForm.name,
      description: raidForm.description || undefined, difficulty: raidForm.difficulty,
      player_count_min: raidForm.player_count_min, player_count_max: raidForm.player_count_max,
      boss_count: raidForm.boss_count, status: raidForm.status, priority: raidForm.priority,
      tags: [],
    });
    setRaidForm({ name: '', description: '', difficulty: 'normal', player_count_min: 4, player_count_max: 8, boss_count: 1, status: 'planned', priority: 'medium' });
    setShowAddRaid(false);
  };

  const handleAddEvent = () => {
    if (!eventForm.name.trim()) return;
    addEvent({
      project_id: activeProjectId, name: eventForm.name,
      description: eventForm.description || undefined, event_type: eventForm.event_type,
      recurrence: eventForm.recurrence, status: eventForm.status, priority: eventForm.priority,
      tags: [],
    });
    setEventForm({ name: '', description: '', event_type: 'seasonal', recurrence: 'one-time', status: 'planned', priority: 'medium' });
    setShowAddEvent(false);
  };

  const filteredRaids = projectRaids.filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()));
  const filteredEvents = projectEvents.filter(e => !search || e.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Swords className="h-6 w-6 text-primary" /> Raids & Events</h1>
          <p className="text-sm text-muted-foreground">{projectRaids.length} raids, {projectEvents.length} events</p>
        </div>
        <GameDevProjectSelector />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="raids">⚔️ Raids ({projectRaids.length})</TabsTrigger>
            <TabsTrigger value="events">🎉 Events ({projectEvents.length})</TabsTrigger>
          </TabsList>
          {tab === 'raids' ? (
            <Dialog open={showAddRaid} onOpenChange={setShowAddRaid}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Raid</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New Raid</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Name</Label><Input value={raidForm.name} onChange={e => setRaidForm(p => ({ ...p, name: e.target.value }))} placeholder="Raid name" /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Difficulty</Label>
                      <Select value={raidForm.difficulty} onValueChange={v => setRaidForm(p => ({ ...p, difficulty: v as RaidDifficulty }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(RAID_DIFFICULTY_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.emoji} {v.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Boss Count</Label>
                      <Input type="number" value={raidForm.boss_count} onChange={e => setRaidForm(p => ({ ...p, boss_count: +e.target.value }))} min={0} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Min Players</Label><Input type="number" value={raidForm.player_count_min} onChange={e => setRaidForm(p => ({ ...p, player_count_min: +e.target.value }))} min={1} /></div>
                    <div><Label>Max Players</Label><Input type="number" value={raidForm.player_count_max} onChange={e => setRaidForm(p => ({ ...p, player_count_max: +e.target.value }))} min={1} /></div>
                  </div>
                  <div><Label>Description</Label><Textarea value={raidForm.description} onChange={e => setRaidForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
                  <Button onClick={handleAddRaid} className="w-full">Create Raid</Button>
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <Dialog open={showAddEvent} onOpenChange={setShowAddEvent}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Event</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New Event</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Name</Label><Input value={eventForm.name} onChange={e => setEventForm(p => ({ ...p, name: e.target.value }))} placeholder="Event name" /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Type</Label>
                      <Select value={eventForm.event_type} onValueChange={v => setEventForm(p => ({ ...p, event_type: v as EventType }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(EVENT_TYPE_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.emoji} {v.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Recurrence</Label>
                      <Select value={eventForm.recurrence} onValueChange={v => setEventForm(p => ({ ...p, recurrence: v as EventRecurrence }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(EVENT_RECURRENCE_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div><Label>Description</Label><Textarea value={eventForm.description} onChange={e => setEventForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
                  <Button onClick={handleAddEvent} className="w-full">Create Event</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="pl-9" />
        </div>

        <TabsContent value="raids" className="mt-4">
          {filteredRaids.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No raids yet. Design your first raid encounter.</CardContent></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredRaids.map(raid => {
                const diffConfig = RAID_DIFFICULTY_CONFIG[raid.difficulty];
                return (
                  <Card key={raid.id} className="group hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{diffConfig.emoji} {raid.name}</CardTitle>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => removeRaid(raid.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                      <div className="flex gap-1.5">
                        <Badge variant="secondary" className="text-xs">{diffConfig.label}</Badge>
                        <Badge variant="outline" className="text-xs capitalize">{raid.status}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {raid.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{raid.description}</p>}
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{raid.player_count_min}-{raid.player_count_max}</span>
                        <span>👑 {raid.boss_count} boss{raid.boss_count !== 1 ? 'es' : ''}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="events" className="mt-4">
          {filteredEvents.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No events yet. Plan your first live event.</CardContent></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredEvents.map(event => {
                const typeConfig = EVENT_TYPE_CONFIG[event.event_type];
                const recConfig = EVENT_RECURRENCE_CONFIG[event.recurrence];
                return (
                  <Card key={event.id} className="group hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{typeConfig.emoji} {event.name}</CardTitle>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => removeEvent(event.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                      <div className="flex gap-1.5">
                        <Badge variant="secondary" className="text-xs">{typeConfig.label}</Badge>
                        <Badge variant="outline" className="text-xs">{recConfig.label}</Badge>
                        <Badge variant="outline" className="text-xs capitalize">{event.status}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {event.description && <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
