import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, Plus, DollarSign, FileText, Loader2 } from 'lucide-react';
import { useShopId } from '@/hooks/useShopId';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function PersonalTrainerBilling() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ client_id: '', package_id: '', amount_paid: '', payment_method: 'card' });

  const { data: clients = [] } = useQuery({
    queryKey: ['pt-clients-list', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data } = await (supabase as any).from('pt_clients').select('id, first_name, last_name').eq('shop_id', shopId).order('first_name');
      return data || [];
    },
    enabled: !!shopId,
  });

  const { data: packages = [] } = useQuery({
    queryKey: ['pt-packages-active', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data } = await (supabase as any).from('pt_packages').select('*').eq('shop_id', shopId).eq('is_active', true);
      return data || [];
    },
    enabled: !!shopId,
  });

  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ['pt-client-packages', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data: shopClients } = await (supabase as any).from('pt_clients').select('id').eq('shop_id', shopId);
      if (!shopClients?.length) return [];
      const { data } = await (supabase as any).from('pt_client_packages')
        .select('*, pt_clients(first_name, last_name), pt_packages(name, price, sessions_included)')
        .in('client_id', shopClients.map((c: any) => c.id))
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!shopId,
  });

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['pt-invoices', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data } = await (supabase as any).from('pt_invoices')
        .select('*, pt_clients(first_name, last_name)')
        .eq('shop_id', shopId)
        .order('issue_date', { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!shopId,
  });

  const sellPackage = useMutation({
    mutationFn: async () => {
      const pkg = packages.find((p: any) => p.id === form.package_id);
      if (!pkg) throw new Error('Package not found');
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + (pkg.duration_days || 30));
      const { error } = await (supabase as any).from('pt_client_packages').insert({
        client_id: form.client_id,
        package_id: form.package_id,
        amount_paid: parseFloat(form.amount_paid) || pkg.price,
        sessions_remaining: pkg.sessions_included,
        expiry_date: expiry.toISOString().split('T')[0],
        payment_method: form.payment_method,
      });
      if (error) throw error;

      // Auto-create invoice
      const invoiceNum = `INV-${Date.now().toString(36).toUpperCase()}`;
      await (supabase as any).from('pt_invoices').insert({
        shop_id: shopId,
        client_id: form.client_id,
        invoice_number: invoiceNum,
        amount: parseFloat(form.amount_paid) || pkg.price,
        total: parseFloat(form.amount_paid) || pkg.price,
        status: 'paid',
        issue_date: new Date().toISOString().split('T')[0],
        paid_date: new Date().toISOString().split('T')[0],
        payment_method: form.payment_method,
        notes: `Package: ${pkg.name}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-client-packages'] });
      queryClient.invalidateQueries({ queryKey: ['pt-invoices'] });
      toast({ title: 'Package sold!' });
      setDialogOpen(false);
      setForm({ client_id: '', package_id: '', amount_paid: '', payment_method: 'card' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const markInvoicePaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('pt_invoices').update({
        status: 'paid', paid_date: new Date().toISOString().split('T')[0],
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-invoices'] });
      toast({ title: 'Invoice marked as paid' });
    },
  });

  const totalRevenue = purchases.reduce((sum: number, p: any) => sum + (Number(p.amount_paid) || 0), 0);
  const unpaidInvoices = invoices.filter((i: any) => i.status !== 'paid');

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Billing & Payments</h1>
          <p className="text-muted-foreground text-sm">Package sales, invoices, and revenue tracking</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-green-500 to-emerald-600 text-white"><Plus className="h-4 w-4 mr-2" />Sell Package</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Sell Package to Client</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Client *</Label>
                <Select value={form.client_id} onValueChange={v => setForm(f => ({ ...f, client_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>{clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Package *</Label>
                <Select value={form.package_id} onValueChange={v => {
                  const pkg = packages.find((p: any) => p.id === v);
                  setForm(f => ({ ...f, package_id: v, amount_paid: pkg?.price?.toString() || '' }));
                }}>
                  <SelectTrigger><SelectValue placeholder="Select package" /></SelectTrigger>
                  <SelectContent>{packages.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name} - ${Number(p.price).toFixed(2)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Amount Paid ($)</Label><Input type="number" step="0.01" value={form.amount_paid} onChange={e => setForm(f => ({ ...f, amount_paid: e.target.value }))} /></div>
                <div>
                  <Label>Payment Method</Label>
                  <Select value={form.payment_method} onValueChange={v => setForm(f => ({ ...f, payment_method: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="w-full" disabled={!form.client_id || !form.package_id || sellPackage.isPending} onClick={() => sellPackage.mutate()}>
                {sellPackage.isPending ? 'Processing...' : 'Complete Sale'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Revenue Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-600">${totalRevenue.toFixed(2)}</p><p className="text-xs text-muted-foreground">Total Revenue</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{purchases.length}</p><p className="text-xs text-muted-foreground">Packages Sold</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{invoices.length}</p><p className="text-xs text-muted-foreground">Total Invoices</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-amber-600">{unpaidInvoices.length}</p><p className="text-xs text-muted-foreground">Unpaid Invoices</p></CardContent></Card>
      </div>

      <Tabs defaultValue="packages">
        <TabsList>
          <TabsTrigger value="packages"><CreditCard className="h-4 w-4 mr-1" />Packages</TabsTrigger>
          <TabsTrigger value="invoices"><FileText className="h-4 w-4 mr-1" />Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="packages" className="mt-4">
          {isLoading ? (
            <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>
          ) : purchases.length === 0 ? (
            <Card className="border-dashed"><CardContent className="py-12 text-center text-muted-foreground"><CreditCard className="h-10 w-10 mx-auto mb-3 opacity-30" /><p>No purchases yet.</p></CardContent></Card>
          ) : (
            <div className="space-y-3">
              {purchases.map((p: any) => (
                <Card key={p.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{p.pt_clients?.first_name} {p.pt_clients?.last_name}</p>
                      <p className="text-sm text-muted-foreground">{p.pt_packages?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Purchased {format(new Date(p.purchase_date), 'MMM d, yyyy')}
                        {p.expiry_date && ` · Expires ${format(new Date(p.expiry_date), 'MMM d, yyyy')}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-bold flex items-center gap-1"><DollarSign className="h-4 w-4" />{Number(p.amount_paid).toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">{p.sessions_remaining} sessions left</p>
                      </div>
                      <Badge variant={p.status === 'active' ? 'default' : 'secondary'}>{p.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          {invoicesLoading ? (
            <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>
          ) : invoices.length === 0 ? (
            <Card className="border-dashed"><CardContent className="py-12 text-center text-muted-foreground"><FileText className="h-10 w-10 mx-auto mb-3 opacity-30" /><p>No invoices yet. Invoices are auto-generated when packages are sold.</p></CardContent></Card>
          ) : (
            <div className="space-y-3">
              {invoices.map((inv: any) => (
                <Card key={inv.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {inv.invoice_number}
                      </p>
                      <p className="text-sm text-muted-foreground">{inv.pt_clients?.first_name} {inv.pt_clients?.last_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Issued {format(new Date(inv.issue_date), 'MMM d, yyyy')}
                        {inv.due_date && ` · Due ${format(new Date(inv.due_date), 'MMM d, yyyy')}`}
                      </p>
                      {inv.notes && <p className="text-xs text-muted-foreground mt-1">{inv.notes}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-bold">${Number(inv.total).toFixed(2)}</p>
                        {inv.payment_method && <p className="text-xs text-muted-foreground capitalize">{inv.payment_method}</p>}
                      </div>
                      <Badge variant={inv.status === 'paid' ? 'default' : inv.status === 'overdue' ? 'destructive' : 'secondary'}>{inv.status}</Badge>
                      {inv.status !== 'paid' && (
                        <Button size="sm" variant="outline" onClick={() => markInvoicePaid.mutate(inv.id)}>Mark Paid</Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
