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
import { Plus, Loader2 } from 'lucide-react';

export default function ExportQuotes() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ quote_number: '', destination_country: '', destination_port: '', incoterms: 'FOB', currency: 'USD', valid_until: '', notes: '' });

  const fetchData = async () => { if (!shopId) return; setLoading(true); const { data } = await supabase.from('export_quotes').select('*, export_customers(company_name)').eq('shop_id', shopId).order('created_at', { ascending: false }); setQuotes(data || []); setLoading(false); };
  useEffect(() => { fetchData(); }, [shopId]);

  const handleCreate = async () => {
    if (!shopId || !form.quote_number) return;
    const { error } = await supabase.from('export_quotes').insert({ ...form, shop_id: shopId, valid_until: form.valid_until || null });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Quote created' }); setDialogOpen(false); fetchData();
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Export Quotes</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> New Quote</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Proforma Quote</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Quote Number *</Label><Input value={form.quote_number} onChange={e => setForm(p => ({ ...p, quote_number: e.target.value }))} placeholder="QT-001" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Destination Country</Label><Input value={form.destination_country} onChange={e => setForm(p => ({ ...p, destination_country: e.target.value }))} /></div>
                <div><Label>Destination Port</Label><Input value={form.destination_port} onChange={e => setForm(p => ({ ...p, destination_port: e.target.value }))} /></div>
              </div>
              <div><Label>Valid Until</Label><Input type="date" value={form.valid_until} onChange={e => setForm(p => ({ ...p, valid_until: e.target.value }))} /></div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
              <Button onClick={handleCreate} className="w-full">Create Quote</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : quotes.length === 0 ? <p className="text-center text-muted-foreground py-8">No quotes found</p> : (
        <div className="space-y-3">
          {quotes.map(q => (
            <Card key={q.id}><CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">{q.quote_number}</p>
                <p className="text-sm text-muted-foreground">{(q as any).export_customers?.company_name || 'No customer'} • {q.destination_country || 'N/A'}</p>
                <p className="text-xs text-muted-foreground">{q.incoterms} • {q.currency} {Number(q.total || 0).toFixed(2)}{q.valid_until ? ` • Valid until: ${new Date(q.valid_until).toLocaleDateString()}` : ''}</p>
              </div>
              <Badge variant={q.status === 'accepted' ? 'default' : q.status === 'sent' ? 'secondary' : 'outline'}>{q.status}</Badge>
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}
