import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Package, TrendingUp, TrendingDown, Loader2, Trash2, Edit, AlertTriangle, Boxes } from 'lucide-react';
import { useExportProductVariants, useCreateExportVariant, useDeleteExportVariant, ExportProductVariant } from '@/hooks/export/useExportProductVariants';
import { useExportPackagingTypes } from '@/hooks/export/useExportPackagingTypes';

interface ProductVariantsManagerProps {
  productId: string;
  productName: string;
}

const emptyVariant = {
  variant_name: '',
  sku: '',
  unit_of_measure: 'kg',
  weight_per_unit: '',
  packaging_type: '',
  units_per_package: '1',
  unit_price: '',
  purchase_cost_per_unit: '',
  shipping_cost_per_unit: '',
  customs_duty_per_unit: '',
  insurance_cost_per_unit: '',
  handling_fee_per_unit: '',
  packaging_cost_per_unit: '',
  inspection_cost_per_unit: '',
  current_stock: '',
  reorder_level: '',
  batch_number: '',
  lot_number: '',
  manufacture_date: '',
  expiry_date: '',
  notes: '',
};

export function ProductVariantsManager({ productId, productName }: ProductVariantsManagerProps) {
  const { data: variants = [], isLoading } = useExportProductVariants(productId);
  const createVariant = useCreateExportVariant();
  const deleteVariant = useDeleteExportVariant();
  const { types: packagingTypes, isLoading: packagingLoading, addType } = useExportPackagingTypes();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState(emptyVariant);
  const [addPkgOpen, setAddPkgOpen] = useState(false);
  const [newPkgName, setNewPkgName] = useState('');

  const u = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }));

  const handleSave = async () => {
    if (!form.variant_name) return;
    await createVariant.mutateAsync({
      product_id: productId,
      variant_name: form.variant_name,
      sku: form.sku || null,
      unit_of_measure: form.unit_of_measure,
      weight_per_unit: form.weight_per_unit ? Number(form.weight_per_unit) : null,
      packaging_type: form.packaging_type || null,
      units_per_package: Number(form.units_per_package) || 1,
      unit_price: Number(form.unit_price) || 0,
      purchase_cost_per_unit: Number(form.purchase_cost_per_unit) || 0,
      shipping_cost_per_unit: Number(form.shipping_cost_per_unit) || 0,
      customs_duty_per_unit: Number(form.customs_duty_per_unit) || 0,
      insurance_cost_per_unit: Number(form.insurance_cost_per_unit) || 0,
      handling_fee_per_unit: Number(form.handling_fee_per_unit) || 0,
      packaging_cost_per_unit: Number(form.packaging_cost_per_unit) || 0,
      inspection_cost_per_unit: Number(form.inspection_cost_per_unit) || 0,
      current_stock: Number(form.current_stock) || 0,
      reorder_level: Number(form.reorder_level) || 0,
      batch_number: form.batch_number || null,
      lot_number: form.lot_number || null,
      manufacture_date: form.manufacture_date || null,
      expiry_date: form.expiry_date || null,
      notes: form.notes || null,
    });
    setForm(emptyVariant);
    setSheetOpen(false);
  };

  // Live cost calc
  const calcLanded = () => {
    return ['purchase_cost_per_unit', 'shipping_cost_per_unit', 'customs_duty_per_unit',
      'insurance_cost_per_unit', 'handling_fee_per_unit', 'packaging_cost_per_unit', 'inspection_cost_per_unit']
      .reduce((s, k) => s + (Number((form as any)[k]) || 0), 0);
  };
  const landed = calcLanded();
  const sell = Number(form.unit_price) || 0;
  const margin = sell > 0 ? ((sell - landed) / sell * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Boxes className="h-4 w-4 text-emerald-600" /> Variants ({variants.length})
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setSheetOpen(true)} className="h-7 text-xs gap-1">
            <Plus className="h-3 w-3" /> Add
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : variants.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No variants yet. Add different sizes, grades, or packaging options.</p>
        ) : (
          variants.map(v => {
            const vMargin = Number(v.profit_margin_pct || 0);
            const vLanded = Number(v.landed_cost_per_unit || 0);
            const lowStock = v.current_stock <= v.reorder_level && v.reorder_level > 0;

            return (
              <div key={v.id} className="p-3 rounded-lg border bg-card space-y-1.5">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{v.variant_name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {v.sku && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{v.sku}</Badge>}
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{v.packaging_type || v.unit_of_measure}</Badge>
                      {v.weight_per_unit && <span className="text-[10px] text-muted-foreground">{v.weight_per_unit}{v.unit_of_measure}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-foreground">${Number(v.unit_price).toFixed(2)}</p>
                    <div className={`flex items-center gap-0.5 justify-end text-xs ${vMargin >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                      {vMargin >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      <span>{vMargin}%</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Cost: ${vLanded.toFixed(2)}</span>
                  <span>Stock: {Number(v.current_stock).toLocaleString()}</span>
                  {lowStock && (
                    <span className="flex items-center gap-0.5 text-amber-500">
                      <AlertTriangle className="h-3 w-3" /> Low
                    </span>
                  )}
                  {v.batch_number && <span>Batch: {v.batch_number}</span>}
                </div>
                {v.expiry_date && (
                  <p className="text-[10px] text-muted-foreground">Expires: {new Date(v.expiry_date).toLocaleDateString()}</p>
                )}
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-destructive"
                    onClick={() => deleteVariant.mutate({ id: v.id, productId })}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </CardContent>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-base">Add Variant — {productName}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3 pb-20">
            <div className="space-y-1.5">
              <Label className="text-xs">Variant Name *</Label>
              <Input value={form.variant_name} onChange={u('variant_name')} placeholder="e.g. Sea Salt 25kg Fine Grade" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">SKU</Label>
                <Input value={form.sku} onChange={u('sku')} placeholder="SALT-FG-25KG" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Packaging</Label>
                <div className="flex gap-1.5">
                  <Select value={form.packaging_type} onValueChange={v => setForm(p => ({ ...p, packaging_type: v }))}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {packagingTypes.map(t => (
                        <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={() => setAddPkgOpen(true)}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Weight/Unit</Label>
                <Input type="number" value={form.weight_per_unit} onChange={u('weight_per_unit')} placeholder="25" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Unit</Label>
                <Select value={form.unit_of_measure} onValueChange={v => setForm(p => ({ ...p, unit_of_measure: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="lb">lb</SelectItem>
                    <SelectItem value="ton">Ton</SelectItem>
                    <SelectItem value="bag">Bag</SelectItem>
                    <SelectItem value="unit">Unit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Units/Pkg</Label>
                <Input type="number" value={form.units_per_package} onChange={u('units_per_package')} placeholder="1" />
              </div>
            </div>

            {/* Pricing */}
            <div className="pt-2">
              <p className="text-xs font-medium text-muted-foreground mb-2">Pricing & Costs</p>
              {sell > 0 && (
                <div className={`p-2.5 rounded-lg text-xs mb-3 ${margin >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400' : 'bg-destructive/10 text-destructive'}`}>
                  <div className="flex justify-between font-medium">
                    <span>Margin: {margin.toFixed(1)}%</span>
                    <span>Profit: ${(sell - landed).toFixed(2)}</span>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Sell Price ($)</Label>
                  <Input type="number" value={form.unit_price} onChange={u('unit_price')} placeholder="0.00" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Purchase Cost</Label>
                  <Input type="number" value={form.purchase_cost_per_unit} onChange={u('purchase_cost_per_unit')} placeholder="0.00" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Shipping</Label>
                  <Input type="number" value={form.shipping_cost_per_unit} onChange={u('shipping_cost_per_unit')} placeholder="0.00" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Customs Duty</Label>
                  <Input type="number" value={form.customs_duty_per_unit} onChange={u('customs_duty_per_unit')} placeholder="0.00" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Insurance</Label>
                  <Input type="number" value={form.insurance_cost_per_unit} onChange={u('insurance_cost_per_unit')} placeholder="0.00" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Handling</Label>
                  <Input type="number" value={form.handling_fee_per_unit} onChange={u('handling_fee_per_unit')} placeholder="0.00" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Packaging</Label>
                  <Input type="number" value={form.packaging_cost_per_unit} onChange={u('packaging_cost_per_unit')} placeholder="0.00" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Inspection</Label>
                  <Input type="number" value={form.inspection_cost_per_unit} onChange={u('inspection_cost_per_unit')} placeholder="0.00" />
                </div>
              </div>
            </div>

            {/* Stock & Batch */}
            <div className="pt-2">
              <p className="text-xs font-medium text-muted-foreground mb-2">Stock & Batch</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Current Stock</Label>
                  <Input type="number" value={form.current_stock} onChange={u('current_stock')} placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Reorder Level</Label>
                  <Input type="number" value={form.reorder_level} onChange={u('reorder_level')} placeholder="0" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Batch #</Label>
                  <Input value={form.batch_number} onChange={u('batch_number')} placeholder="B-2026-001" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Lot #</Label>
                  <Input value={form.lot_number} onChange={u('lot_number')} placeholder="LOT-A1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Manufacture Date</Label>
                  <Input type="date" value={form.manufacture_date} onChange={u('manufacture_date')} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Expiry Date</Label>
                  <Input type="date" value={form.expiry_date} onChange={u('expiry_date')} />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea value={form.notes} onChange={u('notes')} rows={2} placeholder="Variant-specific notes..." />
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
              <Button onClick={handleSave} disabled={createVariant.isPending || !form.variant_name} className="w-full">
                {createVariant.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Add Variant
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={addPkgOpen} onOpenChange={setAddPkgOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Add Packaging Type</DialogTitle>
          </DialogHeader>
          <Input
            value={newPkgName}
            onChange={e => setNewPkgName(e.target.value)}
            placeholder="e.g. Vacuum Sealed Bag"
            autoFocus
          />
          <DialogFooter>
            <Button
              size="sm"
              disabled={!newPkgName.trim()}
              onClick={async () => {
                const result = await addType(newPkgName.trim());
                if (result) {
                  setForm(p => ({ ...p, packaging_type: result.name }));
                  setNewPkgName('');
                  setAddPkgOpen(false);
                }
              }}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
