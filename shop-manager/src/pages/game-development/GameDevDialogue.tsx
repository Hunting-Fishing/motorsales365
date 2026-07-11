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
import { Plus, MessageSquare, Trash2, Search, GitBranch } from 'lucide-react';
import { DialogueTree, DialogueNode, DialogueNodeType, DIALOGUE_NODE_CONFIG } from '@/types/game-development';

export default function GameDevDialogue() {
  const { activeProjectId, dialogueTrees, dialogueNodes, addDialogueTree, removeDialogueTree, addDialogueNode, removeDialogueNode } = useGameDevStore();
  const [showAddTree, setShowAddTree] = useState(false);
  const [showAddNode, setShowAddNode] = useState(false);
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [treeForm, setTreeForm] = useState({ name: '', description: '' });
  const [nodeForm, setNodeForm] = useState({ text: '', node_type: 'npc-line' as DialogueNodeType });

  const projectTrees = dialogueTrees.filter(t => t.project_id === activeProjectId);
  const selectedTree = projectTrees.find(t => t.id === selectedTreeId);
  const treeNodes = dialogueNodes.filter(n => n.tree_id === selectedTreeId);

  if (!activeProjectId) {
    return (
      <div className="p-6 space-y-4">
        <GameDevProjectSelector />
        <Card><CardContent className="py-12 text-center text-muted-foreground">Select a project to manage dialogue trees.</CardContent></Card>
      </div>
    );
  }

  const handleAddTree = () => {
    if (!treeForm.name.trim()) return;
    const id = addDialogueTree({ project_id: activeProjectId, name: treeForm.name, description: treeForm.description || undefined });
    setSelectedTreeId(id);
    setTreeForm({ name: '', description: '' });
    setShowAddTree(false);
  };

  const handleAddNode = () => {
    if (!nodeForm.text.trim() || !selectedTreeId) return;
    addDialogueNode({
      project_id: activeProjectId,
      tree_id: selectedTreeId,
      node_type: nodeForm.node_type,
      text: nodeForm.text,
      position_x: Math.random() * 400,
      position_y: Math.random() * 400,
      tags: [],
    });
    setNodeForm({ text: '', node_type: 'npc-line' });
    setShowAddNode(false);
  };

  const NODE_TYPES = Object.entries(DIALOGUE_NODE_CONFIG) as [DialogueNodeType, typeof DIALOGUE_NODE_CONFIG[DialogueNodeType]][];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><MessageSquare className="h-6 w-6 text-primary" /> Dialogue Trees</h1>
          <p className="text-sm text-muted-foreground">{projectTrees.length} trees</p>
        </div>
        <div className="flex items-center gap-2">
          <GameDevProjectSelector />
          <Dialog open={showAddTree} onOpenChange={setShowAddTree}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Tree</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Dialogue Tree</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Name</Label><Input value={treeForm.name} onChange={e => setTreeForm(p => ({ ...p, name: e.target.value }))} placeholder="Tree name" /></div>
                <div><Label>Description</Label><Textarea value={treeForm.description} onChange={e => setTreeForm(p => ({ ...p, description: e.target.value }))} placeholder="What is this conversation about?" rows={2} /></div>
                <Button onClick={handleAddTree} className="w-full">Create Tree</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Tree list */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search trees..." className="pl-9" />
          </div>
          {projectTrees.filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase())).map(tree => (
            <Card
              key={tree.id}
              className={`cursor-pointer transition-colors ${selectedTreeId === tree.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
              onClick={() => setSelectedTreeId(tree.id)}
            >
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm flex items-center gap-1.5"><GitBranch className="h-3.5 w-3.5" />{tree.name}</p>
                  {tree.description && <p className="text-xs text-muted-foreground line-clamp-1">{tree.description}</p>}
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={e => { e.stopPropagation(); removeDialogueTree(tree.id); if (selectedTreeId === tree.id) setSelectedTreeId(null); }}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
          {projectTrees.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No dialogue trees yet.</p>}
        </div>

        {/* Nodes panel */}
        <div>
          {selectedTree ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{selectedTree.name}</h2>
                <Dialog open={showAddNode} onOpenChange={setShowAddNode}>
                  <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Node</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>New Dialogue Node</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div>
                        <Label>Node Type</Label>
                        <Select value={nodeForm.node_type} onValueChange={v => setNodeForm(p => ({ ...p, node_type: v as DialogueNodeType }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{NODE_TYPES.map(([k, v]) => <SelectItem key={k} value={k}>{v.emoji} {v.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label>Text</Label><Textarea value={nodeForm.text} onChange={e => setNodeForm(p => ({ ...p, text: e.target.value }))} placeholder="Dialogue text..." rows={3} /></div>
                      <Button onClick={handleAddNode} className="w-full">Add Node</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              {treeNodes.length === 0 ? (
                <Card><CardContent className="py-8 text-center text-muted-foreground">No nodes yet. Add dialogue nodes to build this conversation.</CardContent></Card>
              ) : (
                <div className="space-y-2">
                  {treeNodes.map(node => {
                    const config = DIALOGUE_NODE_CONFIG[node.node_type];
                    return (
                      <Card key={node.id} className="group">
                        <CardContent className="p-3 flex items-start gap-3">
                          <span className="text-lg mt-0.5">{config.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Badge variant="secondary" className="text-xs">{config.label}</Badge>
                            </div>
                            <p className="text-sm">{node.text}</p>
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0" onClick={() => removeDialogueNode(node.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Select a dialogue tree from the left or create a new one.</CardContent></Card>
          )}
        </div>
      </div>
    </div>
  );
}
