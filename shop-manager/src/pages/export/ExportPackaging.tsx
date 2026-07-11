import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Plus, Loader2, Package, Box, Ruler, DollarSign, Factory, Truck,
  ArrowLeft, Edit, Trash2, CalendarDays, AlertTriangle, BarChart3
} from 'lucide-react';
import {
  useExportPackagingOptions, useCreatePackagingOption, useUpdatePackagingOption,
  useDeletePackagingOption, usePackagingShipments, useCreatePackagingShipment,
  type PackagingOption
} from '@/hooks/export/useExportPackaging';

const PACKAGING_TYPES = [
  { value: 'bag', label: 'Bag (PP/Jute)' },
  { value: 'box', label: 'Cardboard Box' },
  { value: 'drum', label: 'Drum/Barrel' },
  { value: 'container', label: 'Shipping Container' },
  { value: 'pallet', label: 'Pallet Wrap' },
  { value: 'sack', label: 'Sack' },
  { value: 'crate', label: 'Wooden Crate' },
  { value: 'ibc', label: 'IBC Tote' },
  { value: 'pouch', label: 'Pouch/Sachet' },
  { value: 'bulk', label: 'Bulk (Loose)' },
  { value: 'other', label: 'Other' },
];

const F = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
    {children}
  </div>
);

interface PackagingFormState {
  name: string; packaging_type: string; size_label: string;
  weight_capacity_kg: string; length_cm: string; width_cm: string; height_cm: string;
  tare_weight_kg: string; material: string;
  material_cost_per_unit: string; labor_cost_per_unit: string;
  manufacturer_name: string; manufacturer_country: string; manufacturer_contact: string;
  manufacturer_lead_time_days: string;
  shipping_cost_to_warehouse: string; current_stock: string; reorder_point: string;
  preferred_supplier: string; notes: string;
}

const emptyForm = (): PackagingFormState => ({
  name: '', packaging_type: 'bag', size_label: '',
  weight_capacity_kg: '', length_cm: '', width_cm: '', height_cm: '',
  tare_weight_kg: '0', material: '',
  material_cost_per_unit: '0', labor_cost_per_unit: '0',
  manufacturer_name: '', manufacturer_country: '', manufacturer_contact: '',
  manufacturer_lead_time_days: '',
  shipping_cost_to_warehouse: '0', current_stock: '0', reorder_point: '0',
  preferred_supplier: '', notes: '',
});

const pkgToForm = (p: PackagingOption): PackagingFormState => ({
  name: p.name, packaging_type: p.packaging_type, size_label: p.size_label || '',
  weight_capacity_kg: p.weight_capacity_kg?.toString() || '',
  length_cm: p.length_cm?.toString() || '', width_cm: p.width_cm?.toString() || '',
  height_cm: p.height_cm?.toString() || '', tare_weight_kg: p.tare_weight_kg?.toString() || '0',
  material: p.material || '',
  material_cost_per_unit: p.material_cost_per_unit?.toString() || '0',
  labor_cost_per_unit: p.labor_cost_per_unit?.toString() || '0',
  manufacturer_name: p.manufacturer_name || '', manufacturer_country: p.manufacturer_country || '',
  manufacturer_contact: p.manufacturer_contact || '',
  manufacturer_lead_time_days: p.manufacturer_lead_time_days?.toString() || '',
  shipping_cost_to_warehouse: p.shipping_cost_to_warehouse?.toString() || '0',
  current_stock: p.current_stock?.toString() || '0', reorder_point: p.reorder_point?.toString() || '0',
  preferred_supplier: p.preferred_supplier || '', notes: p.notes || '',
});

