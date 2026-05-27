import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  adminListProducts, adminUpsertProduct, adminDeleteProduct,
  adminListNetworks, adminUpsertNetwork,
  adminProductLinks, adminUpsertLink, adminDeleteLink,
  adminListFitment, adminUpsertFitment, adminDeleteFitment,
  listShopCategories, scrapeShopUrl,
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
import { Pencil, Trash2, Plus, Link as LinkIcon, ExternalLink, AlertTriangle, Sparkles, Car } from "lucide-react";
import { AD_NETWORKS, AFFILIATE_PROGRAMS, COUNTRY_ORDER, type DirectoryEntry } from "@/lib/monetization-directory";
import { detectNetworkSlug, cleanShopUrl, urlMatchesNetwork } from "@/lib/shop-url";

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
  const [fitmentFor, setFitmentFor] = useState<any | null>(null);

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
                        <Button size="sm" variant="ghost" title="Outbound links" onClick={() => setLinksFor(p)}><LinkIcon className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" title="Vehicle fitment" onClick={() => setFitmentFor(p)}><Car className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" title="Edit" onClick={() => setEditing(p)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" title="Delete" onClick={() => { if (confirm(`Delete "${p.title}"?`)) del.mutate(p.id); }}><Trash2 className="h-4 w-4" /></Button>
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
      {fitmentFor && <FitmentDialog product={fitmentFor} onClose={() => setFitmentFor(null)} />}
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
    universal_fit: initial.universal_fit ?? false,
  });
  const [importUrl, setImportUrl] = useState("");
  const [importInfo, setImportInfo] = useState<{ networkSlug: string | null; cleanedUrl: string; networkId: string | null; resolvedFrom: string | null } | null>(null);

  const importMut = useMutation({
    mutationFn: () => scrapeShopUrl({ data: { url: importUrl } }),
    onSuccess: (res: any) => {
      if (res.error) { toast.error(res.error); return; }
      const s = res.suggested ?? {};
      setForm((f) => ({
        ...f,
        title: f.title || s.title || "",
        brand: f.brand || s.brand || "",
        description: f.description || s.description || "",
        image_url: f.image_url || s.image_url || "",
        price_php: f.price_php ?? s.price_php ?? null,
        category_id: f.category_id ?? s.category_id ?? null,
      }));
      setImportInfo({ networkSlug: res.networkSlug, cleanedUrl: res.cleanedUrl, networkId: res.networkId, resolvedFrom: res.resolvedFrom ?? null });
      toast.success("Fetched — review and save.");
    },
    onError: (e: any) => toast.error(e.message ?? "Fetch failed"),
  });

  const mut = useMutation({
    mutationFn: async () => {
      const saved = await adminUpsertProduct({ data: {
        ...form,
        price_php: form.price_php ? Number(form.price_php) : null,
      } as any });
      // Auto-stage affiliate link if we imported from a recognized network
      if (importInfo?.networkId && importInfo.cleanedUrl && saved?.id) {
        try {
          await adminUpsertLink({ data: {
            product_id: saved.id,
            network_id: importInfo.networkId,
            url: importInfo.cleanedUrl,
          } as any });
        } catch (e: any) {
          toast.warning(`Saved product, but couldn’t add link: ${e?.message ?? "error"}`);
        }
      }
      return saved;
    },
    onSuccess: () => { toast.success("Saved"); onSaved(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{form.id ? "Edit product" : "New product"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-primary" /> Import from affiliate URL
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="Paste Shopee / Lazada / TikTok / Amazon product URL…"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
              />
              <Button
                type="button"
                onClick={() => importMut.mutate()}
                disabled={!importUrl || importMut.isPending}
              >
                {importMut.isPending ? "Fetching…" : "Fetch"}
              </Button>
            </div>
            {importInfo && (
              <div className="space-y-1 text-xs text-muted-foreground">
                {importInfo.resolvedFrom && (
                  <p className="break-all">Resolved short link → <span className="font-mono">{importInfo.cleanedUrl}</span></p>
                )}
                <p>
                  {importInfo.networkSlug
                    ? <>Detected <strong>{importInfo.networkSlug}</strong>{importInfo.networkId ? " · network linked ✓" : " · no matching active network"}</>
                    : "Unknown host — fields pre-filled from page metadata."}
                  {" "}Empty fields below were auto-filled; review before saving.
                </p>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Slug (url)</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="meguiars-gold-class-wax" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Brand</Label><Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></div>
            <div><Label>Price (₱, optional)</Label><Input type="number" value={form.price_php ?? ""} onChange={(e) => setForm({ ...form, price_php: e.target.value as any })} /></div>
          </div>
          <div>
            <Label>Image URL</Label>
            <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
            {form.image_url && (
              <img src={form.image_url} alt="" className="mt-2 h-24 w-24 rounded border object-cover" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
            )}
          </div>
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
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2"><Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />Active</label>
            <label className="flex items-center gap-2"><Switch checked={form.featured} onCheckedChange={(v) => setForm({ ...form, featured: v })} />Featured</label>
            <label className="flex items-center gap-2" title="Show for all vehicles regardless of fitment rules">
              <Switch checked={form.universal_fit} onCheckedChange={(v) => setForm({ ...form, universal_fit: v })} />Universal fit
            </label>
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
  const [touchedNetwork, setTouchedNetwork] = useState(false);

  const networks = (netData?.networks ?? []) as any[];
  const activeNetworks = networks.filter((n) => n.active);
  const selectedNetwork = networks.find((n) => n.id === networkId);
  const detectedSlug = url ? detectNetworkSlug(url) : null;
  const detectedNetwork = detectedSlug ? activeNetworks.find((n) => n.slug === detectedSlug) : null;
  const mismatch = !!(selectedNetwork && detectedSlug && detectedSlug !== selectedNetwork.slug);

  // Auto-select network from pasted URL when the user hasn't picked one manually.
  function handleUrlChange(next: string) {
    setUrl(next);
    if (touchedNetwork) return;
    const slug = detectNetworkSlug(next);
    if (slug) {
      const match = activeNetworks.find((n) => n.slug === slug);
      if (match && match.id !== networkId) setNetworkId(match.id);
    }
  }

  function handleClean() {
    const cleaned = cleanShopUrl(url);
    if (cleaned !== url) {
      setUrl(cleaned);
      toast.success("URL cleaned");
    } else {
      toast.info("URL already clean");
    }
  }

  const add = useMutation({
    mutationFn: () => {
      const finalUrl = cleanShopUrl(url);
      if (selectedNetwork && !urlMatchesNetwork(finalUrl, selectedNetwork.slug)) {
        throw new Error(`URL host does not match ${selectedNetwork.name}.`);
      }
      return adminUpsertLink({ data: { product_id: product.id, network_id: networkId, url: finalUrl } as any });
    },
    onSuccess: () => {
      toast.success("Link saved");
      setUrl(""); setNetworkId(""); setTouchedNetwork(false);
      qc.invalidateQueries({ queryKey: ["admin-product-links", product.id] });
    },
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
            <div className="space-y-1">
              <Input
                placeholder="Paste Shopee / Lazada / TikTok / Amazon URL…"
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
              />
              {url && (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {detectedNetwork ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <Sparkles className="h-3 w-3" />Detected: {detectedNetwork.name}
                    </span>
                  ) : detectedSlug ? (
                    <span className="text-amber-600">Detected slug “{detectedSlug}” — no matching active network. Add one in Networks.</span>
                  ) : (
                    <span className="text-muted-foreground">Unknown host — pick a network manually.</span>
                  )}
                  <button type="button" onClick={handleClean} className="ml-auto text-primary underline-offset-2 hover:underline">
                    Clean tracking params
                  </button>
                </div>
              )}
            </div>
            <Select
              value={networkId}
              onValueChange={(v) => { setNetworkId(v); setTouchedNetwork(true); }}
            >
              <SelectTrigger><SelectValue placeholder="Choose network" /></SelectTrigger>
              <SelectContent>
                {activeNetworks.map((n: any) => (
                  <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {mismatch && (
              <p className="flex items-center gap-1 text-xs text-amber-600">
                <AlertTriangle className="h-3 w-3" />
                URL looks like {detectedSlug}, but you picked {selectedNetwork?.name}.
              </p>
            )}
            <Button onClick={() => add.mutate()} disabled={!networkId || !url || add.isPending} size="sm">
              {add.isPending ? "Saving…" : "Add"}
            </Button>
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

function FitmentDialog({ product, onClose }: any) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-product-fitment", product.id],
    queryFn: () => adminListFitment({ data: { productId: product.id } }),
  });
  const [form, setForm] = useState({
    category: "car" as "car" | "motorcycle",
    make: "",
    model: "",
    year_start: "" as string,
    year_end: "" as string,
    notes: "",
  });

  const add = useMutation({
    mutationFn: () => adminUpsertFitment({ data: {
      product_id: product.id,
      category: form.category,
      make: form.make || null,
      model: form.model || null,
      year_start: form.year_start ? Number(form.year_start) : null,
      year_end: form.year_end ? Number(form.year_end) : null,
      notes: form.notes || null,
    } as any }),
    onSuccess: () => {
      toast.success("Fitment added");
      setForm({ category: "car", make: "", model: "", year_start: "", year_end: "", notes: "" });
      qc.invalidateQueries({ queryKey: ["admin-product-fitment", product.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => adminDeleteFitment({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-product-fitment", product.id] }),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Vehicle fitment — {product.title}</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground">
          Add the vehicles this product fits. Leave make or model blank to match any value. Year range is optional.
        </p>
        <div className="space-y-2">
          {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (data?.fitment ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No fitment rules yet. Enable “Universal fit” on the product if it fits everything.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs uppercase text-muted-foreground">
                  <tr><th className="p-2">Type</th><th className="p-2">Make</th><th className="p-2">Model</th><th className="p-2">Years</th><th className="p-2">Notes</th><th className="p-2"></th></tr>
                </thead>
                <tbody>
                  {(data?.fitment ?? []).map((f: any) => (
                    <tr key={f.id} className="border-b">
                      <td className="p-2">{f.category}</td>
                      <td className="p-2">{f.make ?? <span className="text-muted-foreground">any</span>}</td>
                      <td className="p-2">{f.model ?? <span className="text-muted-foreground">any</span>}</td>
                      <td className="p-2">{f.year_start || f.year_end ? `${f.year_start ?? "…"}–${f.year_end ?? "…"}` : "—"}</td>
                      <td className="p-2 text-xs text-muted-foreground">{f.notes ?? ""}</td>
                      <td className="p-2"><Button size="sm" variant="ghost" onClick={() => del.mutate(f.id)}><Trash2 className="h-4 w-4" /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="rounded border p-3 space-y-2">
          <p className="text-sm font-medium">Add fitment rule</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <Label>Type</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="car">Car</SelectItem>
                  <SelectItem value="motorcycle">Motorcycle</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Make</Label><Input value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} placeholder="Toyota" /></div>
            <div><Label>Model</Label><Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="Vios" /></div>
            <div><Label>Year start</Label><Input type="number" value={form.year_start} onChange={(e) => setForm({ ...form, year_start: e.target.value })} /></div>
            <div><Label>Year end</Label><Input type="number" value={form.year_end} onChange={(e) => setForm({ ...form, year_end: e.target.value })} /></div>
            <div className="sm:col-span-3"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. 1.5L variant only" /></div>
          </div>
          <Button onClick={() => add.mutate()} disabled={add.isPending} size="sm">
            {add.isPending ? "Saving…" : "Add fitment"}
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
