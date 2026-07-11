import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2, Receipt } from 'lucide-react';

export default function ExportInvoices() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [form, setForm] = useState({ invoice_number: '', invoice_type: 'commercial', customer_id: '', issue_date: new Date().toISOString().split('T')[0], due_date: '', currency: 'USD', payment_terms: 'Net 30', notes: '' });

  const fetchData = async () => { if (!shopId) return; setLoading(true); const [inv, cust] = await Promise.all([supabase.from('export_invoices').select('*, export_customers(company_name)').eq('shop_id', shopId).order('created_at', { ascending: false }), supabase.from('export_customers').select('id, company_name').eq('shop_id', shopId)]); setInvoices(inv.data || []); setCustomers(cust.data || []); setLoading(false); };
  useEffect(() => { fetchData(); }, [shopId]);

  const handleCreate = async () => {
    if (!shopId || !form.invoice_number) return;
    const { error } = await supabase.from('export_invoices').insert({ ...form, shop_id: shopId, customer_id: form.customer_id || null, due_date: form.due_date || null });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Invoice created' }); setDialogOpen(false); fetchData();
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Export Invoices</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> New Invoice</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Invoice</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Invoice Number *</Label><Input value={form.invoice_number} onChange={e => setForm(p => ({ ...p, invoice_number: e.target.value }))} placeholder="INV-001" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Issue Date</Label><Input type="date" value={form.issue_date} onChange={e => setForm(p => ({ ...p, issue_date: e.target.value }))} /></div>
                <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} /></div>
              </div>
              <div><Label>Payment Terms</Label><Input value={form.payment_terms} onChange={e => setForm(p => ({ ...p, payment_terms: e.target.value }))} /></div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
              <Button onClick={handleCreate} className="w-full">Create Invoice</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : invoices.length === 0 ? <p className="text-center text-muted-foreground py-8">No invoices found</p> : (
        <div className="space-y-3">
          {invoices.map(inv => (
            <Card key={inv.id}><CardContent className="p-4 flex items-center gap-4">
              <Receipt className="h-6 w-6 text-purple-500" />
              <div className="flex-1">
                <p className="font-semibold text-foreground">{inv.invoice_number}</p>
                <p className="text-sm text-muted-foreground">{(inv as any).export_customers?.company_name || 'No customer'} • {inv.invoice_type}</p>
                <p className="text-xs text-muted-foreground">{inv.currency} {Number(inv.total || 0).toFixed(2)} • Due: {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'N/A'}</p>
              </div>
              <Badge variant={inv.status === 'paid' ? 'default' : inv.status === 'sent' ? 'secondary' : 'outline'}>{inv.status}</Badge>
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}
