
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ClipboardList, Plus, Pencil, UserPlus, Loader2, Dumbbell, Clock, Calendar } from 'lucide-react';
import { useShopId } from '@/hooks/useShopId';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import ProgramCreatorDialog from '@/components/personal-trainer/ProgramCreatorDialog';

export default function PersonalTrainerPrograms() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignProgramId, setAssignProgramId] = useState<string | null>(null);
  const [assignForm, setAssignForm] = useState({ client_id: '', start_date: new Date().toISOString().split('T')[0] });

  const { data: programs = [], isLoading } = useQuery({
    queryKey: ['pt-programs', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data } = await (supabase as any).from('pt_workout_programs').select('*').eq('shop_id', shopId).eq('is_preset', false).order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!shopId,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['pt-clients-assign', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data } = await (supabase as any).from('pt_clients').select('id, first_name, last_name').eq('shop_id', shopId).eq('membership_status', 'active').order('first_name');
      return data || [];
    },
    enabled: !!shopId,
  });

  const assignProgram = useMutation({
    mutationFn: async () => {
      if (!shopId || !assignProgramId || !assignForm.client_id) throw new Error('Missing data');
      const program = programs.find((p: any) => p.id === assignProgramId);
      const startDate = new Date(assignForm.start_date);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + (program?.duration_weeks || 4) * 7);
      const { error } = await (supabase as any).from('pt_client_programs').insert({
        client_id: assignForm.client_id,
        program_id: assignProgramId,
        shop_id: shopId,
        status: 'active',
        start_date: assignForm.start_date,
        end_date: endDate.toISOString().split('T')[0],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Program assigned to client' });
      setAssignDialogOpen(false);
      setAssignForm({ client_id: '', start_date: new Date().toISOString().split('T')[0] });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const difficultyColors: Record<string, string> = {
    absolute_beginner: 'bg-sky-500/10 text-sky-600',
    beginner: 'bg-emerald-500/10 text-emerald-600',
    intermediate: 'bg-amber-500/10 text-amber-600',
    advanced: 'bg-orange-500/10 text-orange-600',
    elite: 'bg-red-500/10 text-red-600',
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Workout Programs</h1>
          <p className="text-muted-foreground text-sm">Create, build, and assign training programs</p>
        </div>
        <Button
          className="bg-gradient-to-r from-violet-500 to-purple-600 text-white"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />New Program
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>
      ) : programs.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-12 text-center text-muted-foreground"><ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-30" /><p>No programs yet. Create your first workout program!</p></CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {programs.map((p: any) => (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold">{p.name}</h3>
                  <Badge variant="secondary" className={difficultyColors[p.difficulty] || ''}>
                    {p.difficulty?.replace('_', ' ')}
                  </Badge>
                </div>
                {p.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{p.description}</p>}
                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{p.duration_weeks}w</span>
                  {p.days_per_week && <span className="flex items-center gap-1"><Dumbbell className="h-3 w-3" />{p.days_per_week}d/wk</span>}
                  {p.session_duration_minutes && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{p.session_duration_minutes}min</span>}
                  {p.goal && <><span>·</span><span>{p.goal}</span></>}
                </div>
                {(p.workout_style || []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {p.workout_style.map((s: string) => (
                      <Badge key={s} variant="outline" className="text-[10px] px-1.5 py-0">{s.replace(/_/g, ' ')}</Badge>
                    ))}
                  </div>
                )}
                {p.is_template && <Badge className="mb-3" variant="outline">Template</Badge>}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => navigate(`/personal-trainer/programs/${p.id}/builder`)}>
                    <Pencil className="h-3 w-3 mr-1" />Build
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => { setAssignProgramId(p.id); setAssignDialogOpen(true); }}>
                    <UserPlus className="h-3 w-3 mr-1" />Assign
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {shopId && <ProgramCreatorDialog open={dialogOpen} onOpenChange={setDialogOpen} shopId={shopId} />}

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Program to Client</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Client *</Label>
              <Select value={assignForm.client_id} onValueChange={v => setAssignForm(f => ({ ...f, client_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Start Date</Label><Input type="date" value={assignForm.start_date} onChange={e => setAssignForm(f => ({ ...f, start_date: e.target.value }))} /></div>
            <Button className="w-full" disabled={!assignForm.client_id || assignProgram.isPending} onClick={() => assignProgram.mutate()}>
              {assignProgram.isPending ? 'Assigning...' : 'Assign Program'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
