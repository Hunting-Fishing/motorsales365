import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Search, Loader2, Container, MapPin } from 'lucide-react';
import { useShopId } from '@/hooks/useShopId';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function SepticTanks() {
  const { shopId } = useShopId();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ tank_type: 'concrete', tank_size_gallons: '', location_address: '', customer_id: '' });

  const { data: tanks = [], isLoading } = useQuery({
    queryKey: ['septic-tanks', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('septic_tanks')
        .select('*, septic_customers(first_name, last_name)')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['septic-tank-customers', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data } = await supabase.from('septic_customers').select('id, first_name, last_name').eq('shop_id', shopId).order('last_name');
      return data || [];
    },
    enabled: !!shopId,
  });

  const addTank = useMutation({
    mutationFn: async () => {
      if (!shopId) throw new Error('No shop');
      const { error } = await supabase.from('septic_tanks').insert({
        shop_id: shopId,
        tank_type: form.tank_type,
        tank_size_gallons: form.tank_size_gallons ? parseInt(form.tank_size_gallons) : null,
        location_address: form.location_address || null,
        customer_id: form.customer_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Tank added');
      queryClient.invalidateQueries({ queryKey: ['septic-tanks'] });
      setShowAdd(false);
      setForm({ tank_type: 'concrete', tank_size_gallons: '', location_address: '', customer_id: '' });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = tanks.filter((t: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    const cust = t.septic_customers as any;
    const custName = cust ? `${cust.first_name} ${cust.last_name}`.toLowerCase() : '';
    return t.tank_type?.toLowerCase().includes(s) || t.location_address?.toLowerCase().includes(s) || custName.includes(s);
  });

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Septic Tanks</h1>
        <Button onClick={() => setShowAdd(true)} className="bg-gradient-to-r from-stone-600 to-stone-800"><Plus className="h-4 w-4 mr-2" />Add Tank</Button>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search tanks..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-12 text-center"><Container className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" /><p className="text-muted-foreground mb-4">No septic tanks registered</p><Button onClick={() => setShowAdd(true)} variant="outline">Add first tank</Button></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t: any) => {
            const cust = t.septic_customers as any;
            return (
              <Card key={t.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold capitalize">{t.tank_type || 'Unknown'}</span>
                    <Badge variant="outline">{t.tank_size_gallons ? `${t.tank_size_gallons} gal` : '—'}</Badge>
                  </div>
                  {cust && <p className="text-sm text-muted-foreground">{cust.first_name} {cust.last_name}</p>}
                  {t.location_address && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{t.location_address}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Septic Tank</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Customer</Label>
              <Select value={form.customer_id} onValueChange={(v) => setForm(p => ({ ...p, customer_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>{customers.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Type</Label>
                <Select value={form.tank_type} onValueChange={(v) => setForm(p => ({ ...p, tank_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="concrete">Concrete</SelectItem>
                    <SelectItem value="fiberglass">Fiberglass</SelectItem>
                    <SelectItem value="plastic">Plastic</SelectItem>
                    <SelectItem value="steel">Steel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Size (gallons)</Label><Input type="number" value={form.tank_size_gallons} onChange={(e) => setForm(p => ({ ...p, tank_size_gallons: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>Location Address</Label><Input value={form.location_address} onChange={(e) => setForm(p => ({ ...p, location_address: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={() => addTank.mutate()} disabled={addTank.isPending}>{addTank.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
