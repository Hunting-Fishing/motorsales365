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
import { Plus, Loader2, UserCheck } from 'lucide-react';

export default function ExportDrivers() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', license_number: '', license_class: '', license_expiry: '' });

  const fetchData = async () => { if (!shopId) return; setLoading(true); const { data } = await supabase.from('export_drivers').select('*, export_trucks(unit_number)').eq('shop_id', shopId).order('first_name'); setDrivers(data || []); setLoading(false); };
  useEffect(() => { fetchData(); }, [shopId]);

  const handleCreate = async () => {
    if (!shopId || !form.first_name || !form.last_name) return;
    const { error } = await supabase.from('export_drivers').insert({ ...form, shop_id: shopId, license_expiry: form.license_expiry || null });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Driver added' }); setDialogOpen(false); fetchData();
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Export Drivers</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Add Driver</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Driver</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>First Name *</Label><Input value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} /></div>
                <div><Label>Last Name *</Label><Input value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
                <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>License #</Label><Input value={form.license_number} onChange={e => setForm(p => ({ ...p, license_number: e.target.value }))} /></div>
                <div><Label>License Class</Label><Input value={form.license_class} onChange={e => setForm(p => ({ ...p, license_class: e.target.value }))} /></div>
              </div>
              <div><Label>License Expiry</Label><Input type="date" value={form.license_expiry} onChange={e => setForm(p => ({ ...p, license_expiry: e.target.value }))} /></div>
              <Button onClick={handleCreate} className="w-full">Add Driver</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : drivers.length === 0 ? <p className="text-center text-muted-foreground py-8">No drivers found</p> : (
        <div className="space-y-3">
          {drivers.map(d => (
            <Card key={d.id}><CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center"><UserCheck className="h-5 w-5 text-white" /></div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">{d.first_name} {d.last_name}</p>
                <p className="text-sm text-muted-foreground">{d.phone || d.email || 'No contact'} • License: {d.license_class || 'N/A'}</p>
                <p className="text-xs text-muted-foreground">Truck: {(d as any).export_trucks?.unit_number || 'Unassigned'}</p>
              </div>
              <Badge variant={d.status === 'active' ? 'default' : 'outline'}>{d.status}</Badge>
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}
