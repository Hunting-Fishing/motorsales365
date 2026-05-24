import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  adminListProducts, adminUpsertProduct, adminDeleteProduct,
  adminListNetworks, adminUpsertNetwork,
  adminProductLinks, adminUpsertLink, adminDeleteLink,
  listShopCategories,
} from "@/lib/shop.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Link as LinkIcon, ExternalLink } from "lucide-react";
import { AD_NETWORKS, AFFILIATE_PROGRAMS, COUNTRY_ORDER, type DirectoryEntry } from "@/lib/monetization-directory";

export const Route = createFileRoute("/admin/shop")({
  component: AdminShop,
});

function AdminShop() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Affiliate Shop</h1>
        <p className="text-muted-foreground">Manage curated products, affiliate networks, and outbound links.</p>
      </div>
      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="networks">Networks</TabsTrigger>
          <TabsTrigger value="directory">Sign-up directory</TabsTrigger>
        </TabsList>
        <TabsContent value="products" className="mt-4"><ProductsTab /></TabsContent>
        <TabsContent value="networks" className="mt-4"><NetworksTab /></TabsContent>
        <TabsContent value="directory" className="mt-4"><DirectoryTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function DirectoryTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Advertisement networks — earn from ads on our pages</CardTitle>
          <p className="text-sm text-muted-foreground">
            Sign up as a publisher. Once approved, drop their script into the site and earn passive CPM/CPC revenue from impressions and clicks — no user payments required. Grouped by primary market, Philippines first.
          </p>
        </CardHeader>
        <CardContent><GroupedDirectory entries={AD_NETWORKS} /></CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Affiliate programs — earn commission on outbound clicks</CardTitle>
          <p className="text-sm text-muted-foreground">
            Sign up, get your tracking ID, then add it under <strong>Networks</strong> as <code>tag_value</code>. The shop redirector (<code>/go/$productId</code>) automatically appends it to outbound URLs. Grouped by primary market for our PH-first → international rollout.
          </p>
        </CardHeader>
        <CardContent><GroupedDirectory entries={AFFILIATE_PROGRAMS} /></CardContent>
      </Card>
    </div>
  );
}

function GroupedDirectory({ entries }: { entries: DirectoryEntry[] }) {
  const grouped = COUNTRY_ORDER
    .map((country) => ({ country, items: entries.filter((e) => e.country === country) }))
    .filter((g) => g.items.length > 0);
  return (
    <div className="space-y-8">
      {grouped.map((g) => (
        <div key={g.country}>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {g.country} <span className="text-xs font-normal">({g.items.length})</span>
          </h3>
          <DirectoryTable entries={g.items} />
        </div>
      ))}
    </div>
  );
}

