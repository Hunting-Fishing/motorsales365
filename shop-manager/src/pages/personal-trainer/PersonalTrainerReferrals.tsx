import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Gift, Plus, Loader2, Users, CheckCircle2, Clock, X, TrendingUp } from 'lucide-react';
import { useShopId } from '@/hooks/useShopId';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function PersonalTrainerReferrals() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ referrer_client_id: '', referred_name: '', referred_email: '', referred_phone: '', reward_type: 'free_session', reward_value: 1 });

  const { data: referrals = [], isLoading } = useQuery({
    queryKey: ['pt-referrals', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data } = await (supabase as any).from('pt_referrals')
        .select('*, pt_clients!pt_referrals_referrer_client_id_fkey(first_name, last_name)')
        .eq('shop_id', shopId).order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!shopId,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['pt-referral-clients', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data } = await (supabase as any).from('pt_clients').select('id, first_name, last_name').eq('shop_id', shopId).eq('membership_status', 'active');
      return data || [];
    },
    enabled: !!shopId,
  });

  const createReferral = useMutation({
    mutationFn: async () => {
      if (!shopId) throw new Error('No shop');
      const { error } = await (supabase as any).from('pt_referrals').insert({ shop_id: shopId, ...form });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-referrals'] });
      setDialogOpen(false);
      setForm({ referrer_client_id: '', referred_name: '', referred_email: '', referred_phone: '', reward_type: 'free_session', reward_value: 1 });
      toast({ title: 'Referral recorded' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const update: any = { status, updated_at: new Date().toISOString() };
      if (status === 'converted') update.converted_at = new Date().toISOString();
      const { error } = await (supabase as any).from('pt_referrals').update(update).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-referrals'] });
      toast({ title: 'Status updated' });
    },
  });

  const claimReward = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('pt_referrals').update({ reward_claimed: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-referrals'] });
      toast({ title: 'Reward claimed' });
    },
  });

  const stats = {
    total: referrals.length,
    converted: referrals.filter((r: any) => r.status === 'converted').length,
    pending: referrals.filter((r: any) => r.status === 'pending').length,
    rate: referrals.length ? Math.round((referrals.filter((r: any) => r.status === 'converted').length / referrals.length) * 100) : 0,
  };

  const statusColors: Record<string, string> = { pending: 'bg-yellow-100 text-yellow-800', contacted: 'bg-blue-100 text-blue-800', converted: 'bg-green-100 text-green-800', expired: 'bg-gray-100 text-gray-700' };
  const statusIcons: Record<string, React.ReactNode> = { pending: <Clock className="h-3 w-3" />, contacted: <Users className="h-3 w-3" />, converted: <CheckCircle2 className="h-3 w-3" />, expired: <X className="h-3 w-3" /> };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Gift className="h-6 w-6 text-pink-500" />Referral Program</h1>
          <p className="text-muted-foreground text-sm">Track client referrals and reward loyalty</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button className="bg-gradient-to-r from-pink-500 to-rose-600 text-white"><Plus className="h-4 w-4 mr-2" />New Referral</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Record Referral</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Referring Client</Label>
                <Select value={form.referrer_client_id} onValueChange={v => setForm(f => ({ ...f, referrer_client_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>{clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Referred Person Name</Label><Input value={form.referred_name} onChange={e => setForm(f => ({ ...f, referred_name: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Email</Label><Input type="email" value={form.referred_email} onChange={e => setForm(f => ({ ...f, referred_email: e.target.value }))} /></div>
                <div><Label>Phone</Label><Input value={form.referred_phone} onChange={e => setForm(f => ({ ...f, referred_phone: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Reward Type</Label>
                  <Select value={form.reward_type} onValueChange={v => setForm(f => ({ ...f, reward_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free_session">Free Session</SelectItem>
                      <SelectItem value="discount">Discount (%)</SelectItem>
                      <SelectItem value="points">Points</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Reward Value</Label><Input type="number" value={form.reward_value} onChange={e => setForm(f => ({ ...f, reward_value: parseFloat(e.target.value) || 0 }))} /></div>
              </div>
              <Button onClick={() => createReferral.mutate()} disabled={!form.referrer_client_id || !form.referred_name || createReferral.isPending} className="w-full">
                {createReferral.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Record Referral
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total Referrals</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-600">{stats.converted}</p><p className="text-xs text-muted-foreground">Converted</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-yellow-600">{stats.pending}</p><p className="text-xs text-muted-foreground">Pending</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-blue-600">{stats.rate}%</p><p className="text-xs text-muted-foreground">Conversion Rate</p></CardContent></Card>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-pink-500" /></div>
      ) : referrals.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No referrals yet. Start your referral program!</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {referrals.map((r: any) => (
            <Card key={r.id}>
              <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{r.referred_name}</span>
                    <Badge className={statusColors[r.status] || statusColors.pending}>{statusIcons[r.status]} {r.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Referred by {r.pt_clients?.first_name} {r.pt_clients?.last_name} • {format(new Date(r.created_at), 'MMM d, yyyy')}
                  </p>
                  <p className="text-xs">Reward: {r.reward_type === 'free_session' ? `${r.reward_value} free session(s)` : r.reward_type === 'discount' ? `${r.reward_value}% discount` : `${r.reward_value} points`}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {r.status === 'pending' && <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: r.id, status: 'contacted' })}>Mark Contacted</Button>}
                  {(r.status === 'pending' || r.status === 'contacted') && <Button size="sm" className="bg-green-600 text-white" onClick={() => updateStatus.mutate({ id: r.id, status: 'converted' })}>Convert</Button>}
                  {r.status === 'converted' && !r.reward_claimed && <Button size="sm" variant="outline" className="border-pink-300 text-pink-600" onClick={() => claimReward.mutate(r.id)}><Gift className="h-3 w-3 mr-1" />Claim Reward</Button>}
                  {r.reward_claimed && <Badge className="bg-pink-100 text-pink-700">Reward Claimed</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
