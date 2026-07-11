import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameDevStore } from '@/stores/game-dev-store';
import { NODE_TYPE_CONFIG, type NodeType } from '@/types/game-development';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GameDevProjectSelector } from '@/components/game-development/GameDevProjectSelector';
import {
  Plus, ArrowLeft, Trash2, Search, Filter, Sparkles, Grid3X3,
  Gamepad2, Puzzle, Cog, RefreshCw, MapIcon, Target, Scroll,
  User, Shield, Package, Skull, Crown, Monitor, BookOpen, FileText,
  TrendingUp, DollarSign, Cpu, Image, CheckSquare, AlertTriangle, Flag, StickyNote,
} from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  Gamepad2, Puzzle, Cog, RefreshCw, Map: MapIcon, Target, Scroll,
  User, Shield, Package, Skull, Crown, Monitor, BookOpen, FileText,
  TrendingUp, DollarSign, Cpu, Image, CheckSquare, AlertTriangle, Flag, StickyNote,
};

const statusColors: Record<string, string> = {
  'idea': 'bg-muted text-muted-foreground',
  'planned': 'bg-blue-500/20 text-blue-400',
  'in-progress': 'bg-amber-500/20 text-amber-400',
  'review': 'bg-primary/20 text-primary',
  'done': 'bg-emerald-500/20 text-emerald-400',
  'blocked': 'bg-destructive/20 text-destructive',
};

export default function GameDevCanvas() {
  const navigate = useNavigate();
  const {
    activeProjectId, activeBoardId, boards, boardNodes, boardEdges,
    addBoardNode, updateBoardNode, removeBoardNode,
    setActiveBoard, addBoard, updateBoard, removeBoard,
  } = useGameDevStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [addingNode, setAddingNode] = useState(false);
  const [newNodeType, setNewNodeType] = useState<NodeType>('feature');
  const [newNodeTitle, setNewNodeTitle] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const board = boards.find(b => b.id === activeBoardId);
  const filteredNodes = useMemo(() => {
    let nodes = boardNodes.filter(n => n.board_id === activeBoardId);
    if (searchQuery) nodes = nodes.filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase()));
    if (filterType !== 'all') nodes = nodes.filter(n => n.node_type === filterType);
    return nodes;
  }, [boardNodes, activeBoardId, searchQuery, filterType]);

  const selectedNode = boardNodes.find(n => n.id === selectedNodeId);

  if (!activeBoardId || !board) {
    return (
      <div className="p-4 md:p-6 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Canvas Planner</h1>
          <GameDevProjectSelector />
        </div>
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Grid3X3 className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">No canvas selected.</p>
          <Button onClick={() => navigate('/game-development/canvas-overview')} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Canvas Overview
          </Button>
        </div>
      </div>
    );
  }

  const handleAddNode = () => {
    if (!newNodeTitle.trim() || !activeBoardId) return;
    const config = NODE_TYPE_CONFIG[newNodeType];
    addBoardNode({
      board_id: activeBoardId,
      node_type: newNodeType,
      title: newNodeTitle.trim(),
      status: 'idea',
      priority: 'medium',
      color: config?.color || '220 60% 55%',
      position_x: Math.random() * 600 + 100,
      position_y: Math.random() * 400 + 100,
      width: 200,
      height: 100,
    });
    setNewNodeTitle('');
    setAddingNode(false);
  };

  return (
    <div className="p-4 md:p-6 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/game-development/canvas-overview')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{board.name}</h1>
            {board.description && <p className="text-xs text-muted-foreground">{board.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <GameDevProjectSelector />
          <Button size="sm" className="gap-1.5" onClick={() => setAddingNode(true)}>
            <Plus className="h-3.5 w-3.5" /> Add Node
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input className="h-8 pl-8 text-xs" placeholder="Search nodes..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[150px] h-8 text-xs">
            <Filter className="h-3 w-3 mr-1" /><SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(NODE_TYPE_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="secondary" className="text-xs">{filteredNodes.length} nodes</Badge>
      </div>

      {/* Nodes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filteredNodes.map(node => {
          const config = NODE_TYPE_CONFIG[node.node_type];
          const Icon = iconMap[config?.icon] ?? Gamepad2;
          const nodeColor = node.color || config?.color || '220 60% 55%';

          return (
            <Card
              key={node.id}
              className="cursor-pointer hover:border-primary/30 transition-all hover:shadow-md group"
              onClick={() => setSelectedNodeId(node.id)}
            >
              <div className="px-3 py-1.5 flex items-center gap-1.5" style={{ backgroundColor: `hsl(${nodeColor} / 0.1)` }}>
                <Icon className="h-3 w-3 shrink-0" style={{ color: `hsl(${nodeColor})` }} />
                <span className="text-[9px] font-semibold uppercase tracking-wider truncate" style={{ color: `hsl(${nodeColor})` }}>
                  {config?.label ?? node.node_type}
                </span>
              </div>
              <CardContent className="p-3">
                <p className="text-sm font-medium truncate">{node.title}</p>
                {node.summary && <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{node.summary}</p>}
                <div className="flex gap-1 mt-2 flex-wrap">
                  {node.status && <Badge className={`text-[8px] px-1 py-0 h-4 ${statusColors[node.status] || 'bg-muted'}`}>{node.status}</Badge>}
                  {node.priority && <Badge variant="outline" className="text-[8px] px-1 py-0 h-4">{node.priority}</Badge>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredNodes.length === 0 && (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <Sparkles className="h-10 w-10 mb-4 opacity-40" />
          <p>No nodes on this canvas yet. Add your first node!</p>
        </div>
      )}

      {/* Add Node Dialog */}
      <Dialog open={addingNode} onOpenChange={setAddingNode}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Node</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={newNodeType} onValueChange={(v: NodeType) => setNewNodeType(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(NODE_TYPE_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Node title" value={newNodeTitle} onChange={e => setNewNodeTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddNode()} />
            <Button onClick={handleAddNode} disabled={!newNodeTitle.trim()} className="w-full">Add Node</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Node Detail Dialog */}
      <Dialog open={!!selectedNode} onOpenChange={() => setSelectedNodeId(null)}>
        <DialogContent className="max-w-md">
          {selectedNode && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedNode.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Badge className={statusColors[selectedNode.status] || 'bg-muted'}>{selectedNode.status}</Badge>
                  <Badge variant="outline">{selectedNode.priority}</Badge>
                  <Badge variant="outline">{NODE_TYPE_CONFIG[selectedNode.node_type]?.label}</Badge>
                </div>
                {selectedNode.summary && <p className="text-sm text-muted-foreground">{selectedNode.summary}</p>}
                <div className="flex gap-2">
                  <Select value={selectedNode.status} onValueChange={v => updateBoardNode(selectedNode.id, { status: v as any })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['idea', 'planned', 'in-progress', 'review', 'done', 'blocked'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={selectedNode.priority} onValueChange={v => updateBoardNode(selectedNode.id, { priority: v as any })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['critical', 'high', 'medium', 'low', 'backlog'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => { removeBoardNode(selectedNode.id); setSelectedNodeId(null); }}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete Node
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