const formToPayload = (f: PackagingFormState) => ({
  name: f.name,
  packaging_type: f.packaging_type,
  size_label: f.size_label || null,
  weight_capacity_kg: f.weight_capacity_kg ? Number(f.weight_capacity_kg) : null,
  length_cm: f.length_cm ? Number(f.length_cm) : null,
  width_cm: f.width_cm ? Number(f.width_cm) : null,
  height_cm: f.height_cm ? Number(f.height_cm) : null,
  tare_weight_kg: Number(f.tare_weight_kg) || 0,
  material: f.material || null,
  material_cost_per_unit: Number(f.material_cost_per_unit) || 0,
  labor_cost_per_unit: Number(f.labor_cost_per_unit) || 0,
  manufacturer_name: f.manufacturer_name || null,
  manufacturer_country: f.manufacturer_country || null,
  manufacturer_contact: f.manufacturer_contact || null,
  manufacturer_lead_time_days: f.manufacturer_lead_time_days ? Number(f.manufacturer_lead_time_days) : null,
  shipping_cost_to_warehouse: Number(f.shipping_cost_to_warehouse) || 0,
  current_stock: Number(f.current_stock) || 0,
  reorder_point: Number(f.reorder_point) || 0,
  preferred_supplier: f.preferred_supplier || null,
  notes: f.notes || null,
});

// Shipment form
interface ShipmentFormState {
  shipment_date: string; expected_arrival: string; quantity: string;
  unit_cost: string; shipping_cost: string; supplier_name: string;
  supplier_country: string; tracking_number: string; invoice_number: string; notes: string;
}

const emptyShipmentForm = (): ShipmentFormState => ({
  shipment_date: new Date().toISOString().split('T')[0],
  expected_arrival: '', quantity: '', unit_cost: '', shipping_cost: '0',
  supplier_name: '', supplier_country: '', tracking_number: '', invoice_number: '', notes: '',
});

