import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Plus, Trash2, GripVertical, Loader2, Dumbbell } from 'lucide-react';
import { useShopId } from '@/hooks/useShopId';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function PersonalTrainerWorkoutBuilder() {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const { shopId } = useShopId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dayDialogOpen, setDayDialogOpen] = useState(false);
  const [exerciseDialogOpen, setExerciseDialogOpen] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [dayForm, setDayForm] = useState({ name: '', focus_area: '', notes: '' });
  const [exForm, setExForm] = useState({ exercise_id: '', sets: 3, reps: '10', rest_seconds: 60, tempo: '', notes: '' });

  // Load program
  const { data: program, isLoading: progLoading } = useQuery({
    queryKey: ['pt-program', programId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('pt_workout_programs').select('*').eq('id', programId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!programId,
  });

  // Load workout days
  const { data: days = [], isLoading: daysLoading } = useQuery({
    queryKey: ['pt-workout-days', programId, shopId],
    queryFn: async () => {
      if (!shopId || !programId) return [];
      const { data } = await (supabase as any).from('pt_workout_days')
        .select('*').eq('program_id', programId).eq('shop_id', shopId).order('sort_order').order('day_number');
      return data || [];
    },
    enabled: !!shopId && !!programId,
  });

  // Load exercises for each day
  const { data: dayExercises = {} } = useQuery({
    queryKey: ['pt-day-exercises', programId, shopId, days.length],
    queryFn: async () => {
      if (!shopId || days.length === 0) return {};
      const dayIds = days.map((d: any) => d.id);
      const { data } = await (supabase as any).from('pt_workout_day_exercises')
        .select('*, pt_exercises(name, muscle_group, equipment)')
        .eq('shop_id', shopId)
        .in('workout_day_id', dayIds)
        .order('sort_order');
      const grouped: Record<string, any[]> = {};
      (data || []).forEach((e: any) => {
        if (!grouped[e.workout_day_id]) grouped[e.workout_day_id] = [];
        grouped[e.workout_day_id].push(e);
      });
      return grouped;
    },
    enabled: !!shopId && days.length > 0,
  });

  // Load exercise library for selection
  const { data: exerciseLibrary = [] } = useQuery({
    queryKey: ['pt-exercises-lib', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data } = await (supabase as any).from('pt_exercises').select('id, name, muscle_group, equipment').eq('shop_id', shopId).order('name');
      return data || [];
    },
    enabled: !!shopId,
  });

  // Add day
  const addDay = useMutation({
    mutationFn: async () => {
      if (!shopId || !programId) throw new Error('Missing data');
      const nextNum = days.length + 1;
      const { error } = await (supabase as any).from('pt_workout_days').insert({
        program_id: programId, shop_id: shopId, day_number: nextNum,
        name: dayForm.name || `Day ${nextNum}`, focus_area: dayForm.focus_area || null,
        notes: dayForm.notes || null, sort_order: nextNum,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-workout-days'] });
      toast({ title: 'Day added' });
      setDayDialogOpen(false);
      setDayForm({ name: '', focus_area: '', notes: '' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Delete day
  const deleteDay = useMutation({
    mutationFn: async (dayId: string) => {
      const { error } = await (supabase as any).from('pt_workout_days').delete().eq('id', dayId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pt-workout-days'] }),
  });

  // Add exercise to day
  const addExercise = useMutation({
    mutationFn: async () => {
      if (!shopId || !selectedDayId || !exForm.exercise_id) throw new Error('Missing data');
      const existing = dayExercises[selectedDayId] || [];
      const { error } = await (supabase as any).from('pt_workout_day_exercises').insert({
        workout_day_id: selectedDayId, exercise_id: exForm.exercise_id, shop_id: shopId,
        sets: exForm.sets, reps: exForm.reps, rest_seconds: exForm.rest_seconds,
        tempo: exForm.tempo || null, notes: exForm.notes || null,
        sort_order: existing.length + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-day-exercises'] });
      toast({ title: 'Exercise added' });
      setExerciseDialogOpen(false);
      setExForm({ exercise_id: '', sets: 3, reps: '10', rest_seconds: 60, tempo: '', notes: '' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Remove exercise from day
  const removeExercise = useMutation({
    mutationFn: async (exId: string) => {
      const { error } = await (supabase as any).from('pt_workout_day_exercises').delete().eq('id', exId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pt-day-exercises'] }),
  });

  if (progLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!program) return <div className="p-6 text-center"><p className="text-muted-foreground">Program not found</p></div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/personal-trainer/programs')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{program.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary">{program.difficulty}</Badge>
            <span className="text-sm text-muted-foreground">{program.duration_weeks} weeks</span>
            {program.goal && <span className="text-sm text-muted-foreground">· {program.goal}</span>}
          </div>
        </div>
        <Dialog open={dayDialogOpen} onOpenChange={setDayDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-violet-500 to-purple-600 text-white">
              <Plus className="h-4 w-4 mr-2" />Add Day
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Workout Day</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Day Name *</Label><Input value={dayForm.name} onChange={e => setDayForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Chest & Triceps" /></div>
              <div><Label>Focus Area</Label><Input value={dayForm.focus_area} onChange={e => setDayForm(f => ({ ...f, focus_area: e.target.value }))} placeholder="e.g. Upper Body Push" /></div>
              <div><Label>Notes</Label><Textarea value={dayForm.notes} onChange={e => setDayForm(f => ({ ...f, notes: e.target.value }))} /></div>
              <Button className="w-full" disabled={addDay.isPending} onClick={() => addDay.mutate()}>
                {addDay.isPending ? 'Adding...' : 'Add Day'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {program.description && <p className="text-sm text-muted-foreground">{program.description}</p>}

      {/* Workout Days */}
      {daysLoading ? (
        <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
      ) : days.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Dumbbell className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No workout days yet. Add your first day to start building!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {days.map((day: any) => {
            const exercises = dayExercises[day.id] || [];
            return (
              <Card key={day.id} className="border-0 shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                        {day.day_number}
                      </div>
                      <div>
                        <CardTitle className="text-base">{day.name}</CardTitle>
                        {day.focus_area && <p className="text-xs text-muted-foreground">{day.focus_area}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setSelectedDayId(day.id); setExerciseDialogOpen(true); }}
                      >
                        <Plus className="h-3 w-3 mr-1" />Exercise
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteDay.mutate(day.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {exercises.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No exercises added yet</p>
                  ) : (
                    <div className="space-y-2">
                      {exercises.map((ex: any, idx: number) => (
                        <div key={ex.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                          <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs font-bold text-muted-foreground w-6">{idx + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{ex.pt_exercises?.name}</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">{ex.sets} × {ex.reps}</Badge>
                              {ex.rest_seconds && <Badge variant="outline" className="text-xs">{ex.rest_seconds}s rest</Badge>}
                              {ex.pt_exercises?.muscle_group && <Badge variant="outline" className="text-xs">{ex.pt_exercises.muscle_group}</Badge>}
                              {ex.tempo && <Badge variant="outline" className="text-xs">Tempo: {ex.tempo}</Badge>}
                            </div>
                          </div>
                          <Button size="icon" variant="ghost" className="text-destructive flex-shrink-0" onClick={() => removeExercise.mutate(ex.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Exercise Dialog */}
      <Dialog open={exerciseDialogOpen} onOpenChange={setExerciseDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Exercise to Day</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Exercise *</Label>
              <Select value={exForm.exercise_id} onValueChange={v => setExForm(f => ({ ...f, exercise_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select exercise" /></SelectTrigger>
                <SelectContent>
                  {exerciseLibrary.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>{e.name} {e.muscle_group ? `(${e.muscle_group})` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Sets</Label><Input type="number" value={exForm.sets} onChange={e => setExForm(f => ({ ...f, sets: parseInt(e.target.value) || 3 }))} /></div>
              <div><Label>Reps</Label><Input value={exForm.reps} onChange={e => setExForm(f => ({ ...f, reps: e.target.value }))} placeholder="e.g. 10 or 8-12" /></div>
              <div><Label>Rest (sec)</Label><Input type="number" value={exForm.rest_seconds} onChange={e => setExForm(f => ({ ...f, rest_seconds: parseInt(e.target.value) || 60 }))} /></div>
            </div>
            <div><Label>Tempo (optional)</Label><Input value={exForm.tempo} onChange={e => setExForm(f => ({ ...f, tempo: e.target.value }))} placeholder="e.g. 3-1-2-0" /></div>
            <div><Label>Notes</Label><Textarea value={exForm.notes} onChange={e => setExForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <Button className="w-full" disabled={!exForm.exercise_id || addExercise.isPending} onClick={() => addExercise.mutate()}>
              {addExercise.isPending ? 'Adding...' : 'Add Exercise'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
