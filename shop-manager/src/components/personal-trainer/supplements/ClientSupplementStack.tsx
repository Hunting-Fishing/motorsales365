import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pill, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';

export function ClientSupplementStack() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ supplement_id: '', custom_name: '', dosage: '', frequency: 'daily', notes: '' });

  const { data: clients = [] } = useQuery({
    queryKey: ['pt-clients-list', shopId],
    queryFn: async () => {
      const { data } = await supabase
        .from('pt_clients')
        .select('id, first_name, last_name')
        .eq('shop_id', shopId!)
        .order('first_name');
      return data || [];
    },
    enabled: !!shopId,
  });

  const { data: supplements = [] } = useQuery({
    queryKey: ['pt-supplements-catalog'],
    queryFn: async () => {
      const { data } = await supabase.from('pt_supplements').select('id, name, category').order('name');
      return (data || []) as Array<{ id: string; name: string; category: string }>;
    },
  });

  const { data: clientSupplements = [], isLoading } = useQuery({
    queryKey: ['pt-client-supplements', selectedClient],
    queryFn: async () => {
      const { data } = await supabase
        .from('pt_client_supplements')
        .select('*, pt_supplements(name, category)')
        .eq('client_id', selectedClient)
        .order('created_at', { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!selectedClient,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('pt_client_supplements').insert({
        client_id: selectedClient,
        shop_id: shopId!,
        supplement_id: form.supplement_id || null,
        custom_name: form.custom_name || null,
        dosage: form.dosage,
        frequency: form.frequency,
        notes: form.notes,
        start_date: new Date().toISOString().split('T')[0],
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-client-supplements', selectedClient] });
      toast({ title: 'Supplement added to client stack' });
      setAddOpen(false);
      setForm({ supplement_id: '', custom_name: '', dosage: '', frequency: 'daily', notes: '' });
    },
    onError: () => toast({ title: 'Failed to add', variant: 'destructive' }),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pt_client_supplements').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-client-supplements', selectedClient] });
      toast({ title: 'Removed from stack' });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={selectedClient} onValueChange={setSelectedClient}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select a client..." />
          </SelectTrigger>
          <SelectContent>
            {clients.map((c: any) => (
              <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedClient && (
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Supplement</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Supplement to Stack</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>From Catalog</Label>
                  <Select value={form.supplement_id} onValueChange={v => setForm(f => ({ ...f, supplement_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select supplement..." /></SelectTrigger>
                    <SelectContent>
                      {supplements.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Or Custom Name</Label>
                  <Input value={form.custom_name} onChange={e => setForm(f => ({ ...f, custom_name: e.target.value }))} placeholder="Custom supplement name" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Dosage</Label>
                    <Input value={form.dosage} onChange={e => setForm(f => ({ ...f, dosage: e.target.value }))} placeholder="e.g. 500mg" />
                  </div>
                  <div>
                    <Label>Frequency</Label>
                    <Select value={form.frequency} onValueChange={v => setForm(f => ({ ...f, frequency: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="twice_daily">Twice Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="as_needed">As Needed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional notes..." rows={2} />
                </div>
                <Button className="w-full" onClick={() => addMutation.mutate()} disabled={addMutation.isPending}>
                  {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Add to Stack
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {selectedClient && (
        <div className="space-y-2">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : clientSupplements.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No supplements in this client's stack yet.</CardContent></Card>
          ) : (
            clientSupplements.map((cs: any) => (
              <Card key={cs.id} className="border-border/50">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Pill className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium">{cs.pt_supplements?.name || cs.custom_name}</h4>
                    <div className="flex gap-2 mt-0.5">
                      {cs.dosage && <Badge variant="secondary" className="text-[10px]">{cs.dosage}</Badge>}
                      <Badge variant="outline" className="text-[10px]">{cs.frequency?.replace('_', ' ')}</Badge>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="text-destructive h-8 w-8"
                    onClick={() => removeMutation.mutate(cs.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {!selectedClient && (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Select a client to view their supplement stack.</CardContent></Card>
      )}
    </div>
  );
}