export default function ExportPackagingPage() {
  const { data: packagingOptions = [], isLoading } = useExportPackagingOptions();
  const createPkg = useCreatePackagingOption();
  const updatePkg = useUpdatePackagingOption();
  const deletePkg = useDeletePackagingOption();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingPkg, setEditingPkg] = useState<PackagingOption | null>(null);
  const [selectedPkg, setSelectedPkg] = useState<PackagingOption | null>(null);
  const [form, setForm] = useState<PackagingFormState>(emptyForm());

  const openCreate = () => { setEditingPkg(null); setForm(emptyForm()); setSheetOpen(true); };
  const openEdit = (p: PackagingOption) => { setEditingPkg(p); setForm(pkgToForm(p)); setSheetOpen(true); setSelectedPkg(null); };

  const handleSave = async () => {
    if (!form.name) return;
    const payload = formToPayload(form);
    if (editingPkg) {
      await updatePkg.mutateAsync({ id: editingPkg.id, ...payload });
    } else {
      await createPkg.mutateAsync(payload as any);
    }
    setSheetOpen(false);
    setEditingPkg(null);
    setForm(emptyForm());
  };

  const u = (field: keyof PackagingFormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }));

  // Detail view
  if (selectedPkg) {
    return <PackagingDetailView pkg={selectedPkg} onBack={() => setSelectedPkg(null)} onEdit={() => openEdit(selectedPkg)} />;
  }

  const lowStock = packagingOptions.filter(p => p.current_stock <= p.reorder_point);
  const totalValue = packagingOptions.reduce((s, p) => s + (p.current_stock * (p.total_cost_per_unit || 0)), 0);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Packaging</h1>
          <p className="text-xs text-muted-foreground">{packagingOptions.length} types configured</p>
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1"><Plus className="h-4 w-4" /> Add</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-3 text-center">
          <Box className="h-4 w-4 mx-auto mb-1 text-emerald-500" />
          <p className="text-lg font-bold text-foreground">{packagingOptions.length}</p>
          <p className="text-xs text-muted-foreground">Types</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <DollarSign className="h-4 w-4 mx-auto mb-1 text-emerald-500" />
          <p className="text-lg font-bold text-foreground">${totalValue.toFixed(0)}</p>
          <p className="text-xs text-muted-foreground">Stock Value</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <AlertTriangle className="h-4 w-4 mx-auto mb-1 text-destructive" />
          <p className="text-lg font-bold text-foreground">{lowStock.length}</p>
          <p className="text-xs text-muted-foreground">Low Stock</p>
        </CardContent></Card>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : packagingOptions.length === 0 ? (
        <div className="text-center py-12">
          <Box className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground font-medium">No packaging configured</p>
          <Button size="sm" onClick={openCreate} className="mt-3 gap-1"><Plus className="h-4 w-4" /> Add Packaging</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {packagingOptions.map(p => {
            const isLow = p.current_stock <= p.reorder_point;
            return (
              <Card key={p.id} className={`cursor-pointer hover:bg-muted/30 transition-colors active:scale-[0.99] ${isLow ? 'border-l-2 border-l-destructive' : ''}`}
                onClick={() => setSelectedPkg(p)}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-foreground text-sm truncate">{p.name}</p>
                        {isLow && <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {PACKAGING_TYPES.find(t => t.value === p.packaging_type)?.label || p.packaging_type}
                        </Badge>
                        {p.size_label && <span className="text-[10px] text-muted-foreground">{p.size_label}</span>}
                        {p.weight_capacity_kg && <span className="text-[10px] text-muted-foreground">{p.weight_capacity_kg}kg</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-foreground">${(p.total_cost_per_unit || 0).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">Stock: {p.current_stock}</p>
                    </div>
                  </div>
                  {p.manufacturer_name && (
                    <p className="text-xs text-muted-foreground mt-1.5">
                      <Factory className="h-3 w-3 inline mr-1" />{p.manufacturer_name}
                      {p.manufacturer_country ? ` (${p.manufacturer_country})` : ''}
                    </p>
                  )}
                  {p.length_cm && p.width_cm && p.height_cm && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <Ruler className="h-3 w-3 inline mr-1" />{p.length_cm}×{p.width_cm}×{p.height_cm}cm
                      {p.volume_cm3 ? ` (${(p.volume_cm3 / 1000000).toFixed(3)}m³)` : ''}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={(o) => { setSheetOpen(o); if (!o) { setEditingPkg(null); setForm(emptyForm()); } }}>
        <SheetContent side="bottom" className="h-[92vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingPkg ? 'Edit Packaging' : 'Add Packaging'}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 pb-20">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-4 h-auto">
                <TabsTrigger value="basic" className="text-[10px] px-1 py-1.5"><Box className="h-3 w-3 mr-0.5" /> Basic</TabsTrigger>
                <TabsTrigger value="dims" className="text-[10px] px-1 py-1.5"><Ruler className="h-3 w-3 mr-0.5" /> Size</TabsTrigger>
                <TabsTrigger value="costs" className="text-[10px] px-1 py-1.5"><DollarSign className="h-3 w-3 mr-0.5" /> Costs</TabsTrigger>
                <TabsTrigger value="mfg" className="text-[10px] px-1 py-1.5"><Factory className="h-3 w-3 mr-0.5" /> Source</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-3 mt-3">
                <F label="Packaging Name *"><Input value={form.name} onChange={u('name')} placeholder="25kg PP Bag" /></F>
                <div className="grid grid-cols-2 gap-3">
                  <F label="Type">
                    <Select value={form.packaging_type} onValueChange={v => setForm(p => ({ ...p, packaging_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PACKAGING_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </F>
                  <F label="Size Label"><Input value={form.size_label} onChange={u('size_label')} placeholder="Small / Medium / 25kg" /></F>
                </div>
                <F label="Material"><Input value={form.material} onChange={u('material')} placeholder="Polypropylene woven" /></F>
                <div className="grid grid-cols-2 gap-3">
                  <F label="Current Stock"><Input type="number" value={form.current_stock} onChange={u('current_stock')} /></F>
                  <F label="Reorder Point"><Input type="number" value={form.reorder_point} onChange={u('reorder_point')} /></F>
                </div>
                <F label="Notes"><Textarea value={form.notes} onChange={u('notes')} rows={2} /></F>
              </TabsContent>

              <TabsContent value="dims" className="space-y-3 mt-3">
                <F label="Weight Capacity (kg)"><Input type="number" value={form.weight_capacity_kg} onChange={u('weight_capacity_kg')} placeholder="25" /></F>
                <div className="grid grid-cols-3 gap-3">
                  <F label="Length (cm)"><Input type="number" value={form.length_cm} onChange={u('length_cm')} /></F>
                  <F label="Width (cm)"><Input type="number" value={form.width_cm} onChange={u('width_cm')} /></F>
                  <F label="Height (cm)"><Input type="number" value={form.height_cm} onChange={u('height_cm')} /></F>
                </div>
                {form.length_cm && form.width_cm && form.height_cm && (
                  <div className="p-3 rounded-lg bg-muted/50 text-sm">
                    <span className="text-muted-foreground">Volume: </span>
                    <span className="font-medium text-foreground">
                      {((Number(form.length_cm) * Number(form.width_cm) * Number(form.height_cm)) / 1000000).toFixed(4)} m³
                    </span>
                  </div>
                )}
                <F label="Tare Weight (kg)"><Input type="number" value={form.tare_weight_kg} onChange={u('tare_weight_kg')} placeholder="0.5" /></F>
              </TabsContent>

              <TabsContent value="costs" className="space-y-3 mt-3">
                <div className="grid grid-cols-2 gap-3">
                  <F label="Material Cost/Unit ($)"><Input type="number" value={form.material_cost_per_unit} onChange={u('material_cost_per_unit')} /></F>
                  <F label="Labor Cost/Unit ($)"><Input type="number" value={form.labor_cost_per_unit} onChange={u('labor_cost_per_unit')} /></F>
                </div>
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-sm">
                  <span className="text-muted-foreground">Total Cost/Unit: </span>
                  <span className="font-bold text-foreground">
                    ${((Number(form.material_cost_per_unit) || 0) + (Number(form.labor_cost_per_unit) || 0)).toFixed(2)}
                  </span>
                </div>
                <F label="Shipping Cost to Warehouse ($)"><Input type="number" value={form.shipping_cost_to_warehouse} onChange={u('shipping_cost_to_warehouse')} /></F>
              </TabsContent>

              <TabsContent value="mfg" className="space-y-3 mt-3">
                <F label="Manufacturer Name"><Input value={form.manufacturer_name} onChange={u('manufacturer_name')} placeholder="ABC Packaging Co." /></F>
                <div className="grid grid-cols-2 gap-3">
                  <F label="Country"><Input value={form.manufacturer_country} onChange={u('manufacturer_country')} placeholder="China" /></F>
                  <F label="Lead Time (days)"><Input type="number" value={form.manufacturer_lead_time_days} onChange={u('manufacturer_lead_time_days')} /></F>
                </div>
                <F label="Contact"><Input value={form.manufacturer_contact} onChange={u('manufacturer_contact')} placeholder="Phone / email" /></F>
                <F label="Preferred Supplier"><Input value={form.preferred_supplier} onChange={u('preferred_supplier')} placeholder="Local distributor name" /></F>
              </TabsContent>
            </Tabs>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
              <Button onClick={handleSave} disabled={!form.name || createPkg.isPending || updatePkg.isPending} className="w-full">
                {(createPkg.isPending || updatePkg.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingPkg ? 'Update Packaging' : 'Add Packaging'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// Detail view with shipment history
function PackagingDetailView({ pkg, onBack, onEdit }: { pkg: PackagingOption; onBack: () => void; onEdit: () => void }) {
  const { data: shipments = [], isLoading } = usePackagingShipments(pkg.id);
  const createShipment = useCreatePackagingShipment();
  const deletePkg = useDeletePackagingOption();
  const [shipmentOpen, setShipmentOpen] = useState(false);
  const [sf, setSf] = useState<ShipmentFormState>(emptyShipmentForm());

  const handleAddShipment = async () => {
    if (!sf.quantity || !sf.shipment_date) return;
    await createShipment.mutateAsync({
      packaging_id: pkg.id,
      shipment_date: sf.shipment_date,
      expected_arrival: sf.expected_arrival || null,
      quantity: Number(sf.quantity),
      unit_cost: Number(sf.unit_cost) || 0,
      shipping_cost: Number(sf.shipping_cost) || 0,
      supplier_name: sf.supplier_name || null,
      supplier_country: sf.supplier_country || null,
      tracking_number: sf.tracking_number || null,
      invoice_number: sf.invoice_number || null,
      notes: sf.notes || null,
    } as any);
    setSf(emptyShipmentForm());
    setShipmentOpen(false);
  };

  const su = (field: keyof ShipmentFormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setSf(p => ({ ...p, [field]: e.target.value }));

  const totalShipped = shipments.reduce((s, sh) => s + sh.quantity, 0);
  const totalSpent = shipments.reduce((s, sh) => s + (sh.total_cost || 0) + (sh.shipping_cost || 0), 0);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1"><ArrowLeft className="h-4 w-4" /> Back</Button>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onEdit} className="gap-1"><Edit className="h-4 w-4" /> Edit</Button>
          <Button size="sm" variant="destructive" onClick={() => { deletePkg.mutate(pkg.id); onBack(); }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shrink-0">
          <Box className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">{pkg.name}</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant="secondary" className="text-xs">
              {PACKAGING_TYPES.find(t => t.value === pkg.packaging_type)?.label || pkg.packaging_type}
            </Badge>
            {pkg.size_label && <Badge variant="outline" className="text-xs">{pkg.size_label}</Badge>}
            {pkg.weight_capacity_kg && <Badge variant="outline" className="text-xs">{pkg.weight_capacity_kg}kg cap</Badge>}
          </div>
        </div>
      </div>

      {/* Cost & Dimensions */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><DollarSign className="h-4 w-4" /> Cost & Specs</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-muted-foreground">Material Cost</p><p className="font-medium text-foreground">${(pkg.material_cost_per_unit || 0).toFixed(2)}</p></div>
            <div><p className="text-xs text-muted-foreground">Labor Cost</p><p className="font-medium text-foreground">${(pkg.labor_cost_per_unit || 0).toFixed(2)}</p></div>
            <div><p className="text-xs text-muted-foreground">Total Cost/Unit</p><p className="font-bold text-foreground">${(pkg.total_cost_per_unit || 0).toFixed(2)}</p></div>
            <div><p className="text-xs text-muted-foreground">Shipping to WH</p><p className="font-medium text-foreground">${(pkg.shipping_cost_to_warehouse || 0).toFixed(2)}</p></div>
          </div>
          {pkg.length_cm && pkg.width_cm && pkg.height_cm && (
            <>
              <Separator className="my-3" />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-muted-foreground">Dimensions</p><p className="font-medium text-foreground">{pkg.length_cm}×{pkg.width_cm}×{pkg.height_cm}cm</p></div>
                <div><p className="text-xs text-muted-foreground">Volume</p><p className="font-medium text-foreground">{((pkg.volume_cm3 || 0) / 1000000).toFixed(4)} m³</p></div>
                {pkg.tare_weight_kg && <div><p className="text-xs text-muted-foreground">Tare Weight</p><p className="font-medium text-foreground">{pkg.tare_weight_kg}kg</p></div>}
                {pkg.material && <div><p className="text-xs text-muted-foreground">Material</p><p className="font-medium text-foreground">{pkg.material}</p></div>}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Manufacturer */}
      {pkg.manufacturer_name && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Factory className="h-4 w-4" /> Manufacturer</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-muted-foreground">Name</p><p className="font-medium text-foreground">{pkg.manufacturer_name}</p></div>
              {pkg.manufacturer_country && <div><p className="text-xs text-muted-foreground">Country</p><p className="font-medium text-foreground">{pkg.manufacturer_country}</p></div>}
              {pkg.manufacturer_contact && <div><p className="text-xs text-muted-foreground">Contact</p><p className="font-medium text-foreground">{pkg.manufacturer_contact}</p></div>}
              {pkg.manufacturer_lead_time_days && <div><p className="text-xs text-muted-foreground">Lead Time</p><p className="font-medium text-foreground">{pkg.manufacturer_lead_time_days} days</p></div>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stock & Inventory */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Package className="h-4 w-4" /> Inventory</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Current Stock</p>
              <p className={`font-bold ${pkg.current_stock <= pkg.reorder_point ? 'text-destructive' : 'text-foreground'}`}>{pkg.current_stock}</p>
            </div>
            <div><p className="text-xs text-muted-foreground">Reorder Point</p><p className="font-medium text-foreground">{pkg.reorder_point}</p></div>
            <div><p className="text-xs text-muted-foreground">Total Shipped In</p><p className="font-medium text-foreground">{totalShipped}</p></div>
            <div><p className="text-xs text-muted-foreground">Total Spent</p><p className="font-medium text-foreground">${totalSpent.toFixed(2)}</p></div>
          </div>
        </CardContent>
      </Card>

      {/* Shipment History */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><Truck className="h-4 w-4" /> Shipment History</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShipmentOpen(true)} className="gap-1 h-7 text-xs">
              <Plus className="h-3 w-3" /> Log Shipment
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : shipments.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No shipments logged yet</p>
          ) : (
            <div className="space-y-2">
              {shipments.map(sh => (
                <div key={sh.id} className="p-2.5 rounded-lg bg-muted/50 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium text-foreground">{new Date(sh.shipment_date).toLocaleDateString()}</span>
                      <Badge variant={sh.status === 'delivered' ? 'default' : sh.status === 'in_transit' ? 'secondary' : 'outline'} className="text-[10px]">
                        {sh.status}
                      </Badge>
                    </div>
                    <span className="font-bold text-foreground">{sh.quantity} units</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>${sh.unit_cost}/ea</span>
                    <span>Total: ${(sh.total_cost || 0).toFixed(2)}</span>
                    {sh.shipping_cost > 0 && <span>Ship: ${sh.shipping_cost}</span>}
                  </div>
                  {sh.supplier_name && (
                    <p className="text-xs text-muted-foreground mt-0.5">From: {sh.supplier_name}{sh.supplier_country ? ` (${sh.supplier_country})` : ''}</p>
                  )}
                  {sh.tracking_number && <p className="text-xs text-muted-foreground">Track: {sh.tracking_number}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Shipment Dialog */}
      <Dialog open={shipmentOpen} onOpenChange={setShipmentOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Log Packaging Shipment</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <F label="Shipment Date *"><Input type="date" value={sf.shipment_date} onChange={su('shipment_date')} /></F>
              <F label="Expected Arrival"><Input type="date" value={sf.expected_arrival} onChange={su('expected_arrival')} /></F>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <F label="Quantity *"><Input type="number" value={sf.quantity} onChange={su('quantity')} placeholder="500" /></F>
              <F label="Unit Cost ($)"><Input type="number" value={sf.unit_cost} onChange={su('unit_cost')} placeholder="0.50" /></F>
            </div>
            {sf.quantity && sf.unit_cost && (
              <div className="p-2 rounded-md bg-muted/50 text-sm">
                <span className="text-muted-foreground">Total: </span>
                <span className="font-bold text-foreground">${(Number(sf.quantity) * Number(sf.unit_cost)).toFixed(2)}</span>
              </div>
            )}
            <F label="Shipping Cost ($)"><Input type="number" value={sf.shipping_cost} onChange={su('shipping_cost')} /></F>
            <div className="grid grid-cols-2 gap-3">
              <F label="Supplier"><Input value={sf.supplier_name} onChange={su('supplier_name')} /></F>
              <F label="Country"><Input value={sf.supplier_country} onChange={su('supplier_country')} /></F>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <F label="Tracking #"><Input value={sf.tracking_number} onChange={su('tracking_number')} /></F>
              <F label="Invoice #"><Input value={sf.invoice_number} onChange={su('invoice_number')} /></F>
            </div>
            <F label="Notes"><Textarea value={sf.notes} onChange={su('notes')} rows={2} /></F>
            <Button onClick={handleAddShipment} disabled={!sf.quantity || !sf.shipment_date || createShipment.isPending} className="w-full">
              {createShipment.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Record Shipment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
