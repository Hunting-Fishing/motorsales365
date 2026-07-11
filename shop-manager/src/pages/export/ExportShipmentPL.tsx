import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useExportShipmentCosts } from '@/hooks/export/useExportShipmentCosts';
import { Loader2, Plus, TrendingUp, TrendingDown, DollarSign, Pencil, Trash2 } from 'lucide-react';

const costFields = [
  { key: 'product_cost', label: 'Product Cost' },
  { key: 'freight_cost', label: 'Freight' },
  { key: 'insurance_cost', label: 'Insurance' },
  { key: 'customs_duties', label: 'Customs Duties' },
  { key: 'handling_cost', label: 'Handling' },
  { key: 'packaging_cost', label: 'Packaging' },
  { key: 'commission_cost', label: 'Commission' },
  { key: 'banking_fees', label: 'Banking Fees' },
  { key: 'other_costs', label: 'Other' },
];

export default function ExportShipmentPL() {
  const { costs, loading, create, update, remove } = useExportShipmentCosts();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});

  const resetForm = () => { setForm({}); setEditId(null); };
  const openNew = () => { resetForm(); setOpen(true); };
  const openEdit = (c: any) => { setForm(c); setEditId(c.id); setOpen(true); };

  const handleSubmit = async () => {
    const ok = editId ? await update(editId, form) : await create(form);
    if (ok) { setOpen(false); resetForm(); }
  };

  const totalRevenue = costs.reduce((s, c) => s + (Number(c.revenue) || 0), 0);
  const totalProfit = costs.reduce((s, c) => s + (Number(c.profit) || 0), 0);
  const avgMargin = costs.length > 0 ? costs.reduce((s, c) => s + (Number(c.margin_pct) || 0), 0) / costs.length : 0;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-foreground" />
          <h1 className="text-2xl font-bold text-foreground">Shipment P&L</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />Add Record</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editId ? 'Edit' : 'Add'} Shipment Cost</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Shipment Ref *</Label><Input value={form.shipment_reference || ''} onChange={e => setForm({...form, shipment_reference: e.target.value})} /></div>
                <div><Label>Order Ref</Label><Input value={form.order_reference || ''} onChange={e => setForm({...form, order_reference: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Customer</Label><Input value={form.customer_name || ''} onChange={e => setForm({...form, customer_name: e.target.value})} /></div>
                <div><Label>Date</Label><Input type="date" value={form.shipment_date || ''} onChange={e => setForm({...form, shipment_date: e.target.value})} /></div>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-lg">
                <Label className="text-emerald-700 font-semibold">Revenue ($)</Label>
                <Input type="number" value={form.revenue || ''} onChange={e => setForm({...form, revenue: e.target.value})} className="mt-1" />
              </div>
              <p className="text-sm font-semibold text-muted-foreground">Cost Breakdown</p>
              <div className="grid grid-cols-2 gap-2">
                {costFields.map(f => (
                  <div key={f.key}><Label className="text-xs">{f.label}</Label><Input type="number" value={form[f.key] || ''} onChange={e => setForm({...form, [f.key]: e.target.value})} /></div>
                ))}
              </div>
              <Button className="w-full" onClick={handleSubmit}>{editId ? 'Update' : 'Add'} Record</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Revenue</p>
          <p className="text-lg font-bold text-foreground">${totalRevenue.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Profit</p>
          <p className={`text-lg font-bold ${totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>${totalProfit.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Avg Margin</p>
          <p className={`text-lg font-bold ${avgMargin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{avgMargin.toFixed(1)}%</p>
        </CardContent></Card>
      </div>

      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : costs.length === 0 ? (
        <Card><CardContent className="p-8 text-center">
          <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-lg font-semibold text-foreground">No Cost Records</p>
          <p className="text-sm text-muted-foreground">Track per-shipment profitability with detailed cost breakdowns.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {costs.map(c => {
            const profit = Number(c.profit) || 0;
            const margin = Number(c.margin_pct) || 0;
            return (
              <Card key={c.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{c.shipment_reference}</p>
                      <p className="text-sm text-muted-foreground">{c.customer_name || 'No customer'} {c.shipment_date ? `• ${c.shipment_date}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          {profit >= 0 ? <TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> : <TrendingDown className="h-3.5 w-3.5 text-red-500" />}
                          <span className={`font-bold ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>${Math.abs(profit).toLocaleString()}</span>
                        </div>
                        <Badge variant={margin >= 15 ? 'default' : margin >= 0 ? 'secondary' : 'destructive'} className="text-xs">{margin.toFixed(1)}%</Badge>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(c.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                    <span>Revenue: ${Number(c.revenue || 0).toLocaleString()}</span>
                    <span>Cost: ${Number(c.total_cost || 0).toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
