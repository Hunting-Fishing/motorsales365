import { useGameDevStore } from '@/stores/game-dev-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { GameDevProjectSelector } from '@/components/game-development/GameDevProjectSelector';
import {
  Gamepad2, Flag, Star, AlertTriangle, Sparkles, Clock,
  LayoutDashboard, Database, Map, FileText, BookOpen, Users,
  MessageSquare, Package, TrendingUp, Target, Shield, Grid3X3,
} from 'lucide-react';

const statusColors: Record<string, string> = {
  'idea': 'bg-muted text-muted-foreground',
  'planned': 'bg-blue-500/20 text-blue-400',
  'in-progress': 'bg-amber-500/20 text-amber-400',
  'review': 'bg-primary/20 text-primary',
  'done': 'bg-emerald-500/20 text-emerald-400',
  'blocked': 'bg-destructive/20 text-destructive',
  'cut': 'bg-muted text-muted-foreground line-through',
  'backlog': 'bg-secondary text-secondary-foreground',
};

const quickLinks = [
  { title: 'Canvas Planner', href: '/game-development/canvas', icon: LayoutDashboard, color: 'text-blue-400' },
  { title: 'Database', href: '/game-development/database', icon: Database, color: 'text-emerald-400' },
  { title: 'Roadmap', href: '/game-development/roadmap', icon: Map, color: 'text-amber-400' },
  { title: 'GDD Builder', href: '/game-development/gdd', icon: FileText, color: 'text-purple-400' },
  { title: 'Story Tracker', href: '/game-development/story', icon: BookOpen, color: 'text-pink-400' },
  { title: 'Characters', href: '/game-development/characters', icon: Users, color: 'text-orange-400' },
  { title: 'Dialogue Trees', href: '/game-development/dialogue', icon: MessageSquare, color: 'text-cyan-400' },
  { title: 'Items & Loot', href: '/game-development/items', icon: Package, color: 'text-yellow-400' },
  { title: 'Economy', href: '/game-development/economy', icon: TrendingUp, color: 'text-green-400' },
  { title: 'Quests', href: '/game-development/quests', icon: Target, color: 'text-red-400' },
  { title: 'Raids & Events', href: '/game-development/raids', icon: Shield, color: 'text-indigo-400' },
  { title: 'Level Editor', href: '/game-development/levels', icon: Grid3X3, color: 'text-teal-400' },
];

export default function GameDevDashboard() {
  const { projects, activeProjectId, milestones, planningRecords, boardNodes, boards } = useGameDevStore();
  const navigate = useNavigate();
  const project = projects.find(p => p.id === activeProjectId);
  const projMilestones = milestones.filter(m => m.project_id === activeProjectId);
  const projRecords = planningRecords.filter(r => r.project_id === activeProjectId);
  const projectBoards = boards.filter(b => b.project_id === activeProjectId);
  const projNodes = boardNodes.filter(n => projectBoards.some(b => b.id === n.board_id));
  const risks = projNodes.filter(n => n.node_type === 'risk');
  const activeMilestones = projMilestones.filter(m => m.status !== 'done' && m.status !== 'cut');

  if (!project) {
    return (
      <div className="p-4 md:p-6 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold">Game Development</h1>
          <GameDevProjectSelector />
        </div>

        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="p-4 rounded-full bg-primary/10">
            <Sparkles className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">Welcome to GameForge</h2>
          <p className="text-muted-foreground text-center max-w-md">
            Select a project from the dropdown or create a new one to get started with your game planning.
          </p>
          <Button onClick={() => navigate('/game-development/projects')} className="gap-2">
            <Gamepad2 className="h-4 w-4" /> Go to Projects
          </Button>
        </div>

        {/* Quick links grid */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Quick Access</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {quickLinks.map(link => (
              <Card
                key={link.href}
                className="cursor-pointer hover:border-primary/30 transition-all hover:shadow-md"
                onClick={() => navigate(link.href)}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  <link.icon className={`h-5 w-5 ${link.color}`} />
                  <span className="text-sm font-medium">{link.title}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 animate-fade-in">
      {/* Hero */}
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold">{project.name}</h1>
          {project.description && <p className="text-sm text-muted-foreground">{project.description}</p>}
          <div className="flex flex-wrap gap-1.5">
            <Badge className={statusColors[project.status]}>{project.status}</Badge>
            <Badge variant="outline" className="text-xs">{project.engine}</Badge>
            <Badge variant="outline" className="text-xs">{project.phase}</Badge>
            {project.genre && <Badge variant="outline" className="text-xs">{project.genre}</Badge>}
          </div>
        </div>
        <GameDevProjectSelector />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Gamepad2 className="h-5 w-5 text-primary" />} label="Canvas Nodes" value={projNodes.length} onClick={() => navigate('/game-development/canvas')} />
        <StatCard icon={<Flag className="h-5 w-5 text-blue-400" />} label="Milestones" value={projMilestones.length} onClick={() => navigate('/game-development/roadmap')} />
        <StatCard icon={<Star className="h-5 w-5 text-amber-400" />} label="Planning Records" value={projRecords.length} onClick={() => navigate('/game-development/database')} />
        <StatCard icon={<AlertTriangle className="h-5 w-5 text-destructive" />} label="Open Risks" value={risks.length} onClick={() => navigate('/game-development/canvas')} />
      </div>

      {/* Active Milestones */}
      {activeMilestones.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4" /> Active Milestones</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activeMilestones.slice(0, 5).map(m => (
                <div key={m.id} className="flex items-center justify-between text-sm">
                  <span className="truncate">{m.title}</span>
                  <Badge className={statusColors[m.status] || 'bg-muted'}>{m.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick links */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Quick Access</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {quickLinks.map(link => (
            <Card
              key={link.href}
              className="cursor-pointer hover:border-primary/30 transition-all hover:shadow-md"
              onClick={() => navigate(link.href)}
            >
              <CardContent className="p-3 flex items-center gap-3">
                <link.icon className={`h-5 w-5 ${link.color}`} />
                <span className="text-sm font-medium">{link.title}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, onClick }: { icon: React.ReactNode; label: string; value: number; onClick?: () => void }) {
  return (
    <Card className={onClick ? 'cursor-pointer hover:border-primary/30 transition-all' : ''} onClick={onClick}>
      <CardContent className="p-3 md:p-4 flex items-center gap-3">
        {icon}
        <div>
          <p className="text-xl md:text-2xl font-bold">{value}</p>
          <p className="text-[11px] text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
