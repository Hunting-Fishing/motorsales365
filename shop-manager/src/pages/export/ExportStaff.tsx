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
import { Plus, Loader2, Users } from 'lucide-react';

export default function ExportStaff() {
  const { shopId } = useShopId(); const { toast } = useToast();
  const [staff, setStaff] = useState<any[]>([]); const [loading, setLoading] = useState(true); const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', role: 'staff', department: '' });
  const fetchData = async () => { if (!shopId) return; setLoading(true); const { data } = await supabase.from('export_staff').select('*').eq('shop_id', shopId).order('first_name'); setStaff(data || []); setLoading(false); };
  useEffect(() => { fetchData(); }, [shopId]);
  const handleCreate = async () => { if (!shopId || !form.first_name || !form.last_name) return; const { error } = await supabase.from('export_staff').insert({ ...form, shop_id: shopId }); if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; } toast({ title: 'Staff added' }); setDialogOpen(false); fetchData(); };
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold text-foreground">Export Staff</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Add Staff</Button></DialogTrigger>
          <DialogContent><DialogHeader><DialogTitle>Add Staff Member</DialogTitle></DialogHeader><div className="space-y-4">
            <div className="grid grid-cols-2 gap-4"><div><Label>First Name *</Label><Input value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} /></div><div><Label>Last Name *</Label><Input value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} /></div></div>
            <div className="grid grid-cols-2 gap-4"><div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div><div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div></div>
            <div className="grid grid-cols-2 gap-4"><div><Label>Role</Label><Input value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} /></div><div><Label>Department</Label><Input value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} /></div></div>
            <Button onClick={handleCreate} className="w-full">Add Staff</Button></div></DialogContent></Dialog></div>
      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : staff.length === 0 ? <p className="text-center text-muted-foreground py-8">No staff found</p> : (
        <div className="space-y-3">{staff.map(s => (<Card key={s.id}><CardContent className="p-4 flex items-center gap-3"><Users className="h-5 w-5 text-muted-foreground" /><div className="flex-1"><p className="font-semibold text-foreground">{s.first_name} {s.last_name}</p><p className="text-xs text-muted-foreground">{s.role} • {s.department || 'N/A'} • {s.email || s.phone || 'No contact'}</p></div><Badge variant={s.is_active ? 'default' : 'outline'}>{s.is_active ? 'Active' : 'Inactive'}</Badge></CardContent></Card>))}</div>)}
    </div>
  );
}
