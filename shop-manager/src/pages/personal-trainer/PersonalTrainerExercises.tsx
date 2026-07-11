import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, Search, Dumbbell, Video, AlertTriangle, BookOpen, Loader2, ChevronDown, ChevronUp, Download, Pencil, Trash2, ArrowUpDown, Layers } from 'lucide-react';
import { useShopId } from '@/hooks/useShopId';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DEFAULT_EXERCISES } from '@/data/defaultExercises';

const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Legs', 'Core', 'Glutes', 'Full Body', 'Cardio', 'Mobility'];
const CATEGORIES = ['strength', 'cardio', 'flexibility', 'plyometric', 'functional'];
const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];

const emptyForm = {
  name: '', category: 'strength', muscle_group: '', equipment: '', description: '', difficulty: 'intermediate',
  instructions: '', common_mistakes: '', video_url: '', image_url: '', alternatives: '',
};

export default function PersonalTrainerExercises() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterMuscle, setFilterMuscle] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [filterEquipment, setFilterEquipment] = useState('all');
  const [groupBy, setGroupBy] = useState<'none' | 'equipment' | 'muscle_group'>('none');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'muscle_group' | 'equipment' | 'difficulty'>('name-asc');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const { data: exercises = [], isLoading } = useQuery({
    queryKey: ['pt-exercises', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data } = await (supabase as any).from('pt_exercises').select('*').eq('shop_id', shopId).order('name');
      return data || [];
    },
    enabled: !!shopId,
  });

  const addExercise = useMutation({
    mutationFn: async () => {
      if (!shopId) throw new Error('No shop');
      const payload: any = { ...form, shop_id: shopId };
      ['instructions', 'common_mistakes', 'video_url', 'image_url', 'alternatives'].forEach(k => {
        if (!payload[k]) payload[k] = null;
      });
      const { error } = await (supabase as any).from('pt_exercises').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-exercises'] });
      toast({ title: 'Exercise added' });
      setDialogOpen(false);
      setForm({ ...emptyForm });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateExercise = useMutation({
    mutationFn: async () => {
      if (!editingId) throw new Error('No exercise selected');
      const payload: any = { ...form };
      ['instructions', 'common_mistakes', 'video_url', 'image_url', 'alternatives'].forEach(k => {
        if (!payload[k]) payload[k] = null;
      });
      const { error } = await (supabase as any).from('pt_exercises').update(payload).eq('id', editingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-exercises'] });
      toast({ title: 'Exercise updated' });
      setDialogOpen(false);
      setEditingId(null);
      setForm({ ...emptyForm });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteExercise = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('pt_exercises').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-exercises'] });
      toast({ title: 'Exercise deleted' });
      setDeleteId(null);
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const seedExercises = useMutation({
    mutationFn: async () => {
      if (!shopId) throw new Error('No shop');
      const rows = DEFAULT_EXERCISES.map(ex => ({
        ...ex,
        shop_id: shopId,
        is_custom: false,
        video_url: null,
        image_url: null,
      }));
      // Insert in batches of 20 to avoid payload limits
      for (let i = 0; i < rows.length; i += 20) {
        const batch = rows.slice(i, i + 20);
        const { error } = await (supabase as any).from('pt_exercises').insert(batch);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-exercises'] });
      toast({ title: `${DEFAULT_EXERCISES.length} exercises loaded!`, description: 'Your exercise library is ready to use.' });
    },
    onError: (e: any) => toast({ title: 'Error loading exercises', description: e.message, variant: 'destructive' }),
  });

  const openEdit = (ex: any) => {
    setEditingId(ex.id);
    setForm({
      name: ex.name || '',
      category: ex.category || 'strength',
      muscle_group: ex.muscle_group || '',
      equipment: ex.equipment || '',
      description: ex.description || '',
      difficulty: ex.difficulty || 'intermediate',
      instructions: ex.instructions || '',
      common_mistakes: ex.common_mistakes || '',
      video_url: ex.video_url || '',
      image_url: ex.image_url || '',
      alternatives: ex.alternatives || '',
    });
    setDialogOpen(true);
  };

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingId) {
      updateExercise.mutate();
    } else {
      addExercise.mutate();
    }
  };

  // Extract unique equipment types
  const equipmentOptions = useMemo(() => {
    const eqSet = new Set<string>();
    exercises.forEach((e: any) => {
      if (e.equipment) {
        const primary = e.equipment.split(',')[0].trim();
        if (primary) eqSet.add(primary);
      }
    });
    return Array.from(eqSet).sort();
  }, [exercises]);

  const filtered = useMemo(() => {
    let result = exercises.filter((e: any) => {
      const matchesSearch = `${e.name} ${e.muscle_group} ${e.category} ${e.equipment}`.toLowerCase().includes(search.toLowerCase());
      const matchesMuscle = filterMuscle === 'all' || e.muscle_group === filterMuscle;
      const matchesCategory = filterCategory === 'all' || e.category === filterCategory;
      const matchesDifficulty = filterDifficulty === 'all' || e.difficulty === filterDifficulty;
      const matchesEquipment = filterEquipment === 'all' || (e.equipment && e.equipment.split(',')[0].trim() === filterEquipment);
      return matchesSearch && matchesMuscle && matchesCategory && matchesDifficulty && matchesEquipment;
    });

    // Sort
    const diffOrder: Record<string, number> = { beginner: 0, intermediate: 1, advanced: 2 };
    result = [...result].sort((a: any, b: any) => {
      switch (sortBy) {
        case 'name-desc': return (b.name || '').localeCompare(a.name || '');
        case 'muscle_group': return (a.muscle_group || '').localeCompare(b.muscle_group || '') || (a.name || '').localeCompare(b.name || '');
        case 'equipment': return (a.equipment || '').localeCompare(b.equipment || '') || (a.name || '').localeCompare(b.name || '');
        case 'difficulty': return (diffOrder[a.difficulty] ?? 1) - (diffOrder[b.difficulty] ?? 1) || (a.name || '').localeCompare(b.name || '');
        default: return (a.name || '').localeCompare(b.name || '');
      }
    });

    return result;
  }, [exercises, search, filterMuscle, filterCategory, filterDifficulty, filterEquipment, sortBy]);

  // Group exercises
  const grouped = useMemo(() => {
    if (groupBy === 'none') return null;
    const groups: Record<string, any[]> = {};
    filtered.forEach((ex: any) => {
      const key = groupBy === 'equipment'
        ? (ex.equipment ? ex.equipment.split(',')[0].trim() : 'No Equipment')
        : (ex.muscle_group || 'Uncategorized');
      if (!groups[key]) groups[key] = [];
      groups[key].push(ex);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered, groupBy]);

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const isPending = addExercise.isPending || updateExercise.isPending;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Exercise Library</h1>
          <p className="text-muted-foreground text-sm">
            {exercises.length} exercises in your database
            {filtered.length !== exercises.length && ` · Showing ${filtered.length}`}
          </p>
        </div>
        <div className="flex gap-2">
          {exercises.length === 0 && !isLoading && (
            <Button
              variant="outline"
              onClick={() => seedExercises.mutate()}
              disabled={seedExercises.isPending}
              className="border-primary text-primary"
            >
              {seedExercises.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Loading...</>
              ) : (
                <><Download className="h-4 w-4 mr-2" />Load {DEFAULT_EXERCISES.length} Exercises</>
              )}
            </Button>
          )}
          <Button className="bg-gradient-to-r from-pink-500 to-rose-600 text-white" onClick={openAdd}>
            <Plus className="h-4 w-4 mr-2" />Add Exercise
          </Button>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditingId(null); setForm({ ...emptyForm }); } }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? 'Edit Exercise' : 'Add Exercise'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Exercise Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Barbell Squat" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Muscle Group</Label>
                <Select value={form.muscle_group} onValueChange={v => setForm(f => ({ ...f, muscle_group: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{MUSCLE_GROUPS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Equipment</Label><Input value={form.equipment} onChange={e => setForm(f => ({ ...f, equipment: e.target.value }))} placeholder="e.g. Barbell, Dumbbells" /></div>
              <div>
                <Label>Difficulty</Label>
                <Select value={form.difficulty} onValueChange={v => setForm(f => ({ ...f, difficulty: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DIFFICULTIES.map(d => <SelectItem key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief overview of the exercise" /></div>
            <div><Label>Step-by-Step Instructions</Label><Textarea value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))} placeholder="1. Stand with feet shoulder-width apart&#10;2. Grip the bar..." rows={4} /></div>
            <div><Label>Common Mistakes</Label><Textarea value={form.common_mistakes} onChange={e => setForm(f => ({ ...f, common_mistakes: e.target.value }))} placeholder="• Rounding the back&#10;• Knees caving in..." rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Video URL</Label><Input value={form.video_url} onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))} placeholder="https://youtube.com/..." /></div>
              <div><Label>Image URL</Label><Input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://..." /></div>
            </div>
            <div><Label>Alternative Exercises</Label><Input value={form.alternatives} onChange={e => setForm(f => ({ ...f, alternatives: e.target.value }))} placeholder="Leg Press, Goblet Squat" /></div>
            <Button className="w-full" disabled={!form.name || isPending} onClick={handleSubmit}>
              {isPending ? 'Saving...' : editingId ? 'Update Exercise' : 'Add Exercise'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Exercise</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this exercise from your library. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => deleteId && deleteExercise.mutate(deleteId)}
              disabled={deleteExercise.isPending}
            >
              {deleteExercise.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Search + Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search exercises..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterMuscle} onValueChange={setFilterMuscle}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Muscles</SelectItem>{MUSCLE_GROUPS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Types</SelectItem>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Levels</SelectItem>{DIFFICULTIES.map(d => <SelectItem key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-3">
          <Select value={filterEquipment} onValueChange={setFilterEquipment}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Equipment" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Equipment</SelectItem>
              {equipmentOptions.map(eq => <SelectItem key={eq} value={eq}>{eq}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
            <SelectTrigger className="w-[160px]">
              <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc">Name A→Z</SelectItem>
              <SelectItem value="name-desc">Name Z→A</SelectItem>
              <SelectItem value="muscle_group">Muscle Group</SelectItem>
              <SelectItem value="equipment">Equipment</SelectItem>
              <SelectItem value="difficulty">Difficulty</SelectItem>
            </SelectContent>
          </Select>
          <Select value={groupBy} onValueChange={(v: any) => { setGroupBy(v); setCollapsedGroups(new Set()); }}>
            <SelectTrigger className="w-[160px]">
              <Layers className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Grouping</SelectItem>
              <SelectItem value="equipment">Group by Equipment</SelectItem>
              <SelectItem value="muscle_group">Group by Muscle</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Dumbbell className="h-10 w-10 mx-auto mb-3 opacity-30" />
            {exercises.length === 0 ? (
              <div className="space-y-3">
                <p className="font-medium">Your exercise library is empty</p>
                <p className="text-sm">Load our curated library of {DEFAULT_EXERCISES.length} exercises to get started instantly.</p>
                <Button
                  variant="outline"
                  onClick={() => seedExercises.mutate()}
                  disabled={seedExercises.isPending}
                  className="border-primary text-primary"
                >
                  {seedExercises.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Loading exercises...</>
                  ) : (
                    <><Download className="h-4 w-4 mr-2" />Load {DEFAULT_EXERCISES.length} Default Exercises</>
                  )}
                </Button>
              </div>
            ) : (
              <p>No exercises match your filters. Try adjusting them.</p>
            )}
          </CardContent>
        </Card>
      ) : grouped ? (
        <div className="space-y-4">
          {grouped.map(([groupName, items]) => {
            const isCollapsed = collapsedGroups.has(groupName);
            return (
              <div key={groupName}>
                <button
                  onClick={() => toggleGroup(groupName)}
                  className="flex items-center gap-2 w-full text-left py-2 px-1 hover:bg-muted/50 rounded-md transition-colors"
                >
                  {isCollapsed ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
                  <span className="font-semibold text-sm">{groupBy === 'equipment' ? '🏋️' : '💪'} {groupName}</span>
                  <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                </button>
                {!isCollapsed && (
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 mt-2">
                    {items.map((ex: any) => renderExerciseCard(ex))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((ex: any) => renderExerciseCard(ex))}
        </div>
      )}
    </div>
  );

  function renderExerciseCard(ex: any) {
    const isExpanded = expandedId === ex.id;
    return (
      <Card key={ex.id} className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold mb-1">{ex.name}</h3>
              <div className="flex flex-wrap gap-1 mb-2">
                <Badge variant="secondary" className="text-xs">{ex.category}</Badge>
                {ex.muscle_group && <Badge variant="outline" className="text-xs">{ex.muscle_group}</Badge>}
                <Badge variant="outline" className="text-xs">{ex.difficulty}</Badge>
              </div>
            </div>
            <div className="flex items-center gap-1 ml-2">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(ex)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(ex.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          {ex.equipment && <p className="text-xs text-muted-foreground">🏋️ {ex.equipment}</p>}
          {ex.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ex.description}</p>}

          <Button variant="ghost" size="sm" className="w-full mt-2 text-xs" onClick={() => setExpandedId(isExpanded ? null : ex.id)}>
            {isExpanded ? <><ChevronUp className="h-3 w-3 mr-1" />Less</> : <><ChevronDown className="h-3 w-3 mr-1" />Details</>}
          </Button>

          {isExpanded && (
            <div className="mt-3 space-y-3 border-t pt-3">
              {ex.instructions && (
                <div>
                  <p className="text-xs font-medium flex items-center gap-1 mb-1"><BookOpen className="h-3 w-3" />Instructions</p>
                  <p className="text-xs text-muted-foreground whitespace-pre-line">{ex.instructions}</p>
                </div>
              )}
              {ex.common_mistakes && (
                <div>
                  <p className="text-xs font-medium flex items-center gap-1 mb-1 text-amber-600"><AlertTriangle className="h-3 w-3" />Common Mistakes</p>
                  <p className="text-xs text-muted-foreground whitespace-pre-line">{ex.common_mistakes}</p>
                </div>
              )}
              {ex.alternatives && (
                <div>
                  <p className="text-xs font-medium mb-1">🔄 Alternatives</p>
                  <p className="text-xs text-muted-foreground">{ex.alternatives}</p>
                </div>
              )}
              {ex.video_url && (
                <a href={ex.video_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1"><Video className="h-3 w-3" />Watch Demo Video</a>
              )}
              {ex.image_url && (
                <img src={ex.image_url} alt={ex.name} className="rounded-lg max-h-40 object-cover w-full" />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
}
