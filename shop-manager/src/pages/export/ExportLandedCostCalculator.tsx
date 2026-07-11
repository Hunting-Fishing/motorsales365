import React, { useState } from 'react';
import { useExportLandedCost } from '@/hooks/export/useExportLandedCost';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Calculator, Loader2, Trash2 } from 'lucide-react';

export default function ExportLandedCostCalculator() {
  const { calculations, loading, create, remove } = useExportLandedCost();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({ currency: 'USD', quantity: 1 });

  const handleSubmit = async () => {
    const ok = await create(form);
    if (ok) { setOpen(false); setForm({ currency: 'USD', quantity: 1 }); }
  };

  const fmt = (v: any) => Number(v || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

  // Live preview
  const previewTotal = (Number(form.product_cost || 0) * Number(form.quantity || 1)) + Number(form.freight_cost || 0) + Number(form.insurance_cost || 0) + (Number(form.product_cost || 0) * Number(form.quantity || 1) * Number(form.customs_duty_rate || 0) / 100) + Number(form.handling_cost || 0) + Number(form.other_costs || 0);
  const previewUnit = Number(form.quantity || 1) > 0 ? previewTotal / Number(form.quantity || 1) : 0;

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Landed Cost Calculator</h1>
          <p className="text-muted-foreground">Estimate total cost including freight, duty, and insurance</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />New Calculation</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Landed Cost Calculator</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
              <div><Label>Calculation Name</Label><Input value={form.calculation_name || ''} onChange={e => setForm({...form, calculation_name: e.target.value})} /></div>
              <div><Label>Product Name</Label><Input value={form.product_name || ''} onChange={e => setForm({...form, product_name: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Unit Cost</Label><Input type="number" value={form.product_cost || ''} onChange={e => setForm({...form, product_cost: Number(e.target.value)})} /></div>
                <div><Label>Quantity</Label><Input type="number" value={form.quantity} onChange={e => setForm({...form, quantity: Number(e.target.value)})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Freight</Label><Input type="number" value={form.freight_cost || ''} onChange={e => setForm({...form, freight_cost: Number(e.target.value)})} /></div>
                <div><Label>Insurance</Label><Input type="number" value={form.insurance_cost || ''} onChange={e => setForm({...form, insurance_cost: Number(e.target.value)})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Duty Rate %</Label><Input type="number" value={form.customs_duty_rate || ''} onChange={e => setForm({...form, customs_duty_rate: Number(e.target.value)})} /></div>
                <div><Label>Handling</Label><Input type="number" value={form.handling_cost || ''} onChange={e => setForm({...form, handling_cost: Number(e.target.value)})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Other Costs</Label><Input type="number" value={form.other_costs || ''} onChange={e => setForm({...form, other_costs: Number(e.target.value)})} /></div>
                <div><Label>HS Code</Label><Input value={form.hs_code || ''} onChange={e => setForm({...form, hs_code: e.target.value})} /></div>
              </div>
              <div><Label>Destination Country</Label><Input value={form.destination_country || ''} onChange={e => setForm({...form, destination_country: e.target.value})} /></div>
              {/* Live Preview */}
              <Card className="bg-muted/50">
                <CardContent className="pt-4 space-y-1 text-sm">
                  <div className="flex justify-between"><span>Product Cost</span><span>{fmt(Number(form.product_cost || 0) * Number(form.quantity || 1))}</span></div>
                  <div className="flex justify-between"><span>Freight</span><span>{fmt(form.freight_cost)}</span></div>
                  <div className="flex justify-between"><span>Insurance</span><span>{fmt(form.insurance_cost)}</span></div>
                  <div className="flex justify-between"><span>Duty ({form.customs_duty_rate || 0}%)</span><span>{fmt(Number(form.product_cost || 0) * Number(form.quantity || 1) * Number(form.customs_duty_rate || 0) / 100)}</span></div>
                  <div className="flex justify-between"><span>Handling + Other</span><span>{fmt(Number(form.handling_cost || 0) + Number(form.other_costs || 0))}</span></div>
                  <hr className="my-2" />
                  <div className="flex justify-between font-bold text-base"><span>Total Landed</span><span>{fmt(previewTotal)}</span></div>
                  <div className="flex justify-between font-semibold text-primary"><span>Unit Landed Cost</span><span>{fmt(previewUnit)}</span></div>
                </CardContent>
              </Card>
            </div>
            <Button onClick={handleSubmit} className="w-full">Save Calculation</Button>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5" />Saved Calculations</CardTitle></CardHeader>
        <CardContent>
          {calculations.length === 0 ? <p className="text-center py-8 text-muted-foreground">No calculations saved</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Name</TableHead><TableHead>Product</TableHead><TableHead>Destination</TableHead><TableHead className="text-right">Total Landed</TableHead><TableHead className="text-right">Unit Cost</TableHead><TableHead>Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {calculations.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.calculation_name}</TableCell>
                      <TableCell>{c.product_name}</TableCell>
                      <TableCell>{c.destination_country || '-'}</TableCell>
                      <TableCell className="text-right font-semibold">{fmt(c.total_landed_cost)}</TableCell>
                      <TableCell className="text-right text-primary font-semibold">{fmt(c.unit_landed_cost)}</TableCell>
                      <TableCell><Button variant="ghost" size="icon" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
