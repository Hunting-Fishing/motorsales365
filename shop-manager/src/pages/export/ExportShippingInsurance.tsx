import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useExportShippingInsurance } from '@/hooks/export/useExportShippingInsurance';
import { Loader2, Plus, Shield, AlertTriangle } from 'lucide-react';

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  expired: 'bg-red-500/10 text-red-600 border-red-500/20',
  claimed: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  cancelled: 'bg-muted text-muted-foreground',
};

export default function ExportShippingInsurance() {
  const { policies, loading, create, update } = useExportShippingInsurance();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    policy_number: '',
    insurance_provider: '',
    coverage_type: 'all_risk',
    insured_value: '',
    premium: '',
    deductible: '',
    currency: 'USD',
    effective_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    status: 'active',
    notes: '',
  });

  const handleCreate = async () => {
    const ok = await create({
      ...form,
      insured_value: Number(form.insured_value || 0),
      premium: Number(form.premium || 0),
      deductible: Number(form.deductible || 0),
    });
    if (ok) { setOpen(false); setForm({ ...form, policy_number: '', insurance_provider: '', insured_value: '', premium: '', deductible: '', expiry_date: '', notes: '' }); }
  };

  const totalCoverage = policies.filter(p => p.status === 'active').reduce((s, p) => s + Number(p.insured_value || 0), 0);
  const totalPremiums = policies.filter(p => p.status === 'active').reduce((s, p) => s + Number(p.premium || 0), 0);
  const activeClaims = policies.filter(p => p.claim_filed);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-foreground" />
          <h1 className="text-2xl font-bold text-foreground">Shipping Insurance</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white"><Plus className="h-4 w-4 mr-1" /> New Policy</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add Insurance Policy</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Policy Number</Label><Input value={form.policy_number} onChange={e => setForm(f => ({ ...f, policy_number: e.target.value }))} /></div>
              <div><Label>Provider</Label><Input value={form.insurance_provider} onChange={e => setForm(f => ({ ...f, insurance_provider: e.target.value }))} /></div>
              <div><Label>Coverage Type</Label>
                <Select value={form.coverage_type} onValueChange={v => setForm(f => ({ ...f, coverage_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_risk">All Risk</SelectItem>
                    <SelectItem value="named_perils">Named Perils</SelectItem>
                    <SelectItem value="total_loss">Total Loss Only</SelectItem>
                    <SelectItem value="war_risk">War Risk</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Insured Value</Label><Input type="number" placeholder="0.00" value={form.insured_value} onChange={e => setForm(f => ({ ...f, insured_value: e.target.value }))} /></div>
                <div><Label>Premium</Label><Input type="number" placeholder="0.00" value={form.premium} onChange={e => setForm(f => ({ ...f, premium: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Deductible</Label><Input type="number" placeholder="0.00" value={form.deductible} onChange={e => setForm(f => ({ ...f, deductible: e.target.value }))} /></div>
                <div><Label>Currency</Label>
                  <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem><SelectItem value="GBP">GBP</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Effective Date</Label><Input type="date" value={form.effective_date} onChange={e => setForm(f => ({ ...f, effective_date: e.target.value }))} /></div>
                <div><Label>Expiry Date</Label><Input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} /></div>
              </div>
              <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
              <Button className="w-full" onClick={handleCreate}>Save Policy</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="border-emerald-500/20 bg-emerald-500/5"><CardContent className="p-3">
          <p className="text-xs text-muted-foreground">Coverage</p>
          <p className="text-lg font-bold text-foreground">${totalCoverage.toLocaleString()}</p>
        </CardContent></Card>
        <Card className="border-blue-500/20 bg-blue-500/5"><CardContent className="p-3">
          <p className="text-xs text-muted-foreground">Premiums</p>
          <p className="text-lg font-bold text-foreground">${totalPremiums.toLocaleString()}</p>
        </CardContent></Card>
        <Card className="border-amber-500/20 bg-amber-500/5"><CardContent className="p-3">
          <p className="text-xs text-muted-foreground">Claims</p>
          <p className="text-lg font-bold text-amber-600">{activeClaims.length}</p>
        </CardContent></Card>
      </div>

      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : policies.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No insurance policies yet.</p>
      ) : (
        <div className="space-y-3">
          {policies.map(p => (
            <Card key={p.id}><CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-foreground">{p.insurance_provider}</p>
                  <p className="text-xs text-muted-foreground">Policy: {p.policy_number || 'N/A'}</p>
                  <p className="text-xs text-muted-foreground">{p.coverage_type?.replace(/_/g, ' ')}</p>
                  {(p as any).export_shipments?.shipment_number && <p className="text-xs text-blue-500">Shipment: {(p as any).export_shipments.shipment_number}</p>}
                  <p className="text-xs text-muted-foreground">{new Date(p.effective_date).toLocaleDateString()} – {new Date(p.expiry_date).toLocaleDateString()}</p>
                  {p.claim_filed && (
                    <div className="flex items-center gap-1 mt-1 text-amber-500 text-xs"><AlertTriangle className="h-3 w-3" /> Claim: {p.claim_status} — ${Number(p.claim_amount || 0).toLocaleString()}</div>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-foreground">{p.currency} {Number(p.insured_value || 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Premium: ${Number(p.premium || 0).toLocaleString()}</p>
                  <Badge variant="outline" className={statusColors[p.status] || ''}>{p.status}</Badge>
                  {!p.claim_filed && p.status === 'active' && (
                    <Button size="sm" variant="ghost" className="mt-1 text-xs text-amber-600" onClick={() => update(p.id, { claim_filed: true, claim_status: 'filed', claim_date: new Date().toISOString().split('T')[0] })}>
                      File Claim
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
