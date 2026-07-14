import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileText, Loader2, Plus, Trash2 } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { smSupabase } from "@/lib/shop-manager/db";

export const Route = createFileRoute("/_authenticated/shop/quotes/new")({
  head: () => ({
    meta: [
      { title: "New Quote — Shop Manager" },
      { name: "description", content: "Create a new customer quote." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NewQuotePage,
});

type CustomerOption = { id: string; first_name: string | null; last_name: string | null };
type VehicleOption = {
  id: string;
  customer_id: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
};

type Line = {
  key: string;
  name: string;
  description: string;
  quantity: string;
  unit_price: string;
  item_type: "labor" | "part" | "other";
};

function newLine(): Line {
  return {
    key: Math.random().toString(36).slice(2),
    name: "",
    description: "",
    quantity: "1",
    unit_price: "0",
    item_type: "part",
  };
}

function NewQuotePage() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [customerId, setCustomerId] = useState<string>("");
  const [vehicleId, setVehicleId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [taxRate, setTaxRate] = useState("12");
  const [expiry, setExpiry] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [items, setItems] = useState<Line[]>([newLine()]);

  const { data: customers = [] } = useQuery({
    queryKey: ["shop-manager", "quotes", "new", "customers"],
    queryFn: async (): Promise<CustomerOption[]> => {
      const { data, error } = await (smSupabase as any)
        .from("customers")
        .select("id, first_name, last_name")
        .order("last_name", { ascending: true })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: vehicles = [] } = useQuery({
    queryKey: ["shop-manager", "quotes", "new", "vehicles", customerId],
    enabled: !!customerId,
    queryFn: async (): Promise<VehicleOption[]> => {
      const { data, error } = await (smSupabase as any)
        .from("vehicles")
        .select("id, customer_id, year, make, model")
        .eq("customer_id", customerId)
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    setVehicleId("");
  }, [customerId]);

  const totals = useMemo(() => {
    const subtotal = items.reduce(
      (s, it) => s + Number(it.quantity || 0) * Number(it.unit_price || 0),
      0,
    );
    const rate = Number(taxRate || 0) / 100;
    const tax = subtotal * rate;
    return { subtotal, tax, total: subtotal + tax };
  }, [items, taxRate]);

  async function submit() {
    if (!customerId) {
      toast.error("Pick a customer");
      return;
    }
    setSaving(true);
    try {
      const { data: shopIdData, error: shopErr } = await (smSupabase as any).rpc(
        "get_current_user_shop_id",
      );
      if (shopErr) throw shopErr;

      const qNumber = `Q-${Date.now().toString().slice(-8)}`;
      const { data: quote, error: qErr } = await (smSupabase as any)
        .from("quotes")
        .insert({
          quote_number: qNumber,
          customer_id: customerId,
          vehicle_id: vehicleId || null,
          status: "draft",
          subtotal: totals.subtotal,
          tax_rate: Number(taxRate || 0),
          tax_amount: totals.tax,
          total_amount: totals.total,
          expiry_date: expiry || null,
          notes: notes.trim() || null,
          terms_conditions: terms.trim() || null,
          shop_id: shopIdData ?? undefined,
        })
        .select("id")
        .single();
      if (qErr) throw qErr;

      const rows = items
        .filter((l) => l.name.trim())
        .map((l, idx) => ({
          quote_id: quote.id,
          name: l.name.trim(),
          description: l.description.trim() || null,
          category: l.item_type,
          quantity: Number(l.quantity || 0),
          unit_price: Number(l.unit_price || 0),
          total_price: Number(l.quantity || 0) * Number(l.unit_price || 0),
          item_type: l.item_type,
          display_order: idx,
        }));
      if (rows.length) {
        const { error: iErr } = await (smSupabase as any).from("quote_items").insert(rows);
        if (iErr) throw iErr;
      }

      toast.success("Quote created");
      navigate({ to: "/shop/quotes/$id", params: { id: quote.id } });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create quote");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-6 flex items-center gap-3">
          <FileText className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">New Quote</h1>
            <p className="text-muted-foreground">Draft an estimate for a customer.</p>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader><CardTitle className="text-base">Customer & vehicle</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Customer *</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger><SelectValue placeholder="Pick a customer…" /></SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {`${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || c.id.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vehicle</Label>
              <Select value={vehicleId} onValueChange={setVehicleId} disabled={!customerId}>
                <SelectTrigger><SelectValue placeholder={customerId ? "(optional)" : "Pick customer first"} /></SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {[v.year, v.make, v.model].filter(Boolean).join(" ") || v.id.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Expiry date</Label>
              <Input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
            </div>
            <div>
              <Label>Tax rate (%)</Label>
              <Input type="number" step="0.01" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Line items</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setItems((x) => [...x, newLine()])}>
              <Plus className="mr-1 h-4 w-4" /> Add line
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((l, idx) => (
              <div key={l.key} className="grid gap-2 sm:grid-cols-12 rounded border p-3">
                <div className="sm:col-span-4">
                  <Label className="text-xs">Name</Label>
                  <Input value={l.name} onChange={(e) => setItems((xs) => xs.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))} />
                </div>
                <div className="sm:col-span-3">
                  <Label className="text-xs">Type</Label>
                  <Select value={l.item_type} onValueChange={(v: any) => setItems((xs) => xs.map((x, i) => i === idx ? { ...x, item_type: v } : x))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="labor">Labor</SelectItem>
                      <SelectItem value="part">Part</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Qty</Label>
                  <Input type="number" step="0.01" value={l.quantity} onChange={(e) => setItems((xs) => xs.map((x, i) => i === idx ? { ...x, quantity: e.target.value } : x))} />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Unit ₱</Label>
                  <Input type="number" step="0.01" value={l.unit_price} onChange={(e) => setItems((xs) => xs.map((x, i) => i === idx ? { ...x, unit_price: e.target.value } : x))} />
                </div>
                <div className="sm:col-span-1 flex items-end justify-end">
                  <Button variant="ghost" size="icon" onClick={() => setItems((xs) => xs.filter((_, i) => i !== idx))} disabled={items.length === 1}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="sm:col-span-12">
                  <Label className="text-xs">Description</Label>
                  <Input value={l.description} onChange={(e) => setItems((xs) => xs.map((x, i) => i === idx ? { ...x, description: e.target.value } : x))} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader><CardTitle className="text-base">Notes & terms</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Notes</Label>
              <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div>
              <Label>Terms & conditions</Label>
              <Textarea rows={4} value={terms} onChange={(e) => setTerms(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardContent className="pt-6 grid grid-cols-3 gap-4 text-sm">
            <div><div className="text-muted-foreground">Subtotal</div><div className="text-lg font-bold">₱{totals.subtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div></div>
            <div><div className="text-muted-foreground">Tax</div><div className="text-lg font-bold">₱{totals.tax.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div></div>
            <div><div className="text-muted-foreground">Total</div><div className="text-lg font-bold">₱{totals.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div></div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link to="/shop/quotes"><ArrowLeft className="mr-1 h-4 w-4" /> Cancel</Link>
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create quote
          </Button>
        </div>
      </div>
    </SiteLayout>
  );
}
