import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameDevStore } from '@/stores/game-dev-store';
import { NODE_TYPE_CONFIG, type NodeType } from '@/types/game-development';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GameDevProjectSelector } from '@/components/game-development/GameDevProjectSelector';
import {
  Plus, Workflow, Link2, Box, ArrowRight,
  Gamepad2, Puzzle, Cog, RefreshCw, MapIcon, Target, Scroll,
  User, Shield, Package, Skull, Crown, Monitor, BookOpen, FileText,
  TrendingUp, DollarSign, Cpu, Image, CheckSquare, AlertTriangle, Flag, StickyNote,
} from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  Gamepad2, Puzzle, Cog, RefreshCw, Map: MapIcon, Target, Scroll,
  User, Shield, Package, Skull, Crown, Monitor, BookOpen, FileText,
  TrendingUp, DollarSign, Cpu, Image, CheckSquare, AlertTriangle, Flag, StickyNote,
};

export default function GameDevCanvasOverview() {
  const navigate = useNavigate();
  const {
    activeProjectId, boards, boardNodes, boardEdges, crossCanvasLinks,
    setActiveBoard, addBoard,
  } = useGameDevStore();

  const projectBoards = useMemo(
    () => boards.filter(b => b.project_id === activeProjectId),
    [boards, activeProjectId],
  );

  const boardStats = useMemo(() => {
    const stats: Record<string, { nodes: number; edges: number; xLinks: number; nodeTypes: Record<string, number> }> = {};
    for (const b of projectBoards) {
      const nodes = boardNodes.filter(n => n.board_id === b.id);
      const edges = boardEdges.filter(e => nodes.some(n => n.id === e.source_node_id) || nodes.some(n => n.id === e.target_node_id));
      const xLinks = crossCanvasLinks.filter(l => l.source_board_id === b.id || l.target_board_id === b.id);
      const nodeTypes: Record<string, number> = {};
      nodes.forEach(n => { nodeTypes[n.node_type] = (nodeTypes[n.node_type] || 0) + 1; });
      stats[b.id] = { nodes: nodes.length, edges: edges.length, xLinks: xLinks.length, nodeTypes };
    }
    return stats;
  }, [projectBoards, boardNodes, boardEdges, crossCanvasLinks]);

  const handleOpenBoard = (boardId: string) => {
    setActiveBoard(boardId);
    navigate('/game-development/canvas');
  };

  const onAddBoard = () => {
    const id = addBoard({ project_id: activeProjectId!, name: 'New Canvas', description: '' });
    setActiveBoard(id);
    navigate('/game-development/canvas');
  };

  if (!activeProjectId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-muted-foreground">
        <GameDevProjectSelector />
        <p>Select a project to view canvases.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Workflow className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Canvas Overview</h1>
            <Badge variant="secondary" className="text-xs">{projectBoards.length} boards</Badge>
          </div>
          <div className="flex items-center gap-2">
            <GameDevProjectSelector />
            <Button onClick={onAddBoard} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> New Canvas
            </Button>
          </div>
        </div>

        {projectBoards.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Workflow className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground mb-4">No canvases yet. Create your first planning board.</p>
              <Button onClick={onAddBoard} className="gap-1.5"><Plus className="h-4 w-4" /> Create Canvas</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projectBoards.map(board => {
              const s = boardStats[board.id];
              const topTypes = Object.entries(s.nodeTypes).sort(([, a], [, b]) => b - a).slice(0, 5);
              const boardColor = board.color || '220 60% 55%';

              return (
                <Card
                  key={board.id}
                  className="group cursor-pointer hover:shadow-lg transition-all hover:border-primary/40 overflow-hidden"
                  onClick={() => handleOpenBoard(board.id)}
                >
                  <div
                    className="h-24 relative"
                    style={{ background: `linear-gradient(135deg, hsl(${boardColor} / 0.15), hsl(${boardColor} / 0.05))` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-card/80" />
                  </div>

                  <CardHeader className="pb-2 pt-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold truncate">{board.name}</CardTitle>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    {board.description && <p className="text-xs text-muted-foreground line-clamp-2">{board.description}</p>}
                  </CardHeader>

                  <CardContent className="space-y-3 pb-4">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Box className="h-3.5 w-3.5" /> {s.nodes} nodes</span>
                      <span className="flex items-center gap-1"><Link2 className="h-3.5 w-3.5" /> {s.edges} links</span>
                      {s.xLinks > 0 && <span className="flex items-center gap-1 text-primary"><Workflow className="h-3.5 w-3.5" /> {s.xLinks} cross</span>}
                    </div>
                    {topTypes.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {topTypes.map(([type, count]) => {
                          const config = NODE_TYPE_CONFIG[type as NodeType];
                          const Icon = iconMap[config?.icon] ?? Gamepad2;
                          return (
                            <Badge key={type} variant="outline" className="text-[10px] px-1.5 py-0 gap-1 font-normal">
                              <Icon className="h-3 w-3" style={{ color: `hsl(${config?.color || '220 60% 55%'})` }} />
                              {count}
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            <Card className="border-dashed cursor-pointer hover:border-primary/40 hover:bg-accent/30 transition-all flex items-center justify-center min-h-[220px]" onClick={onAddBoard}>
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Plus className="h-8 w-8" />
                <span className="text-sm font-medium">New Canvas</span>
              </div>
            </Card>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
