import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useExportReservations } from '@/hooks/export/useExportReservations';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { Plus, Loader2, Lock, Unlock, Search, Package, AlertTriangle } from 'lucide-react';

export default function ExportReservations() {
  const { shopId } = useShopId();
  const { reservations, loading, reserve, release } = useExportReservations();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inventory, setInventory] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ inventory_id: '', request_id: '', customer_id: '', quantity_reserved: 0, notes: '' });

  useEffect(() => {
    if (!shopId) return;
    Promise.all([
      supabase.from('export_inventory').select('id, quantity, unit, lot_number, export_products(name)').eq('shop_id', shopId),
      supabase.from('export_requests').select('id, request_number').eq('shop_id', shopId).neq('status', 'cancelled'),
      supabase.from('export_customers').select('id, company_name').eq('shop_id', shopId),
    ]).then(([inv, req, cust]) => {
      setInventory(inv.data || []);
      setRequests(req.data || []);
      setCustomers(cust.data || []);
    });
  }, [shopId]);

  const handleReserve = async () => {
    if (!form.inventory_id || form.quantity_reserved <= 0) return;
    const ok = await reserve(form);
    if (ok) { setDialogOpen(false); setForm({ inventory_id: '', request_id: '', customer_id: '', quantity_reserved: 0, notes: '' }); }
  };

  // Calculate available vs reserved per inventory item
  const reservedByInv = reservations
    .filter(r => r.status === 'reserved')
    .reduce((acc: Record<string, number>, r) => {
      acc[r.inventory_id] = (acc[r.inventory_id] || 0) + Number(r.quantity_reserved);
      return acc;
    }, {});

  const filtered = reservations.filter(r =>
    (r as any).export_inventory?.export_products?.name?.toLowerCase().includes(search.toLowerCase()) ||
    (r as any).export_requests?.request_number?.toLowerCase().includes(search.toLowerCase()) ||
    (r as any).export_customers?.company_name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalReserved = reservations.filter(r => r.status === 'reserved').reduce((s, r) => s + Number(r.quantity_reserved), 0);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Inventory Reservations</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Reserve Stock</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Reserve Inventory</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Inventory Item *</Label>
                <Select value={form.inventory_id} onValueChange={v => setForm(p => ({ ...p, inventory_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                  <SelectContent>{inventory.map(i => {
                    const reserved = reservedByInv[i.id] || 0;
                    const available = Number(i.quantity) - reserved;
                    return (
                      <SelectItem key={i.id} value={i.id}>
                        {(i as any).export_products?.name || 'Product'} — {available.toLocaleString()} {i.unit} avail (Lot: {i.lot_number || 'N/A'})
                      </SelectItem>
                    );
                  })}</SelectContent>
                </Select>
              </div>
              <div><Label>Request</Label>
                <Select value={form.request_id} onValueChange={v => setForm(p => ({ ...p, request_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Link to request (optional)" /></SelectTrigger>
                  <SelectContent>{requests.map(r => <SelectItem key={r.id} value={r.id}>{r.request_number}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Client</Label>
                <Select value={form.customer_id} onValueChange={v => setForm(p => ({ ...p, customer_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select client (optional)" /></SelectTrigger>
                  <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Quantity to Reserve *</Label><Input type="number" value={form.quantity_reserved} onChange={e => setForm(p => ({ ...p, quantity_reserved: Number(e.target.value) }))} /></div>
              <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
              <Button onClick={handleReserve} className="w-full">Reserve Stock</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card><CardContent className="p-3 text-center">
          <Lock className="h-5 w-5 mx-auto mb-1 text-amber-500" />
          <p className="text-xl font-bold text-foreground">{reservations.filter(r => r.status === 'reserved').length}</p>
          <p className="text-xs text-muted-foreground">Active Reservations</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Package className="h-5 w-5 mx-auto mb-1 text-emerald-500" />
          <p className="text-xl font-bold text-foreground">{totalReserved.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Units Reserved</p>
        </CardContent></Card>
      </div>

      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search reservations..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>

      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No reservations yet</p> : (
        <div className="space-y-3">
          {filtered.map(r => (
            <Card key={r.id}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${r.status === 'reserved' ? 'bg-amber-100' : 'bg-green-100'}`}>
                  {r.status === 'reserved' ? <Lock className="h-5 w-5 text-amber-600" /> : <Unlock className="h-5 w-5 text-green-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm truncate">{(r as any).export_inventory?.export_products?.name || 'Product'}</p>
                  <p className="text-xs text-muted-foreground">
                    {Number(r.quantity_reserved).toLocaleString()} reserved
                    {(r as any).export_requests?.request_number ? ` • ${(r as any).export_requests.request_number}` : ''}
                    {(r as any).export_customers?.company_name ? ` • ${(r as any).export_customers.company_name}` : ''}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{new Date(r.reserved_at || r.created_at).toLocaleDateString()}</p>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <Badge variant={r.status === 'reserved' ? 'default' : 'secondary'} className="text-[10px]">{r.status}</Badge>
                  {r.status === 'reserved' && (
                    <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => release(r.id)}>
                      <Unlock className="h-3 w-3 mr-1" /> Release
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
