import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2, Route } from 'lucide-react';

export default function ExportRoutes() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ route_name: '', scheduled_date: '', start_location: '', end_location: '', notes: '' });

  const fetchData = async () => { if (!shopId) return; setLoading(true); const { data } = await supabase.from('export_routes').select('*, export_drivers(first_name, last_name), export_trucks(unit_number)').eq('shop_id', shopId).order('scheduled_date', { ascending: false }); setRoutes(data || []); setLoading(false); };
  useEffect(() => { fetchData(); }, [shopId]);

  const handleCreate = async () => {
    if (!shopId || !form.route_name || !form.scheduled_date) return;
    const { error } = await supabase.from('export_routes').insert({ ...form, shop_id: shopId });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Route created' }); setDialogOpen(false); fetchData();
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Export Routes</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> New Route</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Route</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Route Name *</Label><Input value={form.route_name} onChange={e => setForm(p => ({ ...p, route_name: e.target.value }))} /></div>
              <div><Label>Scheduled Date *</Label><Input type="date" value={form.scheduled_date} onChange={e => setForm(p => ({ ...p, scheduled_date: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Start Location</Label><Input value={form.start_location} onChange={e => setForm(p => ({ ...p, start_location: e.target.value }))} /></div>
                <div><Label>End Location</Label><Input value={form.end_location} onChange={e => setForm(p => ({ ...p, end_location: e.target.value }))} /></div>
              </div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
              <Button onClick={handleCreate} className="w-full">Create Route</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : routes.length === 0 ? <p className="text-center text-muted-foreground py-8">No routes found</p> : (
        <div className="space-y-3">
          {routes.map(r => (
            <Card key={r.id}><CardContent className="p-4 flex items-center gap-4">
              <Route className="h-6 w-6 text-emerald-500" />
              <div className="flex-1">
                <p className="font-semibold text-foreground">{r.route_name}</p>
                <p className="text-sm text-muted-foreground">{new Date(r.scheduled_date).toLocaleDateString()} • {r.start_location || '?'} → {r.end_location || '?'}</p>
                <p className="text-xs text-muted-foreground">Driver: {(r as any).export_drivers ? `${(r as any).export_drivers.first_name} ${(r as any).export_drivers.last_name}` : 'Unassigned'} • Truck: {(r as any).export_trucks?.unit_number || 'N/A'}</p>
              </div>
              <Badge variant={r.status === 'completed' ? 'default' : r.status === 'in_progress' ? 'secondary' : 'outline'}>{r.status}</Badge>
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}
