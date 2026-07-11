import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useExportCurrencyRates } from '@/hooks/export/useExportCurrencyRates';
import { Loader2, Plus, ArrowRightLeft, TrendingUp, Trash2 } from 'lucide-react';

const currencies = ['USD', 'EUR', 'GBP', 'HTG', 'CAD', 'JPY', 'CNY', 'BRL', 'MXN', 'DOP', 'JMD'];

export default function ExportCurrencyRates() {
  const { rates, loading, create, remove, convert } = useExportCurrencyRates();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    base_currency: 'USD',
    target_currency: 'EUR',
    rate: '',
    effective_date: new Date().toISOString().split('T')[0],
    source: 'manual',
  });

  // Converter state
  const [convAmount, setConvAmount] = useState('100');
  const [convFrom, setConvFrom] = useState('USD');
  const [convTo, setConvTo] = useState('EUR');

  const handleCreate = async () => {
    const ok = await create({ ...form, rate: Number(form.rate) });
    if (ok) { setOpen(false); setForm({ ...form, rate: '' }); }
  };

  const convertedValue = convert(Number(convAmount || 0), convFrom, convTo);

  // Group rates by currency pair, show latest
  const latestRates = rates.reduce((acc: Record<string, any>, r) => {
    const key = `${r.base_currency}-${r.target_currency}`;
    if (!acc[key]) acc[key] = r;
    return acc;
  }, {});

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="h-6 w-6 text-foreground" />
          <h1 className="text-2xl font-bold text-foreground">Currency & Exchange</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white"><Plus className="h-4 w-4 mr-1" /> Add Rate</Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Add Exchange Rate</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Base</Label>
                  <Select value={form.base_currency} onValueChange={v => setForm(f => ({ ...f, base_currency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{currencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Target</Label>
                  <Select value={form.target_currency} onValueChange={v => setForm(f => ({ ...f, target_currency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{currencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Rate</Label><Input type="number" step="0.0001" placeholder="1.0850" value={form.rate} onChange={e => setForm(f => ({ ...f, rate: e.target.value }))} /></div>
              <div><Label>Effective Date</Label><Input type="date" value={form.effective_date} onChange={e => setForm(f => ({ ...f, effective_date: e.target.value }))} /></div>
              <Button className="w-full" onClick={handleCreate}>Save Rate</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick Converter */}
      <Card className="border-emerald-500/20 bg-emerald-500/5">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Quick Converter</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2 items-end">
            <div>
              <Label className="text-xs">Amount</Label>
              <Input type="number" value={convAmount} onChange={e => setConvAmount(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">From</Label>
              <Select value={convFrom} onValueChange={setConvFrom}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{currencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <Select value={convTo} onValueChange={setConvTo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{currencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="text-center py-2">
            {convertedValue !== null ? (
              <p className="text-xl font-bold text-foreground">{convTo} {convertedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            ) : (
              <p className="text-sm text-muted-foreground">{convFrom === convTo ? `${convTo} ${Number(convAmount).toLocaleString()}` : 'No rate available for this pair'}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active Rates */}
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Active Rates</h2>
      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : Object.values(latestRates).length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No exchange rates configured yet.</p>
      ) : (
        <div className="space-y-2">
          {Object.values(latestRates).map((r: any) => (
            <Card key={r.id}><CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{r.base_currency} → {r.target_currency}</p>
                  <p className="text-xs text-muted-foreground">Effective: {new Date(r.effective_date).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-lg font-bold text-foreground">{Number(r.rate).toFixed(4)}</p>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => remove(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}

      {/* Rate History */}
      {rates.length > Object.keys(latestRates).length && (
        <>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mt-4">Rate History</h2>
          <div className="space-y-1">
            {rates.filter(r => !Object.values(latestRates).some((lr: any) => lr.id === r.id)).slice(0, 20).map((r: any) => (
              <div key={r.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30">
                <span className="text-sm text-muted-foreground">{r.base_currency} → {r.target_currency}</span>
                <span className="text-sm text-foreground">{Number(r.rate).toFixed(4)}</span>
                <span className="text-xs text-muted-foreground">{new Date(r.effective_date).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
