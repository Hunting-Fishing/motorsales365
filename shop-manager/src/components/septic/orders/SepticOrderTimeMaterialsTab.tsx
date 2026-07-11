import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2, Clock, Package, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface SepticOrderTimeMaterialsTabProps {
  orderId: string;
  shopId: string | null;
}

export default function SepticOrderTimeMaterialsTab({ orderId, shopId }: SepticOrderTimeMaterialsTabProps) {
  const queryClient = useQueryClient();
  const [newEntry, setNewEntry] = useState({ employee_name: '', arrived_at: '', departed_at: '', notes: '' });
  const [newMaterial, setNewMaterial] = useState({ item_name: '', quantity: '1', unit_cost: '0', notes: '' });

  // Fetch time entries
  const { data: timeEntries = [], isLoading: timeLoading } = useQuery({
    queryKey: ['septic-order-time-entries', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('septic_order_time_entries' as any)
        .select('*')
        .eq('service_order_id', orderId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!orderId,
  });

  // Fetch materials
  const { data: materials = [], isLoading: matLoading } = useQuery({
    queryKey: ['septic-order-materials', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('septic_order_materials' as any)
        .select('*')
        .eq('service_order_id', orderId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!orderId,
  });

  // Add time entry
  const addTimeEntry = useMutation({
    mutationFn: async () => {
      const arrived = newEntry.arrived_at ? new Date(newEntry.arrived_at).toISOString() : null;
      const departed = newEntry.departed_at ? new Date(newEntry.departed_at).toISOString() : null;
      let duration = null;
      if (arrived && departed) {
        duration = Math.round((new Date(departed).getTime() - new Date(arrived).getTime()) / 60000);
      }
      const { error } = await supabase
        .from('septic_order_time_entries' as any)
        .insert({
          shop_id: shopId,
          service_order_id: orderId,
          employee_name: newEntry.employee_name || null,
          arrived_at: arrived,
          departed_at: departed,
          duration_minutes: duration,
          notes: newEntry.notes || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['septic-order-time-entries', orderId] });
      setNewEntry({ employee_name: '', arrived_at: '', departed_at: '', notes: '' });
      toast.success('Time entry added');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Delete time entry
  const deleteTimeEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('septic_order_time_entries' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['septic-order-time-entries', orderId] });
      toast.success('Entry removed');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Add material
  const addMaterial = useMutation({
    mutationFn: async () => {
      const qty = Number(newMaterial.quantity) || 1;
      const unitCost = Number(newMaterial.unit_cost) || 0;
      const { error } = await supabase
        .from('septic_order_materials' as any)
        .insert({
          shop_id: shopId,
          service_order_id: orderId,
          item_name: newMaterial.item_name,
          quantity: qty,
          unit_cost: unitCost,
          total_cost: qty * unitCost,
          notes: newMaterial.notes || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['septic-order-materials', orderId] });
      setNewMaterial({ item_name: '', quantity: '1', unit_cost: '0', notes: '' });
      toast.success('Material added');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Delete material
  const deleteMaterial = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('septic_order_materials' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['septic-order-materials', orderId] });
      toast.success('Material removed');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalLabor = timeEntries.reduce((sum: number, e: any) => sum + (Number(e.duration_minutes) || 0), 0);
  const totalMaterials = materials.reduce((sum: number, m: any) => sum + (Number(m.total_cost) || 0), 0);
  const isLoading = timeLoading || matLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Time Tracking */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" /> Time Entries
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing entries */}
          {timeEntries.length > 0 && (
            <div className="space-y-2">
              {timeEntries.map((entry: any) => (
                <div key={entry.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 text-sm">
                  <div className="flex-1 space-y-0.5">
                    {entry.employee_name && <p className="font-medium">{entry.employee_name}</p>}
                    <div className="flex gap-4 text-muted-foreground text-xs">
                      {entry.arrived_at && <span>In: {format(new Date(entry.arrived_at), 'MMM d h:mm a')}</span>}
                      {entry.departed_at && <span>Out: {format(new Date(entry.departed_at), 'MMM d h:mm a')}</span>}
                      {entry.duration_minutes != null && <span className="font-medium text-foreground">{entry.duration_minutes} min</span>}
                    </div>
                    {entry.notes && <p className="text-xs text-muted-foreground">{entry.notes}</p>}
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteTimeEntry.mutate(entry.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
              <p className="text-sm font-medium text-right">Total Labor: {totalLabor} min ({(totalLabor / 60).toFixed(1)} hrs)</p>
            </div>
          )}

          {/* Add new */}
          <Separator />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Employee</Label>
              <Input
                placeholder="Name"
                value={newEntry.employee_name}
                onChange={(e) => setNewEntry(p => ({ ...p, employee_name: e.target.value }))}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Input
                placeholder="Optional notes"
                value={newEntry.notes}
                onChange={(e) => setNewEntry(p => ({ ...p, notes: e.target.value }))}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Arrived</Label>
              <Input
                type="datetime-local"
                value={newEntry.arrived_at}
                onChange={(e) => setNewEntry(p => ({ ...p, arrived_at: e.target.value }))}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Departed</Label>
              <Input
                type="datetime-local"
                value={newEntry.departed_at}
                onChange={(e) => setNewEntry(p => ({ ...p, departed_at: e.target.value }))}
                className="h-9"
              />
            </div>
          </div>
          <Button size="sm" onClick={() => addTimeEntry.mutate()} disabled={addTimeEntry.isPending}>
            {addTimeEntry.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
            Add Time Entry
          </Button>
        </CardContent>
      </Card>

      {/* Materials */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" /> Materials Used
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {materials.length > 0 && (
            <div className="space-y-2">
              {materials.map((mat: any) => (
                <div key={mat.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 text-sm">
                  <div className="flex-1">
                    <p className="font-medium">{mat.item_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {mat.quantity} × ${Number(mat.unit_cost).toFixed(2)} = ${Number(mat.total_cost).toFixed(2)}
                    </p>
                    {mat.notes && <p className="text-xs text-muted-foreground">{mat.notes}</p>}
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteMaterial.mutate(mat.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
              <p className="text-sm font-medium text-right">Total Materials: ${totalMaterials.toFixed(2)}</p>
            </div>
          )}

          <Separator />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Item Name</Label>
              <Input
                placeholder="Part or material"
                value={newMaterial.item_name}
                onChange={(e) => setNewMaterial(p => ({ ...p, item_name: e.target.value }))}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Qty</Label>
              <Input
                type="number"
                value={newMaterial.quantity}
                onChange={(e) => setNewMaterial(p => ({ ...p, quantity: e.target.value }))}
                className="h-9"
                min="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Unit Cost ($)</Label>
              <Input
                type="number"
                value={newMaterial.unit_cost}
                onChange={(e) => setNewMaterial(p => ({ ...p, unit_cost: e.target.value }))}
                className="h-9"
                min="0"
                step="0.01"
              />
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => addMaterial.mutate()}
            disabled={!newMaterial.item_name.trim() || addMaterial.isPending}
          >
            {addMaterial.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
            Add Material
          </Button>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardContent className="py-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Labor</span>
            <span className="font-medium">{totalLabor} min ({(totalLabor / 60).toFixed(1)} hrs)</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-muted-foreground">Total Materials</span>
            <span className="font-medium">${totalMaterials.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
