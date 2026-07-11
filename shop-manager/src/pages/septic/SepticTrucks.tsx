import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Loader2, Truck } from 'lucide-react';
import { useShopId } from '@/hooks/useShopId';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function SepticTrucks() {
  const { shopId } = useShopId();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ truck_number: '', make: '', model: '', year: '', vin: '', license_plate: '', tank_capacity_gallons: '', status: 'active' });

  const { data: trucks = [], isLoading } = useQuery({
    queryKey: ['septic-trucks', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase.from('septic_trucks').select('*').eq('shop_id', shopId).order('truck_number');
      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });

  const addTruck = useMutation({
    mutationFn: async () => {
      if (!shopId) throw new Error('No shop');
      const { error } = await supabase.from('septic_trucks').insert({
        shop_id: shopId, truck_number: form.truck_number, make: form.make || null, model: form.model || null,
        year: form.year ? parseInt(form.year) : null, vin: form.vin || null, license_plate: form.license_plate || null,
        tank_capacity_gallons: form.tank_capacity_gallons ? parseInt(form.tank_capacity_gallons) : null, status: form.status,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Truck added');
      queryClient.invalidateQueries({ queryKey: ['septic-trucks'] });
      setShowAdd(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const statusColor = (s: string) => s === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pump Trucks</h1>
        <Button onClick={() => setShowAdd(true)} className="bg-gradient-to-r from-stone-600 to-stone-800"><Plus className="h-4 w-4 mr-2" />Add Truck</Button>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : trucks.length === 0 ? (
        <Card><CardContent className="p-12 text-center"><Truck className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" /><p className="text-muted-foreground mb-4">No trucks registered</p><Button onClick={() => setShowAdd(true)} variant="outline">Add first truck</Button></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trucks.map((t: any) => (
            <Card key={t.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Truck #{t.truck_number || '—'}</span>
                  <Badge className={statusColor(t.status)}>{t.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{[t.year, t.make, t.model].filter(Boolean).join(' ') || 'No details'}</p>
                {t.tank_capacity_gallons && <Badge variant="outline">{t.tank_capacity_gallons} gal capacity</Badge>}
                {t.license_plate && <p className="text-xs text-muted-foreground">Plate: {t.license_plate}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Pump Truck</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Truck #</Label><Input value={form.truck_number} onChange={(e) => setForm(p => ({ ...p, truck_number: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Capacity (gal)</Label><Input type="number" value={form.tank_capacity_gallons} onChange={(e) => setForm(p => ({ ...p, tank_capacity_gallons: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Year</Label><Input value={form.year} onChange={(e) => setForm(p => ({ ...p, year: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Make</Label><Input value={form.make} onChange={(e) => setForm(p => ({ ...p, make: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Model</Label><Input value={form.model} onChange={(e) => setForm(p => ({ ...p, model: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>VIN</Label><Input value={form.vin} onChange={(e) => setForm(p => ({ ...p, vin: e.target.value }))} /></div>
              <div className="space-y-2"><Label>License Plate</Label><Input value={form.license_plate} onChange={(e) => setForm(p => ({ ...p, license_plate: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="maintenance">Maintenance</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={() => addTruck.mutate()} disabled={!form.truck_number || addTruck.isPending}>{addTruck.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
