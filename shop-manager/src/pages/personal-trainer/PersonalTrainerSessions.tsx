import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Plus, Dumbbell, Clock } from 'lucide-react';
import { useShopId } from '@/hooks/useShopId';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function PersonalTrainerSessions() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ client_id: '', session_date: '', duration_minutes: 60, session_type: 'personal_training', location: '', notes: '' });

  const { data: clients = [] } = useQuery({
    queryKey: ['pt-clients-list', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data } = await (supabase as any).from('pt_clients').select('id, first_name, last_name').eq('shop_id', shopId).eq('membership_status', 'active').order('first_name');
      return data || [];
    },
    enabled: !!shopId,
  });

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['pt-sessions', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data } = await (supabase as any).from('pt_sessions')
        .select('*, pt_clients(first_name, last_name)')
        .eq('shop_id', shopId)
        .order('session_date', { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!shopId,
  });

  const bookSession = useMutation({
    mutationFn: async () => {
      if (!shopId) throw new Error('No shop');
      const { error } = await (supabase as any).from('pt_sessions').insert({ ...form, shop_id: shopId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-sessions'] });
      toast({ title: 'Session booked' });
      setDialogOpen(false);
      setForm({ client_id: '', session_date: '', duration_minutes: 60, session_type: 'personal_training', location: '', notes: '' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase as any).from('pt_sessions').update({ status, attendance: status === 'completed' ? 'attended' : status === 'canceled' ? 'no_show' : 'pending' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-sessions'] });
      toast({ title: 'Session updated' });
    },
  });

  const statusColor = (s: string) => {
    switch (s) {
      case 'completed': return 'default';
      case 'canceled': return 'destructive';
      case 'in_progress': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Sessions</h1>
          <p className="text-muted-foreground text-sm">Schedule and track training sessions</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-orange-500 to-red-600 text-white"><Plus className="h-4 w-4 mr-2" />Book Session</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Book Session</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Client *</Label>
                <Select value={form.client_id} onValueChange={v => setForm(f => ({ ...f, client_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>{clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Date & Time *</Label><Input type="datetime-local" value={form.session_date} onChange={e => setForm(f => ({ ...f, session_date: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Duration (min)</Label><Input type="number" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: parseInt(e.target.value) || 60 }))} /></div>
                <div>
                  <Label>Type</Label>
                  <Select value={form.session_type} onValueChange={v => setForm(f => ({ ...f, session_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personal_training">Personal Training</SelectItem>
                      <SelectItem value="group_class">Group Class</SelectItem>
                      <SelectItem value="assessment">Assessment</SelectItem>
                      <SelectItem value="consultation">Consultation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Location</Label><Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Main gym floor" /></div>
              <Button className="w-full" disabled={!form.client_id || !form.session_date || bookSession.isPending} onClick={() => bookSession.mutate()}>
                {bookSession.isPending ? 'Booking...' : 'Book Session'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" /></div>
      ) : sessions.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-12 text-center text-muted-foreground"><Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" /><p>No sessions yet. Book your first session!</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((s: any) => (
            <Card key={s.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-red-500">
                    <Dumbbell className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">{s.pt_clients?.first_name} {s.pt_clients?.last_name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(s.session_date), 'MMM d, yyyy h:mm a')}
                      <Clock className="h-3 w-3 ml-1" />
                      {s.duration_minutes}min
                      <span className="capitalize">· {s.session_type?.replace('_', ' ')}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={statusColor(s.status) as any}>{s.status}</Badge>
                  {s.status === 'scheduled' && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: s.id, status: 'completed' })}>Complete</Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => updateStatus.mutate({ id: s.id, status: 'canceled' })}>Cancel</Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
