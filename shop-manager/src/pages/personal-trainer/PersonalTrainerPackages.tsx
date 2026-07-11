import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Package, Plus, DollarSign } from 'lucide-react';
import { useShopId } from '@/hooks/useShopId';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function PersonalTrainerPackages() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', sessions_included: 10, price: '', duration_days: 30, package_type: 'session_pack' });

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ['pt-packages', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data } = await (supabase as any).from('pt_packages').select('*').eq('shop_id', shopId).order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!shopId,
  });

  const addPackage = useMutation({
    mutationFn: async () => {
      if (!shopId) throw new Error('No shop');
      const { error } = await (supabase as any).from('pt_packages').insert({
        ...form, price: parseFloat(form.price) || 0, shop_id: shopId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-packages'] });
      toast({ title: 'Package created' });
      setDialogOpen(false);
      setForm({ name: '', description: '', sessions_included: 10, price: '', duration_days: 30, package_type: 'session_pack' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Packages</h1>
          <p className="text-muted-foreground text-sm">Session packs and membership packages</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-amber-500 to-orange-600 text-white"><Plus className="h-4 w-4 mr-2" />New Package</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Package</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Package Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. 10 Session Pack" /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Price ($)</Label><Input type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0.00" /></div>
                <div>
                  <Label>Type</Label>
                  <Select value={form.package_type} onValueChange={v => setForm(f => ({ ...f, package_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="session_pack">Session Pack</SelectItem>
                      <SelectItem value="monthly">Monthly Membership</SelectItem>
                      <SelectItem value="annual">Annual Membership</SelectItem>
                      <SelectItem value="drop_in">Drop-in</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Sessions Included</Label><Input type="number" value={form.sessions_included} onChange={e => setForm(f => ({ ...f, sessions_included: parseInt(e.target.value) || 0 }))} /></div>
                <div><Label>Valid for (days)</Label><Input type="number" value={form.duration_days} onChange={e => setForm(f => ({ ...f, duration_days: parseInt(e.target.value) || 30 }))} /></div>
              </div>
              <Button className="w-full" disabled={!form.name || !form.price || addPackage.isPending} onClick={() => addPackage.mutate()}>
                {addPackage.isPending ? 'Creating...' : 'Create Package'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" /></div>
      ) : packages.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-12 text-center text-muted-foreground"><Package className="h-10 w-10 mx-auto mb-3 opacity-30" /><p>No packages yet. Create your first!</p></CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {packages.map((p: any) => (
            <Card key={p.id} className="hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold">{p.name}</h3>
                  <Badge variant={p.is_active ? 'default' : 'secondary'}>{p.is_active ? 'Active' : 'Inactive'}</Badge>
                </div>
                {p.description && <p className="text-sm text-muted-foreground mb-3">{p.description}</p>}
                <div className="flex items-center gap-1 text-2xl font-bold mb-2">
                  <DollarSign className="h-5 w-5" />{Number(p.price).toFixed(2)}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{p.sessions_included} sessions</span>
                  <span>·</span>
                  <span>{p.duration_days} days</span>
                  <span>·</span>
                  <span className="capitalize">{p.package_type?.replace('_', ' ')}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
