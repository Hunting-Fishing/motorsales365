import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useExportRequests, useExportRequestItems } from '@/hooks/export/useExportRequests';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { Plus, Search, Loader2, FileText, ArrowLeft, Package, Trash2, RefreshCw, Clock, CheckCircle2, XCircle } from 'lucide-react';

const REQUEST_TYPES = [
  { value: 'quote', label: 'Quote / Price Inquiry' },
  { value: 'purchase_order', label: 'Purchase Order' },
  { value: 'sample', label: 'Sample Request' },
  { value: 'custom', label: 'Custom Product Request' },
  { value: 'recurring', label: 'Recurring Shipment' },
];

const STATUSES = ['pending', 'reviewing', 'quoted', 'approved', 'in_progress', 'fulfilled', 'cancelled'];

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  reviewing: 'bg-blue-100 text-blue-700',
  quoted: 'bg-purple-100 text-purple-700',
  approved: 'bg-green-100 text-green-700',
  in_progress: 'bg-sky-100 text-sky-700',
  fulfilled: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
};

const EMPTY_FORM = {
  request_number: '', request_type: 'quote', customer_id: '', destination_country: '', destination_port: '',
  incoterms: 'FOB', currency: 'USD', required_by_date: '', valid_until: '',
  is_recurring: false, recurrence_interval: '', special_instructions: '', notes: '',
};

const ITEM_EMPTY = { product_id: '', variant_id: '', description: '', quantity: 1, unit: 'kg', unit_price: 0, packaging_type: '', special_requirements: '' };

