import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Trophy, Plus, Loader2, Users, Target, Calendar, Flame } from 'lucide-react';
import { useShopId } from '@/hooks/useShopId';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, isPast, isFuture, isWithinInterval } from 'date-fns';

export default function PersonalTrainerChallenges() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [participantDialog, setParticipantDialog] = useState<any>(null);
  const [form, setForm] = useState({
    title: '', description: '', challenge_type: 'workout', goal_value: 10, goal_unit: 'sessions',
    start_date: new Date().toISOString().split('T')[0], end_date: '', prize_description: '',
  });

  const { data: challenges = [], isLoading } = useQuery({
    queryKey: ['pt-challenges', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data } = await (supabase as any).from('pt_challenges')
        .select('*, pt_challenge_participants(count)').eq('shop_id', shopId).order('start_date', { ascending: false });
      return data || [];
    },
    enabled: !!shopId,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['pt-challenge-clients', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data } = await (supabase as any).from('pt_clients').select('id, first_name, last_name').eq('shop_id', shopId).eq('membership_status', 'active');
      return data || [];
    },
    enabled: !!shopId,
  });

  const { data: participants = [] } = useQuery({
    queryKey: ['pt-challenge-participants', participantDialog?.id],
    queryFn: async () => {
      if (!participantDialog?.id) return [];
      const { data } = await (supabase as any).from('pt_challenge_participants')
        .select('*, pt_clients(first_name, last_name)').eq('challenge_id', participantDialog.id).order('current_progress', { ascending: false });
      return data || [];
    },
    enabled: !!participantDialog?.id,
  });

  const createChallenge = useMutation({
    mutationFn: async () => {
      if (!shopId) throw new Error('No shop');
      const { error } = await (supabase as any).from('pt_challenges').insert({ shop_id: shopId, ...form });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-challenges'] });
      setDialogOpen(false);
      toast({ title: 'Challenge created' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const addParticipant = useMutation({
    mutationFn: async (clientId: string) => {
      if (!participantDialog?.id) return;
      const { error } = await (supabase as any).from('pt_challenge_participants').insert({ challenge_id: participantDialog.id, client_id: clientId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-challenge-participants'] });
      queryClient.invalidateQueries({ queryKey: ['pt-challenges'] });
      toast({ title: 'Participant added' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateProgress = useMutation({
    mutationFn: async ({ participantId, progress }: { participantId: string; progress: number }) => {
      const goalVal = participantDialog?.goal_value || 0;
      const completed = progress >= goalVal;
      const { error } = await (supabase as any).from('pt_challenge_participants')
        .update({ current_progress: progress, completed, completed_at: completed ? new Date().toISOString() : null })
        .eq('id', participantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-challenge-participants'] });
      toast({ title: 'Progress updated' });
    },
  });

  const getStatus = (c: any) => {
    const now = new Date();
    const start = new Date(c.start_date);
    const end = new Date(c.end_date);
    if (isPast(end)) return { label: 'Ended', color: 'bg-gray-100 text-gray-700' };
    if (isFuture(start)) return { label: 'Upcoming', color: 'bg-blue-100 text-blue-700' };
    return { label: 'Active', color: 'bg-green-100 text-green-700' };
  };

  const typeIcons: Record<string, React.ReactNode> = {
    workout: <Flame className="h-5 w-5 text-orange-500" />,
    steps: <Target className="h-5 w-5 text-blue-500" />,
    weight_loss: <Target className="h-5 w-5 text-green-500" />,
    consistency: <Calendar className="h-5 w-5 text-violet-500" />,
    custom: <Trophy className="h-5 w-5 text-amber-500" />,
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Trophy className="h-6 w-6 text-amber-500" />Fitness Challenges</h1>
          <p className="text-muted-foreground text-sm">Create and manage client challenges with leaderboards</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button className="bg-gradient-to-r from-amber-500 to-orange-600 text-white"><Plus className="h-4 w-4 mr-2" />New Challenge</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Challenge</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="30-Day Squat Challenge" /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <Select value={form.challenge_type} onValueChange={v => setForm(f => ({ ...f, challenge_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="workout">Workout Count</SelectItem>
                      <SelectItem value="steps">Steps</SelectItem>
                      <SelectItem value="weight_loss">Weight Loss</SelectItem>
                      <SelectItem value="consistency">Consistency</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Goal</Label><Input type="number" value={form.goal_value} onChange={e => setForm(f => ({ ...f, goal_value: parseFloat(e.target.value) || 0 }))} /></div>
                  <div><Label>Unit</Label><Input value={form.goal_unit} onChange={e => setForm(f => ({ ...f, goal_unit: e.target.value }))} placeholder="sessions" /></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
                <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
              </div>
              <div><Label>Prize Description</Label><Input value={form.prize_description} onChange={e => setForm(f => ({ ...f, prize_description: e.target.value }))} placeholder="Free month of training" /></div>
              <Button onClick={() => createChallenge.mutate()} disabled={!form.title || !form.end_date || createChallenge.isPending} className="w-full">
                {createChallenge.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Create Challenge
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-amber-500" /></div>
      ) : challenges.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No challenges created yet.</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {challenges.map((c: any) => {
            const status = getStatus(c);
            return (
              <Card key={c.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setParticipantDialog(c)}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">{typeIcons[c.challenge_type] || typeIcons.custom}<CardTitle className="text-base">{c.title}</CardTitle></div>
                    <Badge className={status.color}>{status.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">{c.description || 'No description'}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{format(new Date(c.start_date), 'MMM d')} — {format(new Date(c.end_date), 'MMM d')}</span>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{c.pt_challenge_participants?.[0]?.count || 0}</span>
                  </div>
                  <div className="text-sm"><strong>Goal:</strong> {c.goal_value} {c.goal_unit}</div>
                  {c.prize_description && <div className="text-xs text-amber-600"><Trophy className="h-3 w-3 inline mr-1" />{c.prize_description}</div>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Participant/Leaderboard Dialog */}
      <Dialog open={!!participantDialog} onOpenChange={() => setParticipantDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{participantDialog?.title} — Leaderboard</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {participants.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No participants yet</p> : participants.map((p: any, i: number) => (
                <div key={p.id} className="flex items-center gap-3 p-2 rounded border">
                  <span className="font-bold text-lg w-8 text-center">{i + 1}</span>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{p.pt_clients?.first_name} {p.pt_clients?.last_name}</span>
                      <span className="text-xs">{p.current_progress}/{participantDialog?.goal_value} {participantDialog?.goal_unit}</span>
                    </div>
                    <Progress value={Math.min((p.current_progress / (participantDialog?.goal_value || 1)) * 100, 100)} className="h-2" />
                  </div>
                  {p.completed && <Badge className="bg-green-100 text-green-800">✓</Badge>}
                  <Input type="number" className="w-20 h-8 text-xs" placeholder="Update" onKeyDown={e => {
                    if (e.key === 'Enter') updateProgress.mutate({ participantId: p.id, progress: parseFloat((e.target as HTMLInputElement).value) || 0 });
                  }} />
                </div>
              ))}
            </div>
            <div>
              <Label className="text-sm font-medium">Add Participants</Label>
              <div className="grid grid-cols-2 gap-2 mt-2 max-h-36 overflow-y-auto">
                {clients
                  .filter((c: any) => !participants.some((p: any) => p.client_id === c.id))
                  .map((c: any) => (
                    <Button key={c.id} variant="outline" size="sm" onClick={() => addParticipant.mutate(c.id)} className="justify-start text-xs">
                      <Plus className="h-3 w-3 mr-1" />{c.first_name} {c.last_name}
                    </Button>
                  ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
