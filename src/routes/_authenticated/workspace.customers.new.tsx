import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Loader2, UserPlus } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { smSupabase } from "@/lib/shop-manager/db";

export const Route = createFileRoute("/_authenticated/workspace/customers/new")({
  head: () => ({
    meta: [
      { title: "New Customer — Shop Manager" },
      { name: "description", content: "Add a customer to your shop." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NewCustomerPage,
});

function NewCustomerPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    company: "",
    address: "",
    city: "",
    state: "",
    postal_code: "",
    country: "",
    notes: "",
    is_fleet: false,
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast.error("First and last name are required.");
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

      const payload = {
        shop_id,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        company: form.company.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        postal_code: form.postal_code.trim() || null,
        country: form.country.trim() || null,
        notes: form.notes.trim() || null,
        is_fleet: form.is_fleet,
      };

      const { data, error } = await (smSupabase as any)
        .from("customers")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;

      toast.success("Customer created.");
      router.navigate({
        to: "/shop/customers",
        search: { new: (data as any)?.id },
      } as any);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create customer.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/shop/customers">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to customers
          </Link>
        </Button>

        <div className="mb-6 flex items-center gap-3">
          <UserPlus className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">New Customer</h1>
            <p className="text-muted-foreground">
              Add a customer to your shop.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="first_name">First name *</Label>
                <Input
                  id="first_name"
                  value={form.first_name}
                  onChange={(e) => set("first_name", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="last_name">Last name *</Label>
                <Input
                  id="last_name"
                  value={form.last_name}
                  onChange={(e) => set("last_name", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={form.company}
                  onChange={(e) => set("company", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Address</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="address">Street</Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="state">State / Region</Label>
                <Input
                  id="state"
                  value={form.state}
                  onChange={(e) => set("state", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="postal_code">Postal code</Label>
                <Input
                  id="postal_code"
                  value={form.postal_code}
                  onChange={(e) => set("postal_code", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={form.country}
                  onChange={(e) => set("country", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <Label htmlFor="is_fleet">Fleet account</Label>
                  <p className="text-sm text-muted-foreground">
                    Turn on if this customer manages multiple vehicles.
                  </p>
                </div>
                <Switch
                  id="is_fleet"
                  checked={form.is_fleet}
                  onCheckedChange={(v) => set("is_fleet", Boolean(v))}
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  rows={4}
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button asChild variant="ghost" type="button">
              <Link to="/shop/customers">Cancel</Link>
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                "Create customer"
              )}
            </Button>
          </div>
        </form>
      </div>
    </SiteLayout>
  );
}
