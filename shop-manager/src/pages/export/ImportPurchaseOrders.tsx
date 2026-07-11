import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useImportPurchaseOrders } from '@/hooks/export/useImportPurchaseOrders';
import { Loader2, Plus, ShoppingCart, ArrowDownToLine } from 'lucide-react';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  submitted: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  confirmed: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  shipped: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  received: 'bg-green-500/10 text-green-600 border-green-500/20',
  cancelled: 'bg-red-500/10 text-red-600 border-red-500/20',
};

export default function ImportPurchaseOrders() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const { orders, loading, create } = useImportPurchaseOrders({ status: statusFilter });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    po_number: '',
    order_date: new Date().toISOString().split('T')[0],
    expected_delivery: '',
    total_amount: '',
    currency: 'USD',
    payment_terms: 'Net 30',
    incoterm: 'FOB',
    origin_country: '',
    port_of_loading: '',
    status: 'draft',
    notes: '',
  });

  const handleCreate = async () => {
    const ok = await create({ ...form, total_amount: Number(form.total_amount || 0) });
    if (ok) { setOpen(false); setForm({ ...form, po_number: '', total_amount: '', expected_delivery: '', origin_country: '', port_of_loading: '', notes: '' }); }
  };

  const totalValue = orders.reduce((s, o) => s + Number(o.total_amount || 0), 0);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowDownToLine className="h-6 w-6 text-blue-500" />
          <h1 className="text-2xl font-bold text-foreground">Import Purchase Orders</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white"><Plus className="h-4 w-4 mr-1" /> New PO</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New Purchase Order</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>PO Number</Label><Input placeholder="PO-001" value={form.po_number} onChange={e => setForm(f => ({ ...f, po_number: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Order Date</Label><Input type="date" value={form.order_date} onChange={e => setForm(f => ({ ...f, order_date: e.target.value }))} /></div>
                <div><Label>Expected Delivery</Label><Input type="date" value={form.expected_delivery} onChange={e => setForm(f => ({ ...f, expected_delivery: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Total Amount</Label><Input type="number" placeholder="0.00" value={form.total_amount} onChange={e => setForm(f => ({ ...f, total_amount: e.target.value }))} /></div>
                <div><Label>Currency</Label>
                  <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem><SelectItem value="GBP">GBP</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Payment Terms</Label><Input value={form.payment_terms} onChange={e => setForm(f => ({ ...f, payment_terms: e.target.value }))} /></div>
                <div><Label>Incoterm</Label>
                  <Select value={form.incoterm} onValueChange={v => setForm(f => ({ ...f, incoterm: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="FOB">FOB</SelectItem><SelectItem value="CIF">CIF</SelectItem><SelectItem value="EXW">EXW</SelectItem><SelectItem value="DDP">DDP</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Origin Country</Label><Input value={form.origin_country} onChange={e => setForm(f => ({ ...f, origin_country: e.target.value }))} /></div>
                <div><Label>Port of Loading</Label><Input value={form.port_of_loading} onChange={e => setForm(f => ({ ...f, port_of_loading: e.target.value }))} /></div>
              </div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="submitted">Submitted</SelectItem><SelectItem value="confirmed">Confirmed</SelectItem><SelectItem value="shipped">Shipped</SelectItem><SelectItem value="received">Received</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
              <Button className="w-full" onClick={handleCreate}>Create PO</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-blue-500/20 bg-blue-500/5"><CardContent className="p-4 flex items-center justify-between">
        <div><p className="text-xs text-muted-foreground">Total PO Value</p><p className="text-xl font-bold text-foreground">${totalValue.toLocaleString()}</p></div>
        <div><p className="text-xs text-muted-foreground">Active POs</p><p className="text-xl font-bold text-foreground">{orders.filter(o => !['cancelled', 'received'].includes(o.status)).length}</p></div>
      </CardContent></Card>

      <Tabs defaultValue="all" onValueChange={v => setStatusFilter(v === 'all' ? undefined : v)}>
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
          <TabsTrigger value="shipped">Shipped</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : orders.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No purchase orders yet.</p>
      ) : (
        <div className="space-y-3">
          {orders.map(o => (
            <Card key={o.id}><CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-foreground">{o.po_number}</p>
                  <p className="text-xs text-muted-foreground">{(o as any).export_suppliers?.company_name || 'No supplier'}</p>
                  <p className="text-xs text-muted-foreground">{o.incoterm} • {o.origin_country || 'N/A'}</p>
                  {o.expected_delivery && <p className="text-xs text-muted-foreground">ETA: {new Date(o.expected_delivery).toLocaleDateString()}</p>}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-foreground">{o.currency} {Number(o.total_amount).toLocaleString()}</p>
                  <Badge variant="outline" className={statusColors[o.status] || ''}>{o.status}</Badge>
                </div>
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}
