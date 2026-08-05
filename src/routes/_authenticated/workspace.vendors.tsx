import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Truck, Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { smSupabase } from "@/lib/shop-manager/db";

export const Route = createFileRoute("/_authenticated/workspace/vendors")({
  head: () => ({
    meta: [
      { title: "Vendors — Shop Manager" },
      { name: "description", content: "Suppliers, bills, and vendor payments." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VendorsPage,
  errorComponent: ({ error, reset }) => (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold">Vendors</h1>
        <p className="mt-2 text-destructive">{String((error as any)?.message ?? error)}</p>
        <Button className="mt-4" onClick={reset}>Retry</Button>
      </div>
    </SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout><div className="mx-auto max-w-4xl px-4 py-10">Not found.</div></SiteLayout>
  ),
});

function VendorsPage() {
  const [q, setQ] = useState("");
  const { data = [], isLoading } = useQuery({
    queryKey: ["shop-manager", "suppliers"],
    queryFn: async () => {
      const { data, error } = await (smSupabase as any)
        .from("suppliers")
        .select("id,name,contact_person,email,phone,payment_terms,is_active,rating")
        .order("name", { ascending: true })
        .limit(1000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = q
    ? data.filter((s: any) => `${s.name ?? ""} ${s.contact_person ?? ""} ${s.email ?? ""}`.toLowerCase().includes(q.toLowerCase()))
    : data;

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Truck className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Vendors</h1>
              <p className="text-muted-foreground">Suppliers, bills, and payments.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm"><Link to="/shop/vendor-bills">Bills</Link></Button>
            <NewVendorDialog />
          </div>
        </div>

        <div className="mb-4 relative max-w-sm">
          <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search vendors…" className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">No vendors yet.</CardContent></Card>
        ) : (
          <div className="grid gap-2">
            {filtered.map((s: any) => (
              <Card key={s.id} className="hover:border-primary/50 transition">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3">
                  <div>
                    <CardTitle className="text-base">{s.name}</CardTitle>
                    <div className="text-xs text-muted-foreground mt-1">
                      {[s.contact_person, s.email, s.phone].filter(Boolean).join(" · ") || "—"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.payment_terms ? <Badge variant="outline">{s.payment_terms}</Badge> : null}
                    <Badge variant={s.is_active === false ? "destructive" : "secondary"}>
                      {s.is_active === false ? "inactive" : "active"}
                    </Badge>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}

function NewVendorDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", contact_person: "", email: "", phone: "", address: "",
    payment_terms: "Net 30", lead_time_days: "", minimum_order_amount: "",
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Name is required");
      const { error } = await (smSupabase as any).from("suppliers").insert({
        name: form.name.trim(),
        contact_person: form.contact_person || null,
        email: form.email || null,
        phone: form.phone || null,
        address: form.address || null,
        payment_terms: form.payment_terms || null,
        lead_time_days: form.lead_time_days ? Number(form.lead_time_days) : null,
        minimum_order_amount: form.minimum_order_amount ? Number(form.minimum_order_amount) : null,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vendor added");
      qc.invalidateQueries({ queryKey: ["shop-manager", "suppliers"] });
      setOpen(false);
      setForm({ name: "", contact_person: "", email: "", phone: "", address: "", payment_terms: "Net 30", lead_time_days: "", minimum_order_amount: "" });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to save"),
  });

  const set = (k: keyof typeof form) => (e: any) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-1 h-4 w-4" /> New Vendor</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New vendor</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name *</Label><Input value={form.name} onChange={set("name")} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Contact</Label><Input value={form.contact_person} onChange={set("contact_person")} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={set("phone")} /></div>
          </div>
          <div><Label>Email</Label><Input type="email" value={form.email} onChange={set("email")} /></div>
          <div><Label>Address</Label><Textarea rows={2} value={form.address} onChange={set("address")} /></div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label>Terms</Label><Input value={form.payment_terms} onChange={set("payment_terms")} /></div>
            <div><Label>Lead (days)</Label><Input type="number" value={form.lead_time_days} onChange={set("lead_time_days")} /></div>
            <div><Label>Min order</Label><Input type="number" value={form.minimum_order_amount} onChange={set("minimum_order_amount")} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            {create.isPending ? "Saving…" : "Save vendor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
