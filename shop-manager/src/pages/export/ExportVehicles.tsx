import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Loader2, Car } from 'lucide-react';

export default function ExportVehicles() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ vin: '', make: '', model: '', year: '', color: '', engine_type: '', mileage: '', purchase_price: '', selling_price: '', export_destination: '', notes: '' });

  const fetchData = async () => { if (!shopId) return; setLoading(true); const { data } = await supabase.from('export_vehicles').select('*').eq('shop_id', shopId).order('created_at', { ascending: false }); setVehicles(data || []); setLoading(false); };
  useEffect(() => { fetchData(); }, [shopId]);

  const handleCreate = async () => {
    if (!shopId || !form.vin || !form.make || !form.model) return;
    const { error } = await supabase.from('export_vehicles').insert({ ...form, shop_id: shopId, year: form.year ? Number(form.year) : null, mileage: form.mileage ? Number(form.mileage) : null, purchase_price: form.purchase_price ? Number(form.purchase_price) : null, selling_price: form.selling_price ? Number(form.selling_price) : null });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Vehicle added' }); setDialogOpen(false); fetchData();
  };

  const filtered = vehicles.filter(v => v.vin.toLowerCase().includes(search.toLowerCase()) || v.make.toLowerCase().includes(search.toLowerCase()) || v.model.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Export Vehicles</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Add Vehicle</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add Vehicle for Export</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>VIN *</Label><Input value={form.vin} onChange={e => setForm(p => ({ ...p, vin: e.target.value }))} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Make *</Label><Input value={form.make} onChange={e => setForm(p => ({ ...p, make: e.target.value }))} /></div>
                <div><Label>Model *</Label><Input value={form.model} onChange={e => setForm(p => ({ ...p, model: e.target.value }))} /></div>
                <div><Label>Year</Label><Input type="number" value={form.year} onChange={e => setForm(p => ({ ...p, year: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Color</Label><Input value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} /></div>
                <div><Label>Engine Type</Label><Input value={form.engine_type} onChange={e => setForm(p => ({ ...p, engine_type: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Mileage</Label><Input type="number" value={form.mileage} onChange={e => setForm(p => ({ ...p, mileage: e.target.value }))} /></div>
                <div><Label>Purchase Price</Label><Input type="number" value={form.purchase_price} onChange={e => setForm(p => ({ ...p, purchase_price: e.target.value }))} /></div>
                <div><Label>Selling Price</Label><Input type="number" value={form.selling_price} onChange={e => setForm(p => ({ ...p, selling_price: e.target.value }))} /></div>
              </div>
              <div><Label>Export Destination</Label><Input value={form.export_destination} onChange={e => setForm(p => ({ ...p, export_destination: e.target.value }))} /></div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
              <Button onClick={handleCreate} className="w-full">Add Vehicle</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search by VIN, make, model..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No vehicles found</p> : (
        <div className="space-y-3">
          {filtered.map(v => (
            <Card key={v.id}><CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center"><Car className="h-6 w-6 text-white" /></div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">{v.year} {v.make} {v.model}</p>
                <p className="text-sm text-muted-foreground">VIN: {v.vin}</p>
                <p className="text-xs text-muted-foreground">{v.color || 'N/A'} • {v.mileage ? `${v.mileage.toLocaleString()} mi` : 'N/A'} • {v.export_destination || 'No destination'}</p>
              </div>
              <div className="text-right">
                <Badge variant={v.customs_status === 'cleared' ? 'default' : v.customs_status === 'pending' ? 'secondary' : 'outline'}>{v.customs_status}</Badge>
                {v.selling_price && <p className="text-sm font-semibold text-foreground mt-1">${Number(v.selling_price).toLocaleString()}</p>}
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}
