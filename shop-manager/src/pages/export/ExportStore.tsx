import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, Search, ShoppingCart, Star, ExternalLink, Trash2 } from 'lucide-react';
import { useExportStoreItems } from '@/hooks/export/useExportStoreItems';

const CATEGORIES = ['packaging', 'equipment', 'supplies', 'tools', 'safety', 'general'];

export default function ExportStore() {
  const { items, loading, create, remove } = useExportStoreItems();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [form, setForm] = useState({
    item_name: '', description: '', category: 'general', price: 0, currency: 'USD',
    supplier_name: '', supplier_url: '', affiliate_url: '', is_featured: false,
  });

  const handleSubmit = async () => {
    if (!form.item_name.trim()) return;
    const ok = await create(form);
    if (ok) { setOpen(false); setForm({ item_name: '', description: '', category: 'general', price: 0, currency: 'USD', supplier_name: '', supplier_url: '', affiliate_url: '', is_featured: false }); }
  };

  const filtered = items.filter(i => {
    const q = search.toLowerCase();
    const matchSearch = i.item_name.toLowerCase().includes(q) || (i.supplier_name || '').toLowerCase().includes(q);
    const matchCat = catFilter === 'all' || i.category === catFilter;
    return matchSearch && matchCat;
  });

  const featured = filtered.filter(i => i.is_featured);
  const regular = filtered.filter(i => !i.is_featured);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-6 w-6 text-foreground" />
          <h1 className="text-2xl font-bold text-foreground">Export Store</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Item</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Store Item</DialogTitle></DialogHeader>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              <div><Label>Item Name *</Label><Input value={form.item_name} onChange={e => setForm(f => ({ ...f, item_name: e.target.value }))} /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Price</Label><Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))} /></div>
                  <div><Label>Currency</Label><Input value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} /></div>
                </div>
              </div>
              <div><Label>Supplier Name</Label><Input value={form.supplier_name} onChange={e => setForm(f => ({ ...f, supplier_name: e.target.value }))} /></div>
              <div><Label>Supplier URL</Label><Input value={form.supplier_url} onChange={e => setForm(f => ({ ...f, supplier_url: e.target.value }))} /></div>
              <div><Label>Affiliate / Purchase URL</Label><Input value={form.affiliate_url} onChange={e => setForm(f => ({ ...f, affiliate_url: e.target.value }))} /></div>
              <Button onClick={handleSubmit} className="w-full">Add Item</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search items..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {featured.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-amber-500 uppercase tracking-wider flex items-center gap-1"><Star className="h-3.5 w-3.5" /> Featured</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {featured.map(item => <StoreItemCard key={item.id} item={item} onRemove={remove} />)}
          </div>
        </div>
      )}

      {regular.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {regular.map(item => <StoreItemCard key={item.id} item={item} onRemove={remove} />)}
        </div>
      )}

      {filtered.length === 0 && (
        <Card><CardContent className="p-8 text-center">
          <ShoppingCart className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No store items found. Add recommended equipment and supplies.</p>
        </CardContent></Card>
      )}
    </div>
  );
}

function StoreItemCard({ item, onRemove }: { item: any; onRemove: (id: string) => void }) {
  return (
    <Card className={item.is_featured ? 'border-amber-500/30' : ''}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold text-foreground">{item.item_name}</p>
            {item.supplier_name && <p className="text-xs text-muted-foreground">by {item.supplier_name}</p>}
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-[10px]">{item.category}</Badge>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => onRemove(item.id)}><Trash2 className="h-3 w-3" /></Button>
          </div>
        </div>
        {item.description && <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>}
        <div className="flex items-center justify-between">
          <p className="text-lg font-bold text-foreground">{item.currency} {Number(item.price).toLocaleString()}</p>
          {item.affiliate_url && (
            <Button size="sm" variant="outline" asChild>
              <a href={item.affiliate_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3 mr-1" />View</a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
