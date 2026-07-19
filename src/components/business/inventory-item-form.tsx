import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Package,
  DollarSign,
  BarChart3,
  Info,
  Calculator,
  FileText,
  Check,
  ChevronLeft,
  ChevronRight,
  Save,
  X,
  Link as LinkIcon,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { upsertBusinessInventoryItem } from "@/lib/business-inventory.functions";
import { cn } from "@/lib/utils";
import { mainCategoriesFor, subcategoriesFor } from "@/data/inventory-taxonomy";
import { businessKindLabel } from "@/data/business-kinds";

/**
 * Six-section inventory form matching the Shop Manager design:
 * Basic Info · Pricing · Inventory · Details · Tax & Fees · Additional
 */

type FormState = {
  // Basic
  name: string;
  sku: string;
  barcode: string;
  manufacturer_part_number: string;
  main_category: string;
  category: string;
  status: string;
  manufacturer: string;
  supplier: string;
  brand: string;
  description: string;
  // Pricing
  cost: string; // total cost
  price: string; // sell price per unit
  markup_percentage: string;
  date_purchased: string;
  last_price_update: string;
  // Inventory
  qty_on_hand: string;
  reorder_at: string;
  unit: string;
  location: string;
  qty_on_hold: string;
  qty_on_order: string;
  min_stock_level: string;
  max_stock_level: string;
  // Details
  weight_lbs: string;
  dimensions: string;
  color: string;
  material: string;
  model_year: string;
  oem_part_number: string;
  warranty_period: string;
  universal_part: boolean;
  // Tax & Fees
  tax_rate: string;
  environmental_fee: string;
  core_charge: string;
  hazmat_fee: string;
  tax_exempt: boolean;
  // Additional
  date_last_ordered: string;
  date_last_used: string;
  notes: string;
  web_links: { label: string; type: string; url: string }[];
  // Sharing
  network_visible: boolean;
};

const EMPTY: FormState = {
  name: "", sku: "", barcode: "", manufacturer_part_number: "",
  main_category: "", category: "", status: "active",
  manufacturer: "", supplier: "", brand: "", description: "",
  cost: "", price: "", markup_percentage: "",
  date_purchased: "", last_price_update: "",
  qty_on_hand: "0", reorder_at: "", unit: "pc", location: "",
  qty_on_hold: "0", qty_on_order: "0",
  min_stock_level: "", max_stock_level: "",
  weight_lbs: "", dimensions: "", color: "", material: "",
  model_year: "", oem_part_number: "", warranty_period: "", universal_part: false,
  tax_rate: "", environmental_fee: "", core_charge: "", hazmat_fee: "",
  tax_exempt: false,
  date_last_ordered: "", date_last_used: "", notes: "",
  web_links: [],
  network_visible: true,
};

const UNITS = ["pc", "set", "pair", "L", "gal", "kg", "lb", "ft", "m", "box"];
const LINK_TYPES = ["Manufacturer", "Manual (PDF)", "Video", "Datasheet", "Supplier", "Other"];

type SectionKey = "basic" | "pricing" | "inventory" | "details" | "tax" | "additional";
const SECTIONS: { key: SectionKey; label: string; icon: any }[] = [
  { key: "basic", label: "Basic Info", icon: Package },
  { key: "pricing", label: "Pricing", icon: DollarSign },
  { key: "inventory", label: "Inventory", icon: BarChart3 },
  { key: "details", label: "Details", icon: Info },
  { key: "tax", label: "Tax & Fees", icon: Calculator },
  { key: "additional", label: "Additional", icon: FileText },
];

