import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Plus, Search, Loader2 } from 'lucide-react';

export default function ExportOrders() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [form, setForm] = useState({ order_number: '', customer_id: '', destination_country: '', destination_port: '', incoterms: 'FOB', currency: 'USD', notes: '' });

  const fetchOrders = async () => {
    if (!shopId) return;
    setLoading(true);
    const { data } = await supabase.from('export_orders').select('*, export_customers(company_name)').eq('shop_id', shopId).order('created_at', { ascending: false });
    setOrders(data || []);
    setLoading(false);
  };

  const fetchCustomers = async () => {
    if (!shopId) return;
    const { data } = await supabase.from('export_customers').select('id, company_name').eq('shop_id', shopId).eq('is_active', true);
    setCustomers(data || []);
  };

  useEffect(() => { fetchOrders(); fetchCustomers(); }, [shopId]);

  const handleCreate = async () => {
    if (!shopId || !form.order_number) return;
    const { error } = await supabase.from('export_orders').insert({ ...form, shop_id: shopId, customer_id: form.customer_id || null });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Order created' });
    setDialogOpen(false);
    setForm({ order_number: '', customer_id: '', destination_country: '', destination_port: '', incoterms: 'FOB', currency: 'USD', notes: '' });
    fetchOrders();
  };

  const filtered = orders.filter(o => o.order_number.toLowerCase().includes(search.toLowerCase()) || o.destination_country?.toLowerCase().includes(search.toLowerCase()));

  const statusColor = (s: string) => {
    switch (s) { case 'confirmed': return 'default'; case 'shipped': return 'secondary'; case 'delivered': return 'outline'; default: return 'outline'; }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Export Orders</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> New Order</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Export Order</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Order Number *</Label><Input value={form.order_number} onChange={e => setForm(p => ({ ...p, order_number: e.target.value }))} placeholder="EXP-001" /></div>
              <div><Label>Customer</Label>
                <Select value={form.customer_id} onValueChange={v => setForm(p => ({ ...p, customer_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Destination Country</Label><Input value={form.destination_country} onChange={e => setForm(p => ({ ...p, destination_country: e.target.value }))} /></div>
                <div><Label>Destination Port</Label><Input value={form.destination_port} onChange={e => setForm(p => ({ ...p, destination_port: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Incoterms</Label>
                  <Select value={form.incoterms} onValueChange={v => setForm(p => ({ ...p, incoterms: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{['FOB','CIF','CFR','EXW','FCA','DAP','DDP'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Currency</Label>
                  <Select value={form.currency} onValueChange={v => setForm(p => ({ ...p, currency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{['USD','EUR','GBP','JPY','CAD'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
              <Button onClick={handleCreate} className="w-full">Create Order</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search orders..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>

      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No orders found</p> : (
        <div className="space-y-3">
          {filtered.map(order => (
            <Card key={order.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">{order.order_number}</p>
                  <p className="text-sm text-muted-foreground">{(order as any).export_customers?.company_name || 'No customer'} • {order.destination_country || 'N/A'}</p>
                  <p className="text-xs text-muted-foreground">{order.incoterms} • {order.currency} • Total: {Number(order.total || 0).toFixed(2)}</p>
                </div>
                <Badge variant={statusColor(order.status)}>{order.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
