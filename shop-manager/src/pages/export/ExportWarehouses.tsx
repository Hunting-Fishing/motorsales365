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
import { Plus, Search, Loader2, Warehouse } from 'lucide-react';

export default function ExportWarehouses() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', city: '', country: '', capacity_sqft: '', contact_name: '', contact_phone: '', notes: '' });

  const fetchData = async () => { if (!shopId) return; setLoading(true); const { data } = await supabase.from('export_warehouses').select('*').eq('shop_id', shopId).order('name'); setWarehouses(data || []); setLoading(false); };
  useEffect(() => { fetchData(); }, [shopId]);

  const handleCreate = async () => {
    if (!shopId || !form.name) return;
    const { error } = await supabase.from('export_warehouses').insert({ ...form, shop_id: shopId, capacity_sqft: form.capacity_sqft ? Number(form.capacity_sqft) : null });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Warehouse added' }); setDialogOpen(false); fetchData();
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Warehouses</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Add Warehouse</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Warehouse</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
              <div><Label>Address</Label><Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>City</Label><Input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} /></div>
                <div><Label>Country</Label><Input value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))} /></div>
              </div>
              <div><Label>Capacity (sqft)</Label><Input type="number" value={form.capacity_sqft} onChange={e => setForm(p => ({ ...p, capacity_sqft: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Contact Name</Label><Input value={form.contact_name} onChange={e => setForm(p => ({ ...p, contact_name: e.target.value }))} /></div>
                <div><Label>Contact Phone</Label><Input value={form.contact_phone} onChange={e => setForm(p => ({ ...p, contact_phone: e.target.value }))} /></div>
              </div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
              <Button onClick={handleCreate} className="w-full">Add Warehouse</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : warehouses.length === 0 ? <p className="text-center text-muted-foreground py-8">No warehouses found</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {warehouses.map(w => (
            <Card key={w.id}><CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <Warehouse className="h-5 w-5 text-violet-500" />
                <p className="font-semibold text-foreground">{w.name}</p>
                <Badge variant={w.is_active ? 'default' : 'outline'} className="ml-auto">{w.is_active ? 'Active' : 'Inactive'}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{w.address || ''}{w.city ? `, ${w.city}` : ''}{w.country ? `, ${w.country}` : ''}</p>
              {w.capacity_sqft && <p className="text-xs text-muted-foreground">Capacity: {Number(w.capacity_sqft).toLocaleString()} sqft</p>}
              {w.contact_name && <p className="text-xs text-muted-foreground">{w.contact_name} {w.contact_phone ? `• ${w.contact_phone}` : ''}</p>}
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}