function DirectoryTable({ entries }: { entries: DirectoryEntry[] }) {
  const diffColor = (d: string) =>
    d === "easy" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
      : d === "medium" ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
      : "bg-rose-500/15 text-rose-700 dark:text-rose-400";
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="border-b text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="p-2">Program</th>
            <th className="p-2">Category</th>
            <th className="p-2">Payout</th>
            <th className="p-2">Approval</th>
            <th className="p-2">Notes</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.name} className="border-b align-top">
              <td className="p-2 font-medium">{e.name}</td>
              <td className="p-2 text-muted-foreground">{e.category}</td>
              <td className="p-2">{e.payout}</td>
              <td className="p-2"><span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${diffColor(e.difficulty)}`}>{e.difficulty}</span></td>
              <td className="p-2 text-xs text-muted-foreground max-w-md">{e.notes}</td>
              <td className="p-2">
                <a href={e.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline whitespace-nowrap">
                  Sign up <ExternalLink className="h-3 w-3" />
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


function ProductsTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-shop-products"], queryFn: () => adminListProducts() });
  const { data: catData } = useQuery({ queryKey: ["shop-cats"], queryFn: () => listShopCategories() });
  const [editing, setEditing] = useState<any | null>(null);
  const [linksFor, setLinksFor] = useState<any | null>(null);

  const del = useMutation({
    mutationFn: (id: string) => adminDeleteProduct({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-shop-products"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle>Products ({data?.products?.length ?? 0})</CardTitle>
        <Button onClick={() => setEditing({})}><Plus className="mr-1 h-4 w-4" />New product</Button>
      </CardHeader>
      <CardContent>
        {isLoading ? <p className="text-muted-foreground">Loading…</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b text-left text-xs uppercase text-muted-foreground">
                <tr><th className="p-2">Title</th><th className="p-2">Category</th><th className="p-2">Price</th><th className="p-2">Clicks</th><th className="p-2">Status</th><th className="p-2"></th></tr>
              </thead>
              <tbody>
                {(data?.products ?? []).map((p: any) => (
                  <tr key={p.id} className="border-b">
                    <td className="p-2 font-medium">{p.title}</td>
                    <td className="p-2 text-muted-foreground">{p.category?.name ?? "—"}</td>
                    <td className="p-2">{p.price_php ? `₱${Number(p.price_php).toLocaleString()}` : "—"}</td>
                    <td className="p-2">{p.click_count}</td>
                    <td className="p-2">
                      {p.active ? <Badge variant="secondary">Active</Badge> : <Badge variant="outline">Inactive</Badge>}
                      {p.featured && <Badge className="ml-1">Featured</Badge>}
                    </td>
                    <td className="p-2">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setLinksFor(p)}><LinkIcon className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(p)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Delete "${p.title}"?`)) del.mutate(p.id); }}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {editing && <ProductDialog
        initial={editing}
        categories={catData?.categories ?? []}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["admin-shop-products"] }); }}
      />}
      {linksFor && <LinksDialog product={linksFor} onClose={() => setLinksFor(null)} />}
    </Card>
  );
}

