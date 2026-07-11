import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useImportInvoices } from '@/hooks/export/useImportInvoices';
import { Loader2, Plus, FileText, CheckCircle2 } from 'lucide-react';

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  approved: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  paid: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  partial: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  overdue: 'bg-red-500/10 text-red-600 border-red-500/20',
  disputed: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
};

export default function ImportInvoices() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const { invoices, loading, create, update } = useImportInvoices({ status: statusFilter });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    currency: 'USD',
    subtotal: '',
    tax: '',
    shipping: '',
    duties: '',
    status: 'pending',
    payment_method: '',
    notes: '',
  });

  const handleCreate = async () => {
    const ok = await create({
      ...form,
      subtotal: Number(form.subtotal || 0),
      tax: Number(form.tax || 0),
      shipping: Number(form.shipping || 0),
      duties: Number(form.duties || 0),
    });
    if (ok) { setOpen(false); setForm({ ...form, invoice_number: '', due_date: '', subtotal: '', tax: '', shipping: '', duties: '', notes: '' }); }
  };

  const totalPayable = invoices.filter(i => ['pending', 'approved'].includes(i.status)).reduce((s, i) => s + Number(i.total || 0), 0);
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total || 0), 0);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-blue-500" />
          <h1 className="text-2xl font-bold text-foreground">Import Invoices</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white"><Plus className="h-4 w-4 mr-1" /> New Invoice</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Record Supplier Invoice</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Invoice #</Label><Input value={form.invoice_number} onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Invoice Date</Label><Input type="date" value={form.invoice_date} onChange={e => setForm(f => ({ ...f, invoice_date: e.target.value }))} /></div>
                <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} /></div>
              </div>
              <div><Label>Currency</Label>
                <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem><SelectItem value="GBP">GBP</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Subtotal</Label><Input type="number" placeholder="0.00" value={form.subtotal} onChange={e => setForm(f => ({ ...f, subtotal: e.target.value }))} /></div>
                <div><Label>Tax</Label><Input type="number" placeholder="0.00" value={form.tax} onChange={e => setForm(f => ({ ...f, tax: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Shipping</Label><Input type="number" placeholder="0.00" value={form.shipping} onChange={e => setForm(f => ({ ...f, shipping: e.target.value }))} /></div>
                <div><Label>Duties</Label><Input type="number" placeholder="0.00" value={form.duties} onChange={e => setForm(f => ({ ...f, duties: e.target.value }))} /></div>
              </div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="partial">Partial</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
              <Button className="w-full" onClick={handleCreate}>Save Invoice</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="border-amber-500/20 bg-amber-500/5"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Payable</p>
          <p className="text-xl font-bold text-amber-600">${totalPayable.toLocaleString()}</p>
        </CardContent></Card>
        <Card className="border-emerald-500/20 bg-emerald-500/5"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Paid</p>
          <p className="text-xl font-bold text-emerald-600">${totalPaid.toLocaleString()}</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="all" onValueChange={v => setStatusFilter(v === 'all' ? undefined : v)}>
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="paid">Paid</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : invoices.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No import invoices yet.</p>
      ) : (
        <div className="space-y-3">
          {invoices.map(inv => (
            <Card key={inv.id}><CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-foreground">{inv.invoice_number}</p>
                  <p className="text-xs text-muted-foreground">{(inv as any).export_suppliers?.company_name || 'Unknown supplier'}</p>
                  {(inv as any).import_purchase_orders?.po_number && <p className="text-xs text-muted-foreground">PO: {(inv as any).import_purchase_orders.po_number}</p>}
                  <p className="text-xs text-muted-foreground">{new Date(inv.invoice_date).toLocaleDateString()}</p>
                  {inv.due_date && <p className="text-xs text-muted-foreground">Due: {new Date(inv.due_date).toLocaleDateString()}</p>}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-foreground">{inv.currency} {Number(inv.total || 0).toLocaleString()}</p>
                  {Number(inv.duties || 0) > 0 && <p className="text-xs text-muted-foreground">Duties: ${Number(inv.duties).toLocaleString()}</p>}
                  <Badge variant="outline" className={statusColors[inv.status] || ''}>{inv.status}</Badge>
                  {inv.status !== 'paid' && (
                    <Button size="sm" variant="ghost" className="mt-1 text-xs text-emerald-600" onClick={() => update(inv.id, { status: 'paid', payment_date: new Date().toISOString().split('T')[0] })}>
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Mark Paid
                    </Button>
                  )}
                </div>
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}
