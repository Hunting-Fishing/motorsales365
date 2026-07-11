import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Plus, Loader2, Trash2, FlaskConical, AlertTriangle, Leaf, ShieldAlert, Truck } from 'lucide-react';
import {
  useExportProductIngredients,
  useCreateExportIngredient,
  useDeleteExportIngredient,
  useIngredientShipments,
  useCreateIngredientShipment,
} from '@/hooks/export/useExportProductIngredients';

interface ProductIngredientsManagerProps {
  productId: string;
  productName: string;
}

const emptyIngredient = {
  ingredient_name: '',
  percentage: '',
  cost_per_unit: '',
  unit_of_measure: 'kg',
  supplier_name: '',
  supplier_country: '',
  supplier_contact: '',
  country_of_origin: '',
  grade: '',
  is_allergen: false,
  is_organic: false,
  cas_number: '',
  avg_lead_time_days: '',
  current_stock: '',
  reorder_level: '',
  notes: '',
};

const emptyShipment = {
  shipment_date: new Date().toISOString().split('T')[0],
  quantity: '',
  unit_cost: '',
  shipping_cost: '',
  supplier_name: '',
  manufacturer_name: '',
  manufacturer_country: '',
  tracking_number: '',
  batch_number: '',
  lot_number: '',
  expiry_date: '',
  quality_grade: '',
  status: 'ordered',
  notes: '',
};

