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
import { Plus, Loader2, Truck } from 'lucide-react';

export default function ExportTrucks() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [trucks, setTrucks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ unit_number: '', make: '', model: '', year: '', vin: '', license_plate: '', truck_type: 'flatbed', max_payload_kg: '', notes: '' });

  const fetchData = async () => { if (!shopId) return; setLoading(true); const { data } = await supabase.from('export_trucks').select('*').eq('shop_id', shopId).order('unit_number'); setTrucks(data || []); setLoading(false); };
  useEffect(() => { fetchData(); }, [shopId]);

  const handleCreate = async () => {
    if (!shopId || !form.unit_number) return;
    const { error } = await supabase.from('export_trucks').insert({ ...form, shop_id: shopId, year: form.year ? Number(form.year) : null, max_payload_kg: form.max_payload_kg ? Number(form.max_payload_kg) : null });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Truck added' }); setDialogOpen(false); fetchData();
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Export Trucks</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Add Truck</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Truck</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Unit Number *</Label><Input value={form.unit_number} onChange={e => setForm(p => ({ ...p, unit_number: e.target.value }))} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Make</Label><Input value={form.make} onChange={e => setForm(p => ({ ...p, make: e.target.value }))} /></div>
                <div><Label>Model</Label><Input value={form.model} onChange={e => setForm(p => ({ ...p, model: e.target.value }))} /></div>
                <div><Label>Year</Label><Input type="number" value={form.year} onChange={e => setForm(p => ({ ...p, year: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>VIN</Label><Input value={form.vin} onChange={e => setForm(p => ({ ...p, vin: e.target.value }))} /></div>
                <div><Label>License Plate</Label><Input value={form.license_plate} onChange={e => setForm(p => ({ ...p, license_plate: e.target.value }))} /></div>
              </div>
              <div><Label>Max Payload (kg)</Label><Input type="number" value={form.max_payload_kg} onChange={e => setForm(p => ({ ...p, max_payload_kg: e.target.value }))} /></div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
              <Button onClick={handleCreate} className="w-full">Add Truck</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : trucks.length === 0 ? <p className="text-center text-muted-foreground py-8">No trucks found</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {trucks.map(t => (
            <Card key={t.id}><CardContent className="p-4 flex items-center gap-4">
              <Truck className="h-8 w-8 text-slate-500" />
              <div className="flex-1">
                <p className="font-semibold text-foreground">{t.unit_number}</p>
                <p className="text-sm text-muted-foreground">{t.year || ''} {t.make || ''} {t.model || ''}</p>
                <p className="text-xs text-muted-foreground">{t.license_plate || 'No plate'} • {t.truck_type} • {t.max_payload_kg ? `${Number(t.max_payload_kg).toLocaleString()} kg` : 'N/A'}</p>
              </div>
              <Badge variant={t.status === 'active' ? 'default' : 'outline'}>{t.status}</Badge>
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}