function RequestDetail({ request, onBack }: { request: any; onBack: () => void }) {
  const { shopId } = useShopId();
  const { items, loading: loadingItems, create: createItem, remove: removeItem } = useExportRequestItems(request.id);
  const { update } = useExportRequests();
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [itemForm, setItemForm] = useState({ ...ITEM_EMPTY });
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    if (!shopId) return;
    supabase.from('export_products').select('id, name, category').eq('shop_id', shopId).then(({ data }) => setProducts(data || []));
  }, [shopId]);

  const handleAddItem = async () => {
    if (!itemForm.description) return;
    const ok = await createItem(itemForm);
    if (ok) { setItemDialogOpen(false); setItemForm({ ...ITEM_EMPTY }); }
  };

  const handleStatusChange = async (status: string) => {
    await update(request.id, { status, ...(status === 'approved' ? { approved_date: new Date().toISOString() } : {}) });
  };

  const totalValue = items.reduce((s: number, i: any) => s + (Number(i.quantity) * Number(i.unit_price)), 0);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">{request.request_number}</h1>
          <p className="text-sm text-muted-foreground">
            {REQUEST_TYPES.find(t => t.value === request.request_type)?.label || request.request_type}
            {' • '}
            {(request as any).export_customers?.company_name || 'No client'}
          </p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[request.status] || 'bg-gray-100 text-gray-700'}`}>{request.status}</span>
      </div>

      {/* Status actions */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUSES.filter(s => s !== request.status).slice(0, 3).map(s => (
          <Button key={s} variant="outline" size="sm" onClick={() => handleStatusChange(s)} className="shrink-0 text-xs capitalize">{s.replace('_', ' ')}</Button>
        ))}
      </div>

      {/* Summary */}
      <Card><CardContent className="p-4 grid grid-cols-2 gap-3 text-sm">
        <div><span className="text-muted-foreground">Country:</span> <span className="text-foreground">{request.destination_country || '—'}</span></div>
        <div><span className="text-muted-foreground">Port:</span> <span className="text-foreground">{request.destination_port || '—'}</span></div>
        <div><span className="text-muted-foreground">Incoterms:</span> <span className="text-foreground">{request.incoterms || 'FOB'}</span></div>
        <div><span className="text-muted-foreground">Currency:</span> <span className="text-foreground">{request.currency || 'USD'}</span></div>
        {request.required_by_date && <div><span className="text-muted-foreground">Required By:</span> <span className="text-foreground">{new Date(request.required_by_date).toLocaleDateString()}</span></div>}
        {request.valid_until && <div><span className="text-muted-foreground">Valid Until:</span> <span className="text-foreground">{new Date(request.valid_until).toLocaleDateString()}</span></div>}
        {request.is_recurring && <div className="col-span-2 flex items-center gap-1"><RefreshCw className="h-3 w-3 text-primary" /> <span className="text-foreground">Recurring: {request.recurrence_interval || '—'}</span></div>}
      </CardContent></Card>

      {/* Line items */}
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-foreground">Items ({items.length})</h3>
        <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Item</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Line Item</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Product</Label>
                <Select value={itemForm.product_id} onValueChange={v => {
                  const prod = products.find(p => p.id === v);
                  setItemForm(p => ({ ...p, product_id: v, description: prod?.name || p.description }));
                }}>
                  <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                  <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Description *</Label><Input value={itemForm.description} onChange={e => setItemForm(p => ({ ...p, description: e.target.value }))} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Quantity</Label><Input type="number" value={itemForm.quantity} onChange={e => setItemForm(p => ({ ...p, quantity: Number(e.target.value) }))} /></div>
                <div><Label>Unit</Label>
                  <Select value={itemForm.unit} onValueChange={v => setItemForm(p => ({ ...p, unit: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{['kg','lbs','tons','units','bags','boxes','pallets','containers'].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Unit Price</Label><Input type="number" step="0.01" value={itemForm.unit_price} onChange={e => setItemForm(p => ({ ...p, unit_price: Number(e.target.value) }))} /></div>
              </div>
              <div><Label>Packaging</Label><Input placeholder="e.g. 25kg bags" value={itemForm.packaging_type} onChange={e => setItemForm(p => ({ ...p, packaging_type: e.target.value }))} /></div>
              <div><Label>Special Requirements</Label><Textarea value={itemForm.special_requirements} onChange={e => setItemForm(p => ({ ...p, special_requirements: e.target.value }))} /></div>
              <Button onClick={handleAddItem} className="w-full">Add Item</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loadingItems ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : items.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No items added</p> : (
        <div className="space-y-2">
          {items.map((item: any) => (
            <Card key={item.id}><CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground text-sm">{item.description}</p>
                <p className="text-xs text-muted-foreground">
                  {Number(item.quantity).toLocaleString()} {item.unit} × ${Number(item.unit_price).toFixed(2)}
                  {item.packaging_type ? ` • ${item.packaging_type}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">${(Number(item.quantity) * Number(item.unit_price)).toFixed(2)}</span>
                <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </CardContent></Card>
          ))}
          <div className="flex justify-between text-sm font-semibold text-foreground border-t pt-2">
            <span>Total</span>
            <span>{request.currency || 'USD'} ${totalValue.toFixed(2)}</span>
          </div>
        </div>
      )}

      {request.special_instructions && (
        <Card><CardContent className="p-3">
          <p className="text-xs font-semibold text-muted-foreground mb-1">Special Instructions</p>
          <p className="text-sm text-foreground">{request.special_instructions}</p>
        </CardContent></Card>
      )}
    </div>
  );
}