export function InventoryItemFormDialog({
  open,
  onOpenChange,
  businessId,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  businessId: string;
  editing: any | null;
  onSaved: () => void;
}) {
  const [section, setSection] = useState<SectionKey>("basic");
  const [form, setForm] = useState<FormState>(() => rowToForm(editing));
  const [saving, setSaving] = useState(false);
  const upsertFn = useServerFn(upsertBusinessInventoryItem);

  // Reset form whenever the dialog opens or the row changes
  useMemo(() => {
    if (open) {
      setForm(rowToForm(editing));
      setSection("basic");
    }
  }, [open, editing?.id]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Section completion — used for the header progress + tab checks
  const done: Record<SectionKey, boolean> = {
    basic: !!form.name.trim() && !!form.main_category,
    pricing: !!form.cost || !!form.price,
    inventory: form.qty_on_hand !== "" && !!form.unit,
    details: !!form.weight_lbs || !!form.dimensions || !!form.oem_part_number || !!form.material,
    tax: !!form.tax_rate || form.tax_exempt || !!form.core_charge,
    additional: !!form.notes || form.web_links.length > 0 || !!form.date_last_ordered,
  };
  const completedCount = (Object.values(done) as boolean[]).filter(Boolean).length;

  // Derived pricing
  const qtyNum = Number(form.qty_on_hand) || 0;
  const costNum = Number(form.cost) || 0;
  const costPerUnit = qtyNum > 0 ? costNum / qtyNum : 0;
  const totalInvValue = costNum;

  async function save() {
    if (!form.name.trim()) {
      setSection("basic");
      toast.error("Item name is required");
      return;
    }
    if (!form.main_category) {
      setSection("basic");
      toast.error("Main category is required");
      return;
    }
    setSaving(true);
    try {
      const num = (v: string) => (v === "" ? null : Number(v));
      const res: any = await upsertFn({
        data: {
          id: editing?.id,
          businessId,
          name: form.name,
          sku: form.sku || null,
          category: form.category || form.main_category || null,
          brand: form.brand || null,
          unit: form.unit || "pc",
          qty_on_hand: Number(form.qty_on_hand) || 0,
          reorder_at: num(form.reorder_at),
          cost: num(form.cost),
          price: num(form.price),
          location: form.location || null,
          network_visible: form.network_visible,
          extra: {
            barcode: form.barcode || null,
            manufacturer_part_number: form.manufacturer_part_number || null,
            main_category: form.main_category || null,
            status: form.status || "active",
            manufacturer: form.manufacturer || null,
            supplier: form.supplier || null,
            description: form.description || null,
            markup_percentage: num(form.markup_percentage),
            date_purchased: form.date_purchased || null,
            last_price_update: form.last_price_update || null,
            qty_on_hold: Number(form.qty_on_hold) || 0,
            qty_on_order: Number(form.qty_on_order) || 0,
            min_stock_level: num(form.min_stock_level),
            max_stock_level: num(form.max_stock_level),
            weight_lbs: num(form.weight_lbs),
            dimensions: form.dimensions || null,
            color: form.color || null,
            material: form.material || null,
            model_year: form.model_year === "" ? null : Number(form.model_year),
            oem_part_number: form.oem_part_number || null,
            warranty_period: form.warranty_period || null,
            universal_part: form.universal_part,
            tax_rate: num(form.tax_rate),
            environmental_fee: num(form.environmental_fee),
            core_charge: num(form.core_charge),
            hazmat_fee: num(form.hazmat_fee),
            tax_exempt: form.tax_exempt,
            date_last_ordered: form.date_last_ordered || null,
            date_last_used: form.date_last_used || null,
            web_links: form.web_links.filter((l) => l.url.trim()),
          },
        },
      });
      const { handlePlanLimitResult } = await import("@/lib/plan-limit-toast");
      if (handlePlanLimitResult(res, { businessId })) return;
      toast.success(editing ? "Item updated" : "Item added");
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function goPrev() {
    const i = SECTIONS.findIndex((s) => s.key === section);
    if (i > 0) setSection(SECTIONS[i - 1].key);
  }
  function goNext() {
    const i = SECTIONS.findIndex((s) => s.key === section);
    if (i < SECTIONS.length - 1) setSection(SECTIONS[i + 1].key);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-5 flex items-start justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold">
              {editing ? "Edit Inventory Item" : "Add New Inventory Item"}
            </h2>
            <p className="text-blue-100 text-sm mt-1">
              Complete all sections for comprehensive inventory management
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="inline-flex items-center gap-1 bg-blue-500/40 rounded-full px-3 py-1 text-xs font-medium">
                {completedCount} of {SECTIONS.length} sections completed
              </div>
              <div className="h-1 w-40 mt-2 bg-blue-500/40 rounded-full overflow-hidden ml-auto">
                <div
                  className="h-full bg-white transition-all"
                  style={{ width: `${(completedCount / SECTIONS.length) * 100}%` }}
                />
              </div>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="text-white/80 hover:text-white p-1"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-muted/40 border-b px-4 pt-3 pb-2 flex gap-1 overflow-x-auto">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const active = s.key === section;
            return (
              <button
                key={s.key}
                onClick={() => setSection(s.key)}
                className={cn(
                  "flex-1 min-w-[110px] flex flex-col items-center gap-1 px-3 py-2 rounded-md text-xs font-medium border transition-colors",
                  active
                    ? "bg-background border-primary text-primary shadow-sm"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-background/60",
                )}
              >
                <span className="relative">
                  <Icon className="h-4 w-4" />
                  {done[s.key] && (
                    <span className="absolute -top-1 -right-2 bg-emerald-500 text-white rounded-full h-3 w-3 flex items-center justify-center">
                      <Check className="h-2 w-2" />
                    </span>
                  )}
                </span>
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-background">
          {section === "basic" && (
            <Section title="Basic Information">
              <Grid2>
                <Field label="Item Name" required>
                  <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Enter item name" />
                </Field>
                <Field label="SKU / Part Number">
                  <Input value={form.sku} onChange={(e) => set("sku", e.target.value)} placeholder="Enter SKU or part number" />
                </Field>
                <Field label="Barcode">
                  <Input value={form.barcode} onChange={(e) => set("barcode", e.target.value)} placeholder="Enter barcode" />
                </Field>
                <Field label="Manufacturer Part Number">
                  <Input value={form.manufacturer_part_number} onChange={(e) => set("manufacturer_part_number", e.target.value)} placeholder="Enter manufacturer part number" />
                </Field>
                <Field label="Main Category" required>
                  <Select value={form.main_category} onValueChange={(v) => set("main_category", v)}>
                    <SelectTrigger><SelectValue placeholder="Select main category" /></SelectTrigger>
                    <SelectContent>
                      {MAIN_CATEGORIES.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Status">
                  <Select value={form.status} onValueChange={(v) => set("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="discontinued">Discontinued</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Manufacturer">
                  <Input value={form.manufacturer} onChange={(e) => set("manufacturer", e.target.value)} placeholder="Enter manufacturer name" />
                </Field>
                <Field label="Supplier">
                  <Input value={form.supplier} onChange={(e) => set("supplier", e.target.value)} placeholder="Enter supplier name" />
                </Field>
                <Field label="Brand">
                  <Input value={form.brand} onChange={(e) => set("brand", e.target.value)} placeholder="Bosch / Denso / OEM" />
                </Field>
                <Field label="Sub-category">
                  <Input value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="strap / dolly / fuel" />
                </Field>
              </Grid2>
              <Field label="Description">
                <Textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Enter item description" />
              </Field>
            </Section>
          )}

          {section === "pricing" && (
            <Section title="Pricing Information" tone="emerald" icon={<DollarSign className="h-5 w-5 text-emerald-600" />}>
              <Grid2>
                <Field label="Total Cost (All Units)" hint="Total cost for all units in this inventory lot">
                  <Input type="number" step="0.01" value={form.cost} onChange={(e) => set("cost", e.target.value)} placeholder="500.00" />
                </Field>
                <Field label="Sell Price Per Unit" hint="Price per unit (e.g., per lb, per piece)">
                  <Input type="number" step="0.01" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="45.00" />
                </Field>
              </Grid2>
              <Grid3>
                <Field label="Markup Percentage" hint="Markup percentage over cost">
                  <Input type="number" step="0.1" value={form.markup_percentage} onChange={(e) => set("markup_percentage", e.target.value)} placeholder="50.0" />
                </Field>
                <Field label="Cost Per Unit" hint="Calculated: Total Cost ÷ Quantity">
                  <Input readOnly value={costPerUnit ? costPerUnit.toFixed(2) : "0.00"} className="bg-muted" />
                </Field>
                <Field label="Total Inventory Value" hint="Total value of this inventory lot">
                  <Input readOnly value={totalInvValue ? totalInvValue.toFixed(2) : "0.00"} className="bg-muted" />
                </Field>
              </Grid3>
              <Grid2>
                <Field label="Date Purchased">
                  <Input type="date" value={form.date_purchased} onChange={(e) => set("date_purchased", e.target.value)} />
                </Field>
                <Field label="Last Price Update">
                  <Input type="date" value={form.last_price_update} onChange={(e) => set("last_price_update", e.target.value)} />
                </Field>
              </Grid2>
            </Section>
          )}

          {section === "inventory" && (
            <Section title="Inventory Management">
              <Grid3>
                <Field label="Current Quantity">
                  <Input type="number" value={form.qty_on_hand} onChange={(e) => set("qty_on_hand", e.target.value)} />
                </Field>
                <Field label="Reorder Point" hint="Minimum quantity before reordering">
                  <Input type="number" value={form.reorder_at} onChange={(e) => set("reorder_at", e.target.value)} placeholder="0" />
                </Field>
                <Field label="Measurement Unit">
                  <Select value={form.unit} onValueChange={(v) => set("unit", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {UNITS.map((u) => (<SelectItem key={u} value={u}>{u}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </Field>
              </Grid3>
              <Grid3>
                <Field label="Location">
                  <Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Shelf A1, Bin 5" />
                </Field>
                <Field label="On Hold" hint="Quantity reserved/on hold">
                  <Input type="number" value={form.qty_on_hold} onChange={(e) => set("qty_on_hold", e.target.value)} />
                </Field>
                <Field label="On Order" hint="Quantity currently on order">
                  <Input type="number" value={form.qty_on_order} onChange={(e) => set("qty_on_order", e.target.value)} />
                </Field>
              </Grid3>
              <Grid2>
                <Field label="Minimum Stock Level">
                  <Input type="number" value={form.min_stock_level} onChange={(e) => set("min_stock_level", e.target.value)} placeholder="0" />
                </Field>
                <Field label="Maximum Stock Level">
                  <Input type="number" value={form.max_stock_level} onChange={(e) => set("max_stock_level", e.target.value)} placeholder="0" />
                </Field>
              </Grid2>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">Show in network stock feed</p>
                  <p className="text-xs text-muted-foreground">
                    Off = keep this item private to your shop.
                  </p>
                </div>
                <Switch checked={form.network_visible} onCheckedChange={(v) => set("network_visible", v)} />
              </div>
            </Section>
          )}

          {section === "details" && (
            <Section title="Product Details">
              <Grid3>
                <Field label="Weight (lbs)" hint="Product weight in pounds">
                  <Input type="number" step="0.1" value={form.weight_lbs} onChange={(e) => set("weight_lbs", e.target.value)} placeholder="30.0" />
                </Field>
                <Field label="Dimensions" hint="Length x Width x Height">
                  <Input value={form.dimensions} onChange={(e) => set("dimensions", e.target.value)} placeholder="12x8x6 inches" />
                </Field>
                <Field label="Color" hint="Product color">
                  <Input value={form.color} onChange={(e) => set("color", e.target.value)} placeholder="Black" />
                </Field>
              </Grid3>
              <Grid3>
                <Field label="Material" hint="Primary material">
                  <Input value={form.material} onChange={(e) => set("material", e.target.value)} placeholder="Steel, Aluminum, etc." />
                </Field>
                <Field label="Model Year" hint="Applicable model year">
                  <Input type="number" value={form.model_year} onChange={(e) => set("model_year", e.target.value)} placeholder="2023" />
                </Field>
                <Field label="OEM Part Number" hint="Original equipment manufacturer part number">
                  <Input value={form.oem_part_number} onChange={(e) => set("oem_part_number", e.target.value)} placeholder="OEM-12345" />
                </Field>
              </Grid3>
              <Grid2>
                <Field label="Warranty Period" hint="Warranty coverage period">
                  <Input value={form.warranty_period} onChange={(e) => set("warranty_period", e.target.value)} placeholder="12 months" />
                </Field>
                <div className="flex items-center gap-3 pt-6">
                  <Switch checked={form.universal_part} onCheckedChange={(v) => set("universal_part", v)} id="universal" />
                  <Label htmlFor="universal" className="cursor-pointer">Universal Part (fits multiple vehicles)</Label>
                </div>
              </Grid2>
            </Section>
          )}

          {section === "tax" && (
            <Section title="Tax & Fees">
              <Grid3>
                <Field label="Tax Rate (%)" hint="Sales tax rate percentage">
                  <Input type="number" step="0.1" value={form.tax_rate} onChange={(e) => set("tax_rate", e.target.value)} placeholder="12" />
                </Field>
                <Field label="Environmental Fee" hint="Environmental disposal fee">
                  <Input type="number" step="0.01" value={form.environmental_fee} onChange={(e) => set("environmental_fee", e.target.value)} placeholder="5.00" />
                </Field>
                <Field label="Core Charge" hint="Refundable core charge">
                  <Input type="number" step="0.01" value={form.core_charge} onChange={(e) => set("core_charge", e.target.value)} placeholder="25.00" />
                </Field>
              </Grid3>
              <Grid2>
                <Field label="Hazmat Fee" hint="Hazardous materials handling fee">
                  <Input type="number" step="0.01" value={form.hazmat_fee} onChange={(e) => set("hazmat_fee", e.target.value)} placeholder="15.00" />
                </Field>
                <div className="flex items-center gap-3 pt-6">
                  <Switch checked={form.tax_exempt} onCheckedChange={(v) => set("tax_exempt", v)} id="taxexempt" />
                  <Label htmlFor="taxexempt" className="cursor-pointer">Tax Exempt Item</Label>
                </div>
              </Grid2>
            </Section>
          )}

          {section === "additional" && (
            <Section title="Additional Information">
              <Grid2>
                <Field label="Date Last Ordered">
                  <Input type="date" value={form.date_last_ordered} onChange={(e) => set("date_last_ordered", e.target.value)} />
                </Field>
                <Field label="Date Last Used">
                  <Input type="date" value={form.date_last_used} onChange={(e) => set("date_last_used", e.target.value)} />
                </Field>
              </Grid2>
              <Field label="Notes" hint="Internal notes about this inventory item">
                <Textarea rows={4} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Enter any additional notes about this item" />
              </Field>

              <div className="rounded-md border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <LinkIcon className="h-4 w-4 text-primary" />
                  <div>
                    <p className="font-medium text-sm">Web Links & Resources</p>
                    <p className="text-xs text-muted-foreground">
                      Add links to manufacturer websites, product manuals, videos, cloud documents, and other resources
                    </p>
                  </div>
                </div>
                {form.web_links.map((l, i) => (
                  <div key={i} className="grid grid-cols-1 md:grid-cols-[160px_1fr_2fr_auto] gap-2">
                    <Select value={l.type} onValueChange={(v) => {
                      const arr = [...form.web_links]; arr[i] = { ...arr[i], type: v }; set("web_links", arr);
                    }}>
                      <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                      <SelectContent>
                        {LINK_TYPES.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <Input placeholder="Label" value={l.label} onChange={(e) => {
                      const arr = [...form.web_links]; arr[i] = { ...arr[i], label: e.target.value }; set("web_links", arr);
                    }} />
                    <Input placeholder="https://example.com" value={l.url} onChange={(e) => {
                      const arr = [...form.web_links]; arr[i] = { ...arr[i], url: e.target.value }; set("web_links", arr);
                    }} />
                    <Button variant="ghost" size="icon" onClick={() => {
                      const arr = form.web_links.filter((_, idx) => idx !== i); set("web_links", arr);
                    }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => set("web_links", [...form.web_links, { label: "", type: "Manufacturer", url: "" }])}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add link
                </Button>
              </div>
            </Section>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-muted/30 px-6 py-3 flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <Button variant="outline" onClick={goPrev} disabled={section === SECTIONS[0].key}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <Button variant="outline" onClick={goNext} disabled={section === SECTIONS[SECTIONS.length - 1].key}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !form.name.trim()}>
              <Save className="h-4 w-4 mr-1" />
              {saving ? "Saving…" : editing ? "Update Item" : "Add Item"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function rowToForm(row: any | null): FormState {
  if (!row) return { ...EMPTY };
  return {
    ...EMPTY,
    name: row.name ?? "",
    sku: row.sku ?? "",
    barcode: row.barcode ?? "",
    manufacturer_part_number: row.manufacturer_part_number ?? "",
    main_category: row.main_category ?? "",
    category: row.category ?? "",
    status: row.status ?? "active",
    manufacturer: row.manufacturer ?? "",
    supplier: row.supplier ?? "",
    brand: row.brand ?? "",
    description: row.description ?? "",
    cost: row.cost != null ? String(row.cost) : "",
    price: row.price != null ? String(row.price) : "",
    markup_percentage: row.markup_percentage != null ? String(row.markup_percentage) : "",
    date_purchased: row.date_purchased ?? "",
    last_price_update: row.last_price_update ?? "",
    qty_on_hand: row.qty_on_hand != null ? String(row.qty_on_hand) : "0",
    reorder_at: row.reorder_at != null ? String(row.reorder_at) : "",
    unit: row.unit ?? "pc",
    location: row.location ?? "",
    qty_on_hold: row.qty_on_hold != null ? String(row.qty_on_hold) : "0",
    qty_on_order: row.qty_on_order != null ? String(row.qty_on_order) : "0",
    min_stock_level: row.min_stock_level != null ? String(row.min_stock_level) : "",
    max_stock_level: row.max_stock_level != null ? String(row.max_stock_level) : "",
    weight_lbs: row.weight_lbs != null ? String(row.weight_lbs) : "",
    dimensions: row.dimensions ?? "",
    color: row.color ?? "",
    material: row.material ?? "",
    model_year: row.model_year != null ? String(row.model_year) : "",
    oem_part_number: row.oem_part_number ?? "",
    warranty_period: row.warranty_period ?? "",
    universal_part: !!row.universal_part,
    tax_rate: row.tax_rate != null ? String(row.tax_rate) : "",
    environmental_fee: row.environmental_fee != null ? String(row.environmental_fee) : "",
    core_charge: row.core_charge != null ? String(row.core_charge) : "",
    hazmat_fee: row.hazmat_fee != null ? String(row.hazmat_fee) : "",
    tax_exempt: !!row.tax_exempt,
    date_last_ordered: row.date_last_ordered ?? "",
    date_last_used: row.date_last_used ?? "",
    notes: row.notes ?? "",
    web_links: Array.isArray(row.web_links) ? row.web_links : [],
    network_visible: row.network_visible ?? true,
  };
}

/* --- small layout helpers --- */
function Section({
  title, tone, icon, children,
}: { title: string; tone?: "emerald"; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className={cn(
        "px-5 py-3 border-b font-semibold flex items-center gap-2",
        tone === "emerald" ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-muted/40",
      )}>
        {icon}
        {title}
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}
function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>;
}
function Grid3({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{children}</div>;
}
function Field({
  label, required, hint, children,
}: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-sm">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
