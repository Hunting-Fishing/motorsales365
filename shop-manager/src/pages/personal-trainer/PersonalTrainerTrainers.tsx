import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Users, Plus, Search, Mail, Phone, Award, DollarSign, Loader2 } from 'lucide-react';
import { useShopId } from '@/hooks/useShopId';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function PersonalTrainerTrainers() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', bio: '',
    specializations: '', hourly_rate: '', hire_date: '',
  });

  const { data: trainers = [], isLoading } = useQuery({
    queryKey: ['pt-trainers', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await (supabase as any).from('pt_trainers').select('*').eq('shop_id', shopId).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });

  const addTrainer = useMutation({
    mutationFn: async () => {
      if (!shopId) throw new Error('No shop');
      const payload = {
        shop_id: shopId,
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email || null,
        phone: form.phone || null,
        bio: form.bio || null,
        specializations: form.specializations ? form.specializations.split(',').map(s => s.trim()) : [],
        hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : null,
        hire_date: form.hire_date || null,
      };
      const { error } = await (supabase as any).from('pt_trainers').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-trainers'] });
      toast({ title: 'Trainer added successfully' });
      setDialogOpen(false);
      setForm({ first_name: '', last_name: '', email: '', phone: '', bio: '', specializations: '', hourly_rate: '', hire_date: '' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any).from('pt_trainers').update({ is_active: !is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pt-trainers'] }),
  });

  const filtered = trainers.filter((t: any) =>
    `${t.first_name} ${t.last_name} ${t.email}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Trainers</h1>
          <p className="text-muted-foreground text-sm">Manage your personal trainers and coaches</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-orange-500 to-red-600 text-white">
              <Plus className="h-4 w-4 mr-2" />Add Trainer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add New Trainer</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>First Name *</Label><Input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} /></div>
                <div><Label>Last Name *</Label><Input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Hourly Rate ($)</Label><Input type="number" value={form.hourly_rate} onChange={e => setForm(f => ({ ...f, hourly_rate: e.target.value }))} /></div>
                <div><Label>Hire Date</Label><Input type="date" value={form.hire_date} onChange={e => setForm(f => ({ ...f, hire_date: e.target.value }))} /></div>
              </div>
              <div><Label>Specializations (comma-separated)</Label><Input value={form.specializations} onChange={e => setForm(f => ({ ...f, specializations: e.target.value }))} placeholder="Strength, HIIT, Yoga..." /></div>
              <div><Label>Bio</Label><Textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="Short trainer biography..." /></div>
              <Button className="w-full" disabled={!form.first_name || !form.last_name || addTrainer.isPending} onClick={() => addTrainer.mutate()}>
                {addTrainer.isPending ? 'Adding...' : 'Add Trainer'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search trainers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {isLoading ? (
        <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-12 text-center text-muted-foreground"><Users className="h-10 w-10 mx-auto mb-3 opacity-30" /><p>No trainers yet. Add your first trainer!</p></CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((trainer: any) => (
            <Card key={trainer.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{trainer.first_name} {trainer.last_name}</h3>
                    {trainer.specializations?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {trainer.specializations.slice(0, 3).map((s: string) => (
                          <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <Badge
                    variant={trainer.is_active ? 'default' : 'destructive'}
                    className="cursor-pointer"
                    onClick={() => toggleActive.mutate({ id: trainer.id, is_active: trainer.is_active })}
                  >
                    {trainer.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                {trainer.email && <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />{trainer.email}</p>}
                {trainer.phone && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Phone className="h-3 w-3" />{trainer.phone}</p>}
                {trainer.hourly_rate && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><DollarSign className="h-3 w-3" />${trainer.hourly_rate}/hr</p>}
                {trainer.bio && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{trainer.bio}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