export function ProductIngredientsManager({ productId, productName }: ProductIngredientsManagerProps) {
  const { data: ingredients = [], isLoading } = useExportProductIngredients(productId);
  const createIngredient = useCreateExportIngredient();
  const deleteIngredient = useDeleteExportIngredient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState(emptyIngredient);
  const [selectedIngredient, setSelectedIngredient] = useState<string | null>(null);
  const [shipmentSheetOpen, setShipmentSheetOpen] = useState(false);
  const [shipmentForm, setShipmentForm] = useState(emptyShipment);

  const { data: shipments = [] } = useIngredientShipments(selectedIngredient);
  const createShipment = useCreateIngredientShipment();

  const totalPct = ingredients.reduce((s, i) => s + Number(i.percentage || 0), 0);
  const totalCost = ingredients.reduce((s, i) => s + Number(i.cost_per_unit || 0) * (Number(i.percentage || 0) / 100), 0);

  const u = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }));

  const us = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setShipmentForm(p => ({ ...p, [field]: e.target.value }));

  const handleSaveIngredient = async () => {
    if (!form.ingredient_name) return;
    await createIngredient.mutateAsync({
      product_id: productId,
      ingredient_name: form.ingredient_name,
      percentage: form.percentage ? Number(form.percentage) : null,
      cost_per_unit: Number(form.cost_per_unit) || 0,
      unit_of_measure: form.unit_of_measure,
      supplier_name: form.supplier_name || null,
      supplier_country: form.supplier_country || null,
      supplier_contact: form.supplier_contact || null,
      country_of_origin: form.country_of_origin || null,
      grade: form.grade || null,
      is_allergen: form.is_allergen,
      is_organic: form.is_organic,
      cas_number: form.cas_number || null,
      avg_lead_time_days: form.avg_lead_time_days ? Number(form.avg_lead_time_days) : null,
      current_stock: Number(form.current_stock) || 0,
      reorder_level: Number(form.reorder_level) || 0,
      notes: form.notes || null,
    });
    setForm(emptyIngredient);
    setSheetOpen(false);
  };

  const handleSaveShipment = async () => {
    if (!selectedIngredient || !shipmentForm.quantity) return;
    await createShipment.mutateAsync({
      ingredient_id: selectedIngredient,
      shipment_date: shipmentForm.shipment_date,
      quantity: Number(shipmentForm.quantity),
      unit_cost: Number(shipmentForm.unit_cost) || 0,
      shipping_cost: Number(shipmentForm.shipping_cost) || 0,
      supplier_name: shipmentForm.supplier_name || null,
      manufacturer_name: shipmentForm.manufacturer_name || null,
      manufacturer_country: shipmentForm.manufacturer_country || null,
      tracking_number: shipmentForm.tracking_number || null,
      batch_number: shipmentForm.batch_number || null,
      lot_number: shipmentForm.lot_number || null,
      expiry_date: shipmentForm.expiry_date || null,
      quality_grade: shipmentForm.quality_grade || null,
      status: shipmentForm.status,
      notes: shipmentForm.notes || null,
    });
    setShipmentForm(emptyShipment);
    setShipmentSheetOpen(false);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-emerald-600" /> Ingredients ({ingredients.length})
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setSheetOpen(true)} className="h-7 text-xs gap-1">
            <Plus className="h-3 w-3" /> Add
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Composition Summary */}
        {ingredients.length > 0 && (
          <div className="p-2.5 rounded-lg bg-muted/50 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Total Composition</span>
              <span className={`font-medium ${totalPct > 100 ? 'text-destructive' : totalPct === 100 ? 'text-emerald-600' : 'text-foreground'}`}>
                {totalPct.toFixed(1)}%
              </span>
            </div>
            <Progress value={Math.min(totalPct, 100)} className="h-1.5" />
            <p className="text-[10px] text-muted-foreground">
              Ingredient cost contribution: ${totalCost.toFixed(2)}/unit
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : ingredients.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No ingredients tracked. Add the composition of this product.</p>
        ) : (
          ingredients.map(ing => {
            const lowStock = ing.current_stock <= ing.reorder_level && ing.reorder_level > 0;
            return (
              <div key={ing.id} className="p-3 rounded-lg border bg-card space-y-1.5">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-sm text-foreground truncate">{ing.ingredient_name}</p>
                      {ing.is_allergen && <ShieldAlert className="h-3 w-3 text-destructive shrink-0" />}
                      {ing.is_organic && <Leaf className="h-3 w-3 text-emerald-500 shrink-0" />}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {ing.grade && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{ing.grade}</Badge>}
                      {ing.country_of_origin && <span className="text-[10px] text-muted-foreground">{ing.country_of_origin}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-foreground">{ing.percentage || '—'}%</p>
                    <p className="text-[10px] text-muted-foreground">${Number(ing.cost_per_unit).toFixed(2)}/{ing.unit_of_measure}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {ing.supplier_name && <span>Supplier: {ing.supplier_name}</span>}
                  <span>Stock: {Number(ing.current_stock).toLocaleString()}</span>
                  {lowStock && (
                    <span className="flex items-center gap-0.5 text-amber-500">
                      <AlertTriangle className="h-3 w-3" /> Low
                    </span>
                  )}
                </div>
                {ing.last_shipment_date && (
                  <p className="text-[10px] text-muted-foreground">Last shipment: {new Date(ing.last_shipment_date).toLocaleDateString()}</p>
                )}
                <div className="flex justify-end gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs px-2"
                    onClick={() => { setSelectedIngredient(ing.id); setShipmentSheetOpen(true); }}
                  >
                    <Truck className="h-3 w-3 mr-1" /> Log Shipment
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-destructive"
                    onClick={() => deleteIngredient.mutate({ id: ing.id, productId })}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </CardContent>

      {/* Add Ingredient Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-base">Add Ingredient — {productName}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3 pb-20">
            <div className="space-y-1.5">
              <Label className="text-xs">Ingredient Name *</Label>
              <Input value={form.ingredient_name} onChange={u('ingredient_name')} placeholder="e.g. Sodium Chloride" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Percentage %</Label>
                <Input type="number" value={form.percentage} onChange={u('percentage')} placeholder="95" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Cost/Unit</Label>
                <Input type="number" value={form.cost_per_unit} onChange={u('cost_per_unit')} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Unit</Label>
                <Select value={form.unit_of_measure} onValueChange={v => setForm(p => ({ ...p, unit_of_measure: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="lb">lb</SelectItem>
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="oz">oz</SelectItem>
                    <SelectItem value="liter">L</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Grade</Label>
                <Input value={form.grade} onChange={u('grade')} placeholder="Food Grade / Industrial" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">CAS Number</Label>
                <Input value={form.cas_number} onChange={u('cas_number')} placeholder="7647-14-5" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Country of Origin</Label>
              <Input value={form.country_of_origin} onChange={u('country_of_origin')} placeholder="Haiti" />
            </div>

            {/* Supplier */}
            <div className="pt-2">
              <p className="text-xs font-medium text-muted-foreground mb-2">Supplier</p>
              <div className="space-y-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Supplier Name</Label>
                  <Input value={form.supplier_name} onChange={u('supplier_name')} placeholder="Salt Mine Co." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Country</Label>
                    <Input value={form.supplier_country} onChange={u('supplier_country')} placeholder="Haiti" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Lead Time (days)</Label>
                    <Input type="number" value={form.avg_lead_time_days} onChange={u('avg_lead_time_days')} placeholder="14" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Contact</Label>
                  <Input value={form.supplier_contact} onChange={u('supplier_contact')} placeholder="Phone / email" />
                </div>
              </div>
            </div>

            {/* Stock */}
            <div className="pt-2">
              <p className="text-xs font-medium text-muted-foreground mb-2">Stock</p>
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
            </div>

            {/* Flags */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="text-sm font-medium text-foreground">Allergen</p>
                  <p className="text-xs text-muted-foreground">Contains common allergens</p>
                </div>
                <Switch checked={form.is_allergen} onCheckedChange={v => setForm(p => ({ ...p, is_allergen: v }))} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="text-sm font-medium text-foreground">Organic</p>
                  <p className="text-xs text-muted-foreground">Certified organic ingredient</p>
                </div>
                <Switch checked={form.is_organic} onCheckedChange={v => setForm(p => ({ ...p, is_organic: v }))} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea value={form.notes} onChange={u('notes')} rows={2} placeholder="Additional details..." />
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
              <Button onClick={handleSaveIngredient} disabled={createIngredient.isPending || !form.ingredient_name} className="w-full">
                {createIngredient.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Add Ingredient
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Shipment Log Sheet */}
      <Sheet open={shipmentSheetOpen} onOpenChange={setShipmentSheetOpen}>
        <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-base">Log Ingredient Shipment</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3 pb-20">
            {/* Past shipments */}
            {shipments.length > 0 && (
              <div className="space-y-1.5 mb-4">
                <p className="text-xs font-medium text-muted-foreground">Recent Shipments</p>
                {shipments.slice(0, 5).map(s => (
                  <div key={s.id} className="p-2 rounded border text-xs flex items-center justify-between">
                    <div>
                      <span className="font-medium text-foreground">{new Date(s.shipment_date).toLocaleDateString()}</span>
                      <span className="text-muted-foreground ml-2">Qty: {Number(s.quantity).toLocaleString()}</span>
                      {s.manufacturer_name && <span className="text-muted-foreground ml-2">from {s.manufacturer_name}</span>}
                    </div>
                    <div className="text-right">
                      <Badge variant={s.status === 'delivered' ? 'default' : 'secondary'} className="text-[10px]">{s.status}</Badge>
                      <p className="text-muted-foreground mt-0.5">${Number(s.total_cost || 0).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Shipment Date *</Label>
                <Input type="date" value={shipmentForm.shipment_date} onChange={us('shipment_date')} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Quantity *</Label>
                <Input type="number" value={shipmentForm.quantity} onChange={us('quantity')} placeholder="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Unit Cost ($)</Label>
                <Input type="number" value={shipmentForm.unit_cost} onChange={us('unit_cost')} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Shipping Cost ($)</Label>
                <Input type="number" value={shipmentForm.shipping_cost} onChange={us('shipping_cost')} placeholder="0.00" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Manufacturer</Label>
                <Input value={shipmentForm.manufacturer_name} onChange={us('manufacturer_name')} placeholder="Name" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Manufacturer Country</Label>
                <Input value={shipmentForm.manufacturer_country} onChange={us('manufacturer_country')} placeholder="Country" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Supplier</Label>
              <Input value={shipmentForm.supplier_name} onChange={us('supplier_name')} placeholder="Supplier name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Tracking #</Label>
                <Input value={shipmentForm.tracking_number} onChange={us('tracking_number')} placeholder="TRK-123" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={shipmentForm.status} onValueChange={v => setShipmentForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ordered">Ordered</SelectItem>
                    <SelectItem value="in_transit">In Transit</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="inspected">Inspected</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Batch #</Label>
                <Input value={shipmentForm.batch_number} onChange={us('batch_number')} placeholder="B-001" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Lot #</Label>
                <Input value={shipmentForm.lot_number} onChange={us('lot_number')} placeholder="LOT-A1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Expiry Date</Label>
                <Input type="date" value={shipmentForm.expiry_date} onChange={us('expiry_date')} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Quality Grade</Label>
                <Input value={shipmentForm.quality_grade} onChange={us('quality_grade')} placeholder="A / B / C" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea value={shipmentForm.notes} onChange={us('notes')} rows={2} />
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
              <Button onClick={handleSaveShipment} disabled={createShipment.isPending || !shipmentForm.quantity} className="w-full">
                {createShipment.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Log Shipment
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </Card>
  );
}
