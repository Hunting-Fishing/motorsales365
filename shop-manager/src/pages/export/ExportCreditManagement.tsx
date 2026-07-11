import React, { useState } from 'react';
import { useExportCreditManagement } from '@/hooks/export/useExportCreditManagement';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, CreditCard, Trash2, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

const statusColors: Record<string, string> = {
  approved: 'bg-green-500/10 text-green-700 border-green-500/30',
  on_hold: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30',
  suspended: 'bg-red-500/10 text-red-700 border-red-500/30',
  under_review: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
};

export default function ExportCreditManagement() {
  const { credits, loading, create, update, remove } = useExportCreditManagement();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({ credit_status: 'approved' });

  const handleSubmit = async () => {
    const ok = await create(form);
    if (ok) { setOpen(false); setForm({ credit_status: 'approved' }); }
  };

  if (loading) return <div className="p-4 space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>;

  const totalExposure = credits.reduce((s, c) => s + Number(c.current_exposure || 0), 0);
  const totalOverdue = credits.reduce((s, c) => s + Number(c.overdue_amount || 0), 0);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Credit Management</h1>
          <p className="text-sm text-muted-foreground">Exposure: ${totalExposure.toLocaleString()} · Overdue: ${totalOverdue.toLocaleString()}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Customer</Button></DialogTrigger>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add Credit Record</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Customer Name</Label><Input value={form.customer_name || ''} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} /></div>
              <div><Label>Credit Limit</Label><Input type="number" value={form.credit_limit || ''} onChange={e => setForm(f => ({ ...f, credit_limit: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Credit Rating</Label>
                  <Select value={form.credit_rating || ''} onValueChange={v => setForm(f => ({ ...f, credit_rating: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">A - Excellent</SelectItem>
                      <SelectItem value="B">B - Good</SelectItem>
                      <SelectItem value="C">C - Fair</SelectItem>
                      <SelectItem value="D">D - Poor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Payment Terms (days)</Label><Input type="number" value={form.payment_terms_days || 30} onChange={e => setForm(f => ({ ...f, payment_terms_days: parseInt(e.target.value) }))} /></div>
              </div>
              <div><Label>Notes</Label><Textarea value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
              <Button onClick={handleSubmit} className="w-full">Add Credit Record</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {credits.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><CreditCard className="h-10 w-10 mx-auto mb-2 opacity-40" />No credit records yet</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {credits.map(c => {
            const limit = Number(c.credit_limit) || 1;
            const exposure = Number(c.current_exposure) || 0;
            const utilization = Math.min((exposure / limit) * 100, 100);
            return (
              <Card key={c.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm truncate">{c.customer_name}</span>
                        <Badge variant="outline" className={statusColors[c.credit_status] || ''}>{c.credit_status.replace('_', ' ')}</Badge>
                        {c.credit_rating && <Badge variant="secondary">{c.credit_rating}</Badge>}
                      </div>
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Exposure: ${exposure.toLocaleString()}</span>
                          <span>Limit: ${limit.toLocaleString()}</span>
                        </div>
                        <Progress value={utilization} className="h-2" />
                      </div>
                      {Number(c.overdue_amount) > 0 && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-destructive">
                          <AlertTriangle className="h-3 w-3" />
                          ${Number(c.overdue_amount).toLocaleString()} overdue ({c.overdue_invoices} invoices)
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">{c.payment_terms_days}d terms</p>
                    </div>
                    <div className="flex gap-1">
                      {c.credit_status === 'approved' && Number(c.overdue_amount) > 0 && (
                        <Button size="sm" variant="destructive" onClick={() => update(c.id, { credit_status: 'on_hold' })}>Hold</Button>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
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
