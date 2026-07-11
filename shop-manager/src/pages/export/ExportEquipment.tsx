import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2, Wrench } from 'lucide-react';

export default function ExportEquipment() {
  const { shopId } = useShopId(); const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]); const [loading, setLoading] = useState(true); const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', equipment_type: 'forklift', serial_number: '', manufacturer: '', model: '', location: '' });
  const fetchData = async () => { if (!shopId) return; setLoading(true); const { data } = await supabase.from('export_equipment').select('*').eq('shop_id', shopId).order('name'); setItems(data || []); setLoading(false); };
  useEffect(() => { fetchData(); }, [shopId]);
  const handleCreate = async () => { if (!shopId || !form.name || !form.equipment_type) return; const { error } = await supabase.from('export_equipment').insert({ ...form, shop_id: shopId }); if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; } toast({ title: 'Equipment added' }); setDialogOpen(false); fetchData(); };
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold text-foreground">Equipment</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Add</Button></DialogTrigger>
          <DialogContent><DialogHeader><DialogTitle>Add Equipment</DialogTitle></DialogHeader><div className="space-y-4">
            <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4"><div><Label>Type *</Label><Input value={form.equipment_type} onChange={e => setForm(p => ({ ...p, equipment_type: e.target.value }))} /></div><div><Label>Serial #</Label><Input value={form.serial_number} onChange={e => setForm(p => ({ ...p, serial_number: e.target.value }))} /></div></div>
            <div><Label>Location</Label><Input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} /></div>
            <Button onClick={handleCreate} className="w-full">Add Equipment</Button></div></DialogContent></Dialog></div>
      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : items.length === 0 ? <p className="text-center text-muted-foreground py-8">No equipment found</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{items.map(i => (<Card key={i.id}><CardContent className="p-4 flex items-center gap-3"><Wrench className="h-5 w-5 text-muted-foreground" /><div className="flex-1"><p className="font-semibold text-foreground">{i.name}</p><p className="text-xs text-muted-foreground">{i.equipment_type} • {i.serial_number || 'N/A'} • {i.location || 'N/A'}</p></div><Badge variant={i.status === 'active' ? 'default' : 'outline'}>{i.status}</Badge></CardContent></Card>))}</div>)}
    </div>
  );
}