function ProductDialog({ initial, categories, onClose, onSaved }: any) {
  const [form, setForm] = useState({
    id: initial.id,
    slug: initial.slug ?? "",
    title: initial.title ?? "",
    description: initial.description ?? "",
    brand: initial.brand ?? "",
    image_url: initial.image_url ?? "",
    category_id: initial.category_id ?? null,
    price_php: initial.price_php ?? null,
    featured: initial.featured ?? false,
    active: initial.active ?? true,
  });
  const mut = useMutation({
    mutationFn: () => adminUpsertProduct({ data: {
      ...form,
      price_php: form.price_php ? Number(form.price_php) : null,
    } as any }),
    onSuccess: () => { toast.success("Saved"); onSaved(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{form.id ? "Edit product" : "New product"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Slug (url)</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="meguiars-gold-class-wax" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Brand</Label><Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></div>
            <div><Label>Price (₱, optional)</Label><Input type="number" value={form.price_php ?? ""} onChange={(e) => setForm({ ...form, price_php: e.target.value as any })} /></div>
          </div>
          <div><Label>Image URL</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></div>
          <div>
            <Label>Category</Label>
            <Select value={form.category_id ?? ""} onValueChange={(v) => setForm({ ...form, category_id: v || null })}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Description</Label><Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2"><Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />Active</label>
            <label className="flex items-center gap-2"><Switch checked={form.featured} onCheckedChange={(v) => setForm({ ...form, featured: v })} />Featured</label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>{mut.isPending ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LinksDialog({ product, onClose }: any) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-product-links", product.id], queryFn: () => adminProductLinks({ data: { productId: product.id } }) });
  const { data: netData } = useQuery({ queryKey: ["admin-networks"], queryFn: () => adminListNetworks() });
  const [networkId, setNetworkId] = useState<string>("");
  const [url, setUrl] = useState("");

  const add = useMutation({
    mutationFn: () => adminUpsertLink({ data: { product_id: product.id, network_id: networkId, url } as any }),
    onSuccess: () => { toast.success("Link saved"); setUrl(""); setNetworkId(""); qc.invalidateQueries({ queryKey: ["admin-product-links", product.id] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => adminDeleteLink({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-product-links", product.id] }),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Outbound links — {product.title}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {(data?.links ?? []).map((l: any) => (
            <div key={l.id} className="flex items-center gap-2 rounded border p-2 text-sm">
              <Badge variant="secondary">{l.network?.name}</Badge>
              <a href={l.url} target="_blank" rel="noopener" className="flex-1 truncate text-primary hover:underline">{l.url}</a>
              <Button size="sm" variant="ghost" onClick={() => del.mutate(l.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          <div className="rounded border p-3 space-y-2">
            <p className="text-sm font-medium">Add link</p>
            <Select value={networkId} onValueChange={setNetworkId}>
              <SelectTrigger><SelectValue placeholder="Choose network" /></SelectTrigger>
              <SelectContent>
                {(netData?.networks ?? []).filter((n: any) => n.active).map((n: any) => (
                  <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="https://shopee.ph/..." value={url} onChange={(e) => setUrl(e.target.value)} />
            <Button onClick={() => add.mutate()} disabled={!networkId || !url || add.isPending} size="sm">Add</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NetworksTab() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-networks"], queryFn: () => adminListNetworks() });
  const [editing, setEditing] = useState<any | null>(null);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle>Affiliate networks</CardTitle>
        <Button onClick={() => setEditing({})}><Plus className="mr-1 h-4 w-4" />New network</Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-2">Name</th><th className="p-2">Slug</th><th className="p-2">Tag param</th><th className="p-2">Tag value</th><th className="p-2">Status</th><th className="p-2"></th></tr>
          </thead>
          <tbody>
            {(data?.networks ?? []).map((n: any) => (
              <tr key={n.id} className="border-b">
                <td className="p-2 font-medium">{n.name}</td>
                <td className="p-2 text-muted-foreground">{n.slug}</td>
                <td className="p-2">{n.tag_param ?? "—"}</td>
                <td className="p-2 font-mono text-xs">{n.tag_value || <span className="text-amber-600">not set</span>}</td>
                <td className="p-2">{n.active ? <Badge variant="secondary">Active</Badge> : <Badge variant="outline">Off</Badge>}</td>
                <td className="p-2"><Button size="sm" variant="ghost" onClick={() => setEditing(n)}><Pencil className="h-4 w-4" /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Tag value is appended to outbound URLs via <code>tag_param</code>, or substituted into <code>deeplink_template</code> as <code>{`{{tag}}`}</code> and <code>{`{{url}}`}</code>.
        </p>
      </CardContent>
      {editing && <NetworkDialog initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["admin-networks"] }); }} />}
    </Card>
  );
}

function NetworkDialog({ initial, onClose, onSaved }: any) {
  const [form, setForm] = useState({
    id: initial.id,
    slug: initial.slug ?? "",
    name: initial.name ?? "",
    tag_param: initial.tag_param ?? "",
    tag_value: initial.tag_value ?? "",
    deeplink_template: initial.deeplink_template ?? "",
    active: initial.active ?? true,
    sort_order: initial.sort_order ?? 0,
  });
  const mut = useMutation({
    mutationFn: () => adminUpsertNetwork({ data: {
      ...form,
      tag_param: form.tag_param || null,
      tag_value: form.tag_value || null,
      deeplink_template: form.deeplink_template || null,
    } as any }),
    onSuccess: () => { toast.success("Saved"); onSaved(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>{form.id ? "Edit network" : "New network"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Tag param</Label><Input value={form.tag_param} onChange={(e) => setForm({ ...form, tag_param: e.target.value })} placeholder="af_siteid" /></div>
            <div><Label>Tag value (your affiliate ID)</Label><Input value={form.tag_value} onChange={(e) => setForm({ ...form, tag_value: e.target.value })} /></div>
          </div>
          <div>
            <Label>Deeplink template (optional)</Label>
            <Input value={form.deeplink_template} onChange={(e) => setForm({ ...form, deeplink_template: e.target.value })} placeholder="https://s.click.aliexpress.com/deep_link.htm?aff_short_key={{tag}}&dl_target_url={{url}}" />
          </div>
          <label className="flex items-center gap-2"><Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />Active</label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
