import { useState } from 'react';
import { useGameDevStore } from '@/stores/game-dev-store';
import { GameDevProjectSelector } from '@/components/game-development/GameDevProjectSelector';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, Search, UserPlus } from 'lucide-react';

export default function GameDevTeam() {
  const { planTasks, assetRequirements, activeProjectId } = useGameDevStore();
  const [search, setSearch] = useState('');

  if (!activeProjectId) {
    return (
      <div className="p-6 space-y-4">
        <GameDevProjectSelector />
        <Card><CardContent className="py-12 text-center text-muted-foreground">Select a project to view team workload.</CardContent></Card>
      </div>
    );
  }

  // Aggregate contributors from tasks (using tags as a proxy for assignment since PlanTask has no assignedTo)
  const tasksByPerson: Record<string, { tasks: number; done: number; active: number; assets: number }> = {};

  // Asset requirements have linked_feature which can indicate assignment
  assetRequirements.filter(a => a.project_id === activeProjectId && a.linked_feature).forEach(a => {
    const name = a.linked_feature!;
    if (!tasksByPerson[name]) tasksByPerson[name] = { tasks: 0, done: 0, active: 0, assets: 0 };
    tasksByPerson[name].assets++;
  });

  // Group tasks by tags
  planTasks.filter(t => t.project_id === activeProjectId).forEach(t => {
    const tag = t.tags?.[0] || 'Unassigned';
    if (!tasksByPerson[tag]) tasksByPerson[tag] = { tasks: 0, done: 0, active: 0, assets: 0 };
    tasksByPerson[tag].tasks++;
    if (t.status === 'done') tasksByPerson[tag].done++;
    if (t.status === 'active') tasksByPerson[tag].active++;
  });

  const people = Object.entries(tasksByPerson)
    .filter(([name]) => !search || name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (b[1].tasks + b[1].assets) - (a[1].tasks + a[1].assets));

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6 text-primary" /> Team Workload</h1>
          <p className="text-sm text-muted-foreground">{people.length} contributors</p>
        </div>
        <GameDevProjectSelector />
      </div>

      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-8" placeholder="Search team members..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {people.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <UserPlus className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
          No team assignments yet. Tag tasks in Roadmap or link assets in the Asset Pipeline.
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {people.map(([name, data]) => {
            const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
            const completion = data.tasks > 0 ? Math.round((data.done / data.tasks) * 100) : 0;
            return (
              <Card key={name} className="hover:bg-accent/30 transition-colors">
                <CardContent className="p-4 flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="text-xs bg-primary/20 text-primary">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{name}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Badge variant="outline" className="text-xs">{data.tasks} tasks</Badge>
                      {data.active > 0 && <Badge className="text-xs bg-primary/20 text-primary">{data.active} active</Badge>}
                      {data.assets > 0 && <Badge variant="secondary" className="text-xs">{data.assets} assets</Badge>}
                    </div>
                    {data.tasks > 0 && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Completion</span>
                          <span>{completion}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full mt-0.5 overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${completion}%` }} />
                        </div>
                      </div>
                    )}
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
