import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Plus, Loader2, UserPlus, MessageSquare, Search } from 'lucide-react';
import { useShopId } from '@/hooks/useShopId';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function PersonalTrainerCommunity() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [memberDialog, setMemberDialog] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', description: '', group_type: 'general', max_members: 50 });

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['pt-groups', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data } = await (supabase as any).from('pt_community_groups')
        .select('*, pt_group_members(count)').eq('shop_id', shopId).eq('is_active', true).order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!shopId,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['pt-community-clients', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data } = await (supabase as any).from('pt_clients').select('id, first_name, last_name').eq('shop_id', shopId).eq('membership_status', 'active');
      return data || [];
    },
    enabled: !!shopId,
  });

  const { data: groupMembers = [] } = useQuery({
    queryKey: ['pt-group-members', memberDialog],
    queryFn: async () => {
      if (!memberDialog) return [];
      const { data } = await (supabase as any).from('pt_group_members')
        .select('*, pt_clients(first_name, last_name)').eq('group_id', memberDialog);
      return data || [];
    },
    enabled: !!memberDialog,
  });

  const createGroup = useMutation({
    mutationFn: async () => {
      if (!shopId) throw new Error('No shop');
      const { error } = await (supabase as any).from('pt_community_groups').insert({ shop_id: shopId, ...form });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-groups'] });
      setDialogOpen(false);
      setForm({ name: '', description: '', group_type: 'general', max_members: 50 });
      toast({ title: 'Group created' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const addMember = useMutation({
    mutationFn: async (clientId: string) => {
      if (!memberDialog) return;
      const { error } = await (supabase as any).from('pt_group_members').insert({ group_id: memberDialog, client_id: clientId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-group-members'] });
      queryClient.invalidateQueries({ queryKey: ['pt-groups'] });
      toast({ title: 'Member added' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await (supabase as any).from('pt_group_members').delete().eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-group-members'] });
      queryClient.invalidateQueries({ queryKey: ['pt-groups'] });
      toast({ title: 'Member removed' });
    },
  });

  const typeColors: Record<string, string> = { general: 'bg-blue-100 text-blue-800', accountability: 'bg-green-100 text-green-800', class: 'bg-purple-100 text-purple-800', challenge: 'bg-orange-100 text-orange-800' };
  const filtered = groups.filter((g: any) => g.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6 text-orange-500" />Community Groups</h1>
          <p className="text-muted-foreground text-sm">Create groups for accountability, classes, and challenges</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button className="bg-gradient-to-r from-orange-500 to-red-600 text-white"><Plus className="h-4 w-4 mr-2" />New Group</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Community Group</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Group Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <Select value={form.group_type} onValueChange={v => setForm(f => ({ ...f, group_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="accountability">Accountability</SelectItem>
                      <SelectItem value="class">Class</SelectItem>
                      <SelectItem value="challenge">Challenge</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Max Members</Label><Input type="number" value={form.max_members} onChange={e => setForm(f => ({ ...f, max_members: parseInt(e.target.value) || 50 }))} /></div>
              </div>
              <Button onClick={() => createGroup.mutate()} disabled={!form.name || createGroup.isPending} className="w-full">
                {createGroup.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Create Group
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search groups..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No community groups yet. Create one to get started!</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((g: any) => (
            <Card key={g.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{g.name}</CardTitle>
                  <Badge className={typeColors[g.group_type] || typeColors.general}>{g.group_type}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-2">{g.description || 'No description'}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1"><Users className="h-4 w-4" />{g.pt_group_members?.[0]?.count || 0} / {g.max_members}</span>
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={() => setMemberDialog(g.id)}>
                  <UserPlus className="h-4 w-4 mr-2" />Manage Members
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Member Management Dialog */}
      <Dialog open={!!memberDialog} onOpenChange={() => setMemberDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Group Members</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {groupMembers.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No members yet</p> : groupMembers.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between p-2 rounded border">
                  <span className="text-sm font-medium">{m.pt_clients?.first_name} {m.pt_clients?.last_name}</span>
                  <Button variant="ghost" size="sm" className="text-destructive h-7" onClick={() => removeMember.mutate(m.id)}>Remove</Button>
                </div>
              ))}
            </div>
            <div>
              <Label className="text-sm font-medium">Add Member</Label>
              <div className="grid grid-cols-2 gap-2 mt-2 max-h-36 overflow-y-auto">
                {clients
                  .filter((c: any) => !groupMembers.some((m: any) => m.client_id === c.id))
                  .map((c: any) => (
                    <Button key={c.id} variant="outline" size="sm" onClick={() => addMember.mutate(c.id)} className="justify-start text-xs">
                      <UserPlus className="h-3 w-3 mr-1" />{c.first_name} {c.last_name}
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