export default function ExportRequestsPage() {
  const { shopId } = useShopId();
  const { requests, loading, create } = useExportRequests();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);

  useEffect(() => {
    if (!shopId) return;
    supabase.from('export_customers').select('id, company_name').eq('shop_id', shopId).eq('is_active', true).then(({ data }) => setCustomers(data || []));
  }, [shopId]);

  const handleCreate = async () => {
    if (!form.request_number || !form.request_type) return;
    const result = await create(form);
    if (result) { setDialogOpen(false); setForm({ ...EMPTY_FORM }); }
  };

  const filtered = requests
    .filter(r => filterType === 'all' || r.request_type === filterType)
    .filter(r =>
      r.request_number?.toLowerCase().includes(search.toLowerCase()) ||
      (r as any).export_customers?.company_name?.toLowerCase().includes(search.toLowerCase())
    );

  if (selectedRequest) return <RequestDetail request={selectedRequest} onBack={() => { setSelectedRequest(null); }} />;

  const getIcon = (type: string) => {
    switch (type) {
      case 'quote': return <FileText className="h-4 w-4" />;
      case 'purchase_order': return <Package className="h-4 w-4" />;
      case 'sample': return <Package className="h-4 w-4" />;
      case 'recurring': return <RefreshCw className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Requests</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> New Request</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Request</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Request # *</Label><Input value={form.request_number} onChange={e => setForm(p => ({ ...p, request_number: e.target.value }))} placeholder="REQ-001" /></div>
                <div><Label>Type *</Label>
                  <Select value={form.request_type} onValueChange={v => setForm(p => ({ ...p, request_type: v, is_recurring: v === 'recurring' }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{REQUEST_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Client</Label>
                <Select value={form.customer_id} onValueChange={v => setForm(p => ({ ...p, customer_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Destination Country</Label><Input value={form.destination_country} onChange={e => setForm(p => ({ ...p, destination_country: e.target.value }))} /></div>
                <div><Label>Destination Port</Label><Input value={form.destination_port} onChange={e => setForm(p => ({ ...p, destination_port: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Incoterms</Label>
                  <Select value={form.incoterms} onValueChange={v => setForm(p => ({ ...p, incoterms: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{['EXW','FCA','FOB','CFR','CIF','CPT','CIP','DAP','DDP'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Currency</Label>
                  <Select value={form.currency} onValueChange={v => setForm(p => ({ ...p, currency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{['USD','EUR','GBP','CAD','HTG'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Required By</Label><Input type="date" value={form.required_by_date} onChange={e => setForm(p => ({ ...p, required_by_date: e.target.value }))} /></div>
                <div><Label>Valid Until</Label><Input type="date" value={form.valid_until} onChange={e => setForm(p => ({ ...p, valid_until: e.target.value }))} /></div>
              </div>
              {form.request_type === 'recurring' && (
                <div><Label>Recurrence</Label>
                  <Select value={form.recurrence_interval} onValueChange={v => setForm(p => ({ ...p, recurrence_interval: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select interval" /></SelectTrigger>
                    <SelectContent>{['weekly','biweekly','monthly','quarterly','biannual','annual'].map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <div><Label>Special Instructions</Label><Textarea value={form.special_instructions} onChange={e => setForm(p => ({ ...p, special_instructions: e.target.value }))} /></div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
              <Button onClick={handleCreate} className="w-full">Create Request</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <Button variant={filterType === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilterType('all')}>All</Button>
        {REQUEST_TYPES.map(t => (
          <Button key={t.value} variant={filterType === t.value ? 'default' : 'outline'} size="sm" onClick={() => setFilterType(t.value)} className="shrink-0 text-xs">{t.label.split('/')[0].trim()}</Button>
        ))}
      </div>

      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search requests..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>

      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No requests found</p> : (
        <div className="space-y-3">
          {filtered.map(r => (
            <Card key={r.id} className="cursor-pointer active:scale-[0.98] transition-transform" onClick={() => setSelectedRequest(r)}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 text-white">
                  {getIcon(r.request_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground truncate">{r.request_number}</p>
                    <Badge variant="outline" className="text-[10px] shrink-0">{r.request_type?.replace('_', ' ')}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{(r as any).export_customers?.company_name || 'No client'} • {r.destination_country || 'N/A'}</p>
                  <p className="text-xs text-muted-foreground">{r.incoterms} • {r.currency} • {r.required_by_date ? `Due: ${new Date(r.required_by_date).toLocaleDateString()}` : ''}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-[10px] px-2 py-1 rounded-full ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-700'}`}>{r.status}</span>
                  {r.is_recurring && <RefreshCw className="h-3 w-3 text-primary mt-1 mx-auto" />}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
