import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Wrench } from "lucide-react";
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

export const Route = createFileRoute("/_authenticated/shop/work-orders/new")({
  head: () => ({
    meta: [
      { title: "New Work Order — Shop Manager" },
      { name: "description", content: "Open a new repair job." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NewWorkOrderPage,
});

type CustomerOption = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};
type VehicleOption = {
  id: string;
  customer_id: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  license_plate: string | null;
};

async function fetchCustomerOptions(): Promise<CustomerOption[]> {
  const { data, error } = await (smSupabase as any)
    .from("customers")
    .select("id, first_name, last_name")
    .order("last_name", { ascending: true })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as CustomerOption[];
}
async function fetchVehiclesForCustomer(
  customerId: string | null,
): Promise<VehicleOption[]> {
  if (!customerId) return [];
  const { data, error } = await (smSupabase as any)
    .from("vehicles")
    .select("id, customer_id, year, make, model, license_plate")
    .eq("customer_id", customerId)
    .limit(200);
  if (error) throw error;
  return (data ?? []) as VehicleOption[];
}

const STATUS_OPTIONS = [
  "pending",
  "scheduled",
  "in_progress",
  "waiting_on_parts",
  "completed",
  "cancelled",
];
const PRIORITY_OPTIONS = ["low", "normal", "high", "urgent"];

function NewWorkOrderPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customer_id: "",
    vehicle_id: "",
    status: "pending",
    priority: "normal",
    service_type: "",
    customer_complaint: "",
    description: "",
    estimated_hours: "",
    initial_mileage: "",
  });

  const set = <K extends keyof typeof form>(k: K, v: string) =>
    setForm((s) => ({ ...s, [k]: v }));

  const { data: customers = [] } = useQuery({
    queryKey: ["shop-manager", "customers", "options"],
    queryFn: fetchCustomerOptions,
  });
  const { data: vehicles = [] } = useQuery({
    queryKey: ["shop-manager", "vehicles", "for-customer", form.customer_id],
    queryFn: () => fetchVehiclesForCustomer(form.customer_id || null),
    enabled: !!form.customer_id,
  });

  useEffect(() => {
    setForm((s) => ({ ...s, vehicle_id: "" }));
  }, [form.customer_id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customer_complaint.trim() && !form.description.trim()) {
      toast.error("Add a customer complaint or description.");
      return;
    }
    setSaving(true);
    try {
      const { data: shopIdRes, error: shopErr } = await (smSupabase as any).rpc(
        "get_current_user_shop_id",
      );
      if (shopErr) throw shopErr;
      const shop_id = shopIdRes as string | null;
      if (!shop_id) {
        toast.error("No shop is provisioned for your account yet.");
        setSaving(false);
        return;
      }

      const payload: Record<string, unknown> = {
        shop_id,
        status: form.status,
        priority: form.priority || null,
        service_type: form.service_type.trim() || null,
        customer_complaint: form.customer_complaint.trim() || null,
        description: form.description.trim() || null,
        customer_id: form.customer_id || null,
        vehicle_id: form.vehicle_id || null,
        estimated_hours: form.estimated_hours
          ? Number(form.estimated_hours)
          : null,
        initial_mileage: form.initial_mileage
          ? Number(form.initial_mileage.replace(/,/g, ""))
          : null,
      };

      const { data, error } = await (smSupabase as any)
        .from("work_orders")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;

      toast.success("Work order created.");
      const id = (data as any)?.id;
      if (id) {
        router.navigate({
          to: "/shop/work-orders/$id",
          params: { id },
        });
      } else {
        router.navigate({ to: "/shop/work-orders" });
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create work order.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/shop/work-orders">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to work orders
          </Link>
        </Button>

        <div className="mb-6 flex items-center gap-3">
          <Wrench className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">New Work Order</h1>
            <p className="text-muted-foreground">
              Open a new repair job for your shop.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Customer & vehicle</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Customer</Label>
                <Select
                  value={form.customer_id}
                  onValueChange={(v) => set("customer_id", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer…" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {`${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() ||
                          c.id.slice(0, 8)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="mt-1 text-xs text-muted-foreground">
                  <Link to="/shop/customers/new" className="underline">
                    + Add a new customer
                  </Link>
                </div>
              </div>
              <div>
                <Label>Vehicle</Label>
                <Select
                  value={form.vehicle_id}
                  onValueChange={(v) => set("vehicle_id", v)}
                  disabled={!form.customer_id}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        form.customer_id
                          ? "Select vehicle…"
                          : "Pick a customer first"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {`${v.year ?? ""} ${v.make ?? ""} ${v.model ?? ""}`.trim() ||
                          v.license_plate ||
                          v.id.slice(0, 8)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Job details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => set("status", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => set("priority", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="service_type">Service type</Label>
                <Input
                  id="service_type"
                  placeholder="e.g. Oil change, Brake inspection…"
                  value={form.service_type}
                  onChange={(e) => set("service_type", e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="customer_complaint">Customer complaint</Label>
                <Textarea
                  id="customer_complaint"
                  rows={3}
                  value={form.customer_complaint}
                  onChange={(e) => set("customer_complaint", e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="description">Description / scope</Label>
                <Textarea
                  id="description"
                  rows={3}
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="estimated_hours">Estimated hours</Label>
                <Input
                  id="estimated_hours"
                  type="number"
                  step="0.25"
                  min="0"
                  value={form.estimated_hours}
                  onChange={(e) => set("estimated_hours", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="initial_mileage">Mileage in</Label>
                <Input
                  id="initial_mileage"
                  inputMode="numeric"
                  value={form.initial_mileage}
                  onChange={(e) => set("initial_mileage", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button asChild variant="ghost" type="button">
              <Link to="/shop/work-orders">Cancel</Link>
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                "Create work order"
              )}
            </Button>
          </div>
        </form>
      </div>
    </SiteLayout>
  );
}
