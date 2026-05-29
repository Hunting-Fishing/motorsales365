import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
  getMyBusinessPage,
  updateBusinessPageSettings,
  upsertBusinessService,
  deleteBusinessService,
  upsertBusinessProduct,
  deleteBusinessProduct,
  createBusinessPost,
  deleteBusinessPost,
  updateInquiryStatus,
} from "@/lib/business-pages.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { uploadWithRetry } from "@/lib/storage-upload";

import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Upload, ExternalLink, Image as ImageIcon } from "lucide-react";
import { WeekHoursEditor } from "@/components/business/hours-editor";
import { isStructuredHours, emptyStructured, TZ, type StructuredHours, type WeekSchedule } from "@/lib/business-hours";


export const Route = createFileRoute("/dashboard/businesses_/$id/edit")({
  component: EditBusinessPage,
});

async function uploadMedia(userId: string, businessId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${businessId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { publicUrl } = await uploadWithRetry({ bucket: "business-media", path, file, contentType: file.type });
  return publicUrl;
}

function EditBusinessPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const fetchPage = useServerFn(getMyBusinessPage);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["my-business-page", id],
    queryFn: () => fetchPage({ data: { businessId: id } }),
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Card className="p-6 text-center">
          <p className="text-sm">Please <Link to="/login" className="text-primary underline">sign in</Link> to edit your business page.</p>
        </Card>
      </div>
    );
  }

  if (isLoading || !data?.business) {
    return <div className="container mx-auto p-6 text-muted-foreground">Loading…</div>;
  }

  const biz: any = data.business;

  return (
    <div className="container mx-auto max-w-5xl px-3 py-4 md:px-6 md:py-8">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/dashboard/businesses" })}>
          <ArrowLeft className="mr-1 h-4 w-4" />Back
        </Button>
        <h1 className="font-display text-xl font-bold md:text-2xl">{biz.name}</h1>
        <Badge variant="outline">{biz.status}</Badge>
        <div className="ml-auto">
          <Button variant="outline" size="sm" asChild>
            <a href={`/businesses/${biz.slug}`} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-1 h-4 w-4" />View public page
            </a>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="flex w-full overflow-x-auto">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="tags">Tags</TabsTrigger>
          <TabsTrigger value="hours">Hours</TabsTrigger>

          <TabsTrigger value="services">Services ({data.services.length})</TabsTrigger>
          <TabsTrigger value="products">Products ({data.products.length})</TabsTrigger>
          <TabsTrigger value="posts">Posts ({data.posts.length})</TabsTrigger>
          <TabsTrigger value="inquiries">
            Inquiries
            {data.inquiries.filter((i: any) => i.status === "new").length > 0 && (
              <Badge className="ml-2 h-5 px-1.5 text-xs" variant="destructive">
                {data.inquiries.filter((i: any) => i.status === "new").length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab biz={biz} userId={user.id} onSaved={refetch} />
        </TabsContent>
        <TabsContent value="tags">
          <TagsTab businessId={biz.id} typeSlug={biz.type_slug} />
        </TabsContent>
        <TabsContent value="hours">
          <HoursTab biz={biz} onSaved={refetch} />
        </TabsContent>

        <TabsContent value="services">
          <ServicesTab businessId={biz.id} userId={user.id} services={data.services} onChange={refetch} />
        </TabsContent>
        <TabsContent value="products">
          <ProductsTab businessId={biz.id} userId={user.id} products={data.products} onChange={refetch} />
        </TabsContent>
        <TabsContent value="posts">
          <PostsTab businessId={biz.id} userId={user.id} posts={data.posts} onChange={refetch} />
        </TabsContent>
        <TabsContent value="inquiries">
          <InquiriesTab businessId={biz.id} inquiries={data.inquiries} onChange={refetch} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------------- TAGS ---------------- */

type TagRow = { slug: string; label: string; type_slug: string | null; category: string | null; sort_order: number; is_popular: boolean };

const CATEGORY_LABELS: Record<string, string> = {
  fuel_grade: "Fuel grades / octane (RON & diesel)",
  ev_charging: "EV charging",
  station_services: "Station services & amenities",
  station_products: "Products sold (store / shop)",
  station_payment: "Payment methods accepted",
  station_brand: "Station brand",
  vehicle_scope: "Vehicle scope",
  service_mode: "Service mode",
  other: "Other",
};


function prettyCategory(k: string | null) {
  if (!k) return CATEGORY_LABELS.other;
  return CATEGORY_LABELS[k] ?? k.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}

function TagsTab({ businessId, typeSlug }: { businessId: string; typeSlug: string }) {
  const [allTags, setAllTags] = useState<TagRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: t }, { data: links }] = await Promise.all([
        (supabase as any).from("business_tags")
          .select("slug,label,type_slug,category,sort_order,is_popular")
          .or(`type_slug.eq.${typeSlug},type_slug.is.null`)
          .order("sort_order"),
        (supabase as any).from("business_tag_links").select("tag_slug").eq("business_id", businessId),
      ]);
      if (cancelled) return;
      setAllTags((t ?? []) as TagRow[]);
      setSelected(new Set((links ?? []).map((l: any) => l.tag_slug)));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [businessId, typeSlug]);

  const toggle = (slug: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug); else next.add(slug);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const { error: delErr } = await (supabase as any)
        .from("business_tag_links").delete().eq("business_id", businessId);
      if (delErr) throw new Error(delErr.message);
      const rows = Array.from(selected).map((tag_slug) => ({ business_id: businessId, tag_slug }));
      if (rows.length > 0) {
        const { error: insErr } = await (supabase as any).from("business_tag_links").insert(rows);
        if (insErr) throw new Error(insErr.message);
      }
      toast.success("Tags saved");
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Card className="p-6 text-sm text-muted-foreground">Loading tags…</Card>;

  if (allTags.length === 0) {
    return <Card className="p-6 text-sm text-muted-foreground">No tags available for this business type yet.</Card>;
  }

  const grouped: Record<string, TagRow[]> = {};
  for (const t of allTags) {
    const key = t.category ?? "other";
    (grouped[key] = grouped[key] ?? []).push(t);
  }
  const ORDER = ["fuel_grade", "ev_charging", "station_products", "station_services", "station_payment", "station_brand"];
  const groupKeys = Object.keys(grouped).sort((a, b) => {
    const ai = ORDER.indexOf(a); const bi = ORDER.indexOf(b);
    if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    return a.localeCompare(b);
  });

  const addCustom = async (category: string, label: string) => {
    const trimmed = label.trim();
    if (trimmed.length < 2) { toast.error("Tag must be at least 2 characters"); return; }
    const { data, error } = await (supabase as any).rpc("suggest_business_tag", {
      _label: trimmed, _type_slug: typeSlug, _category: category,
    });
    if (error) { toast.error(error.message); return; }
    const newSlug = data as string;
    // Refresh tag catalog so the new tag appears in its group
    const { data: t } = await (supabase as any).from("business_tags")
      .select("slug,label,type_slug,category,sort_order,is_popular")
      .or(`type_slug.eq.${typeSlug},type_slug.is.null`)
      .order("sort_order");
    setAllTags((t ?? []) as TagRow[]);
    setSelected((prev) => new Set(prev).add(newSlug));
    toast.success("Tag added — remember to click Save tags");
  };


  return (
    <Card className="space-y-5 p-4 md:p-5">
      <div>
        <h2 className="font-display text-lg font-semibold">Tags</h2>
        <p className="text-sm text-muted-foreground">
          Pick what your station offers — fuel grades (91/95/97/100 RON), diesel types,
          EV charging connectors, and amenities. These show as filterable badges on your public page.
        </p>
      </div>

      {selected.size > 0 && (
        <div className="rounded-lg border border-border bg-secondary/40 p-3">
          <div className="mb-2 text-xs font-medium text-muted-foreground">{selected.size} selected</div>
          <div className="flex flex-wrap gap-1.5">
            {Array.from(selected).map((s) => {
              const t = allTags.find((x) => x.slug === s);
              if (!t) return null;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggle(s)}
                  className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                >
                  {t.label} ×
                </button>
              );
            })}
          </div>
        </div>
      )}

      {groupKeys.map((k) => (
        <div key={k}>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {prettyCategory(k)}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {grouped[k].map((t) => {
              const active = selected.has(t.slug);
              return (
                <button
                  key={t.slug}
                  type="button"
                  onClick={() => toggle(t.slug)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          <AddCustomTagInline category={k} onAdd={(label) => addCustom(k, label)} />
        </div>
      ))}


      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save tags"}</Button>
      </div>
    </Card>
  );
}

function AddCustomTagInline({ category, onAdd }: { category: string; onAdd: (label: string) => Promise<void> | void }) {
  const [val, setVal] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!val.trim()) return;
    setBusy(true);
    try { await onAdd(val); setVal(""); } finally { setBusy(false); }
  };
  return (
    <div className="mt-2 flex gap-1.5">
      <Input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } }}
        placeholder={`Add a ${prettyCategory(category).toLowerCase()} tag…`}
        className="h-8 max-w-xs text-xs"
        maxLength={40}
      />
      <Button type="button" size="sm" variant="outline" onClick={submit} disabled={busy || val.trim().length < 2}>
        <Plus className="mr-1 h-3 w-3" />Add
      </Button>
    </div>
  );
}



/* ---------------- PROFILE ---------------- */

function ProfileTab({ biz, userId, onSaved }: { biz: any; userId: string; onSaved: () => void }) {
  const save = useServerFn(updateBusinessPageSettings);
  const [tagline, setTagline] = useState(biz.tagline ?? "");
  const [description, setDescription] = useState(biz.description ?? "");
  const [themeColor, setThemeColor] = useState<string>(biz.theme_color ?? "#0ea5e9");
  const [showServices, setShowServices] = useState<boolean>(biz.show_services ?? true);
  const [showProducts, setShowProducts] = useState<boolean>(biz.show_products ?? true);
  const [showPosts, setShowPosts] = useState<boolean>(biz.show_posts ?? true);
  const [ctaPrimary, setCtaPrimary] = useState<string>(biz.cta_primary ?? "inquiry");
  const [logoUrl, setLogoUrl] = useState<string | null>(biz.logo_url);
  const [coverUrl, setCoverUrl] = useState<string | null>(biz.cover_url);
  const [saving, setSaving] = useState(false);

  const onUpload = async (file: File, target: "logo" | "cover") => {
    try {
      const url = await uploadMedia(userId, biz.id, file);
      if (target === "logo") setLogoUrl(url);
      else setCoverUrl(url);
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await save({
        data: {
          businessId: biz.id,
          tagline: tagline.trim() || null,
          description: description.trim() || null,
          theme_color: themeColor || null,
          show_services: showServices,
          show_products: showProducts,
          show_posts: showPosts,
          cta_primary: ctaPrimary as any,
          logo_url: logoUrl,
          cover_url: coverUrl,
        },
      });
      toast.success("Saved");
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="space-y-4 p-4 md:p-5">
      <ImageField label="Logo" url={logoUrl} onUpload={(f) => onUpload(f, "logo")} onClear={() => setLogoUrl(null)} square />
      <ImageField label="Cover photo" url={coverUrl} onUpload={(f) => onUpload(f, "cover")} onClear={() => setCoverUrl(null)} />

      <div>
        <Label>Tagline</Label>
        <Input
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          maxLength={160}
          placeholder="One line about your business"
          className="h-11 text-base"
        />
      </div>
      <div>
        <Label>About / description</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          maxLength={4000}
          placeholder="Tell customers what makes you different"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Accent color</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={themeColor}
              onChange={(e) => setThemeColor(e.target.value)}
              className="h-11 w-14 cursor-pointer rounded border border-border"
            />
            <Input value={themeColor} onChange={(e) => setThemeColor(e.target.value)} maxLength={7} className="h-11" />
          </div>
        </div>
        <div>
          <Label>Primary call-to-action</Label>
          <Select value={ctaPrimary} onValueChange={setCtaPrimary}>
            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="inquiry">Inquiry form</SelectItem>
              <SelectItem value="call">Call</SelectItem>
              <SelectItem value="messenger">Messenger</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">Show sections on public page</div>
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <span className="text-sm">Services</span>
          <Switch checked={showServices} onCheckedChange={setShowServices} />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <span className="text-sm">Products</span>
          <Switch checked={showProducts} onCheckedChange={setShowProducts} />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <span className="text-sm">Posts / Updates</span>
          <Switch checked={showPosts} onCheckedChange={setShowPosts} />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
      </div>
    </Card>
  );
}

function ImageField({
  label,
  url,
  onUpload,
  onClear,
  square,
}: {
  label: string;
  url: string | null;
  onUpload: (f: File) => void | Promise<void>;
  onClear: () => void;
  square?: boolean;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex flex-wrap items-center gap-3">
        <div
          className={`flex items-center justify-center overflow-hidden rounded-lg border border-border bg-muted ${
            square ? "h-20 w-20" : "h-20 w-40"
          }`}
        >
          {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="h-6 w-6 text-muted-foreground" />}
        </div>
        <div className="flex gap-2">
          <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm hover:bg-accent">
            <Upload className="h-4 w-4" />
            Upload
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUpload(f);
                e.currentTarget.value = "";
              }}
            />
          </label>
          {url && (
            <Button variant="ghost" size="sm" onClick={onClear}>Remove</Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- SERVICES ---------------- */

function ServicesTab({
  businessId,
  userId,
  services,
  onChange,
}: {
  businessId: string;
  userId: string;
  services: any[];
  onChange: () => void;
}) {
  const upsert = useServerFn(upsertBusinessService);
  const del = useServerFn(deleteBusinessService);
  const [editing, setEditing] = useState<any | null>(null);

  const blank = () => ({ businessId, title: "", description: "", price_label: "", photo_url: null, active: true, sort_order: services.length });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setEditing(blank())}>
          <Plus className="mr-1 h-4 w-4" />Add service
        </Button>
      </div>
      {services.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">No services yet.</Card>
      ) : (
        <div className="space-y-2">
          {services.map((s) => (
            <Card key={s.id} className="flex items-center gap-3 p-3">
              {s.photo_url ? (
                <img src={s.photo_url} alt="" className="h-14 w-14 rounded object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded bg-muted text-muted-foreground"><ImageIcon className="h-5 w-5" /></div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{s.title}</div>
                {s.price_label && <div className="text-xs text-muted-foreground">{s.price_label}</div>}
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => setEditing(s)}>Edit</Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    if (!confirm("Delete this service?")) return;
                    await del({ data: { businessId, id: s.id } });
                    onChange();
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <ServiceEditor
          initial={editing}
          businessId={businessId}
          userId={userId}
          onClose={() => setEditing(null)}
          onSave={async (payload) => {
            await upsert({ data: { businessId, ...payload } as any });
            setEditing(null);
            onChange();
          }}
        />
      )}
    </div>
  );
}

function ServiceEditor({
  initial,
  businessId,
  userId,
  onClose,
  onSave,
}: {
  initial: any;
  businessId: string;
  userId: string;
  onClose: () => void;
  onSave: (payload: any) => Promise<void>;
}) {
  const [title, setTitle] = useState(initial.title ?? "");
  const [description, setDescription] = useState(initial.description ?? "");
  const [priceLabel, setPriceLabel] = useState(initial.price_label ?? "");
  const [photoUrl, setPhotoUrl] = useState<string | null>(initial.photo_url ?? null);
  const [active, setActive] = useState<boolean>(initial.active ?? true);
  const [saving, setSaving] = useState(false);

  return (
    <Card className="space-y-3 border-primary/40 p-4">
      <div className="font-medium">{initial.id ? "Edit service" : "New service"}</div>
      <ImageField label="Photo" url={photoUrl} onUpload={async (f) => setPhotoUrl(await uploadMedia(userId, businessId, f))} onClear={() => setPhotoUrl(null)} square />
      <div>
        <Label>Title *</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className="h-11 text-base" />
      </div>
      <div>
        <Label>Price label (e.g. "₱350" or "From ₱500")</Label>
        <Input value={priceLabel} onChange={(e) => setPriceLabel(e.target.value)} maxLength={60} className="h-11 text-base" />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={2000} />
      </div>
      <div className="flex items-center justify-between rounded-lg border border-border p-3">
        <span className="text-sm">Show on public page</span>
        <Switch checked={active} onCheckedChange={setActive} />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button
          disabled={saving || title.trim().length === 0}
          onClick={async () => {
            setSaving(true);
            try {
              await onSave({
                id: initial.id,
                title: title.trim(),
                description: description.trim() || null,
                price_label: priceLabel.trim() || null,
                photo_url: photoUrl,
                active,
              });
            } catch (e: any) {
              toast.error(e?.message ?? "Save failed");
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </Card>
  );
}

/* ---------------- PRODUCTS ---------------- */

function ProductsTab({
  businessId,
  userId,
  products,
  onChange,
}: {
  businessId: string;
  userId: string;
  products: any[];
  onChange: () => void;
}) {
  const upsert = useServerFn(upsertBusinessProduct);
  const del = useServerFn(deleteBusinessProduct);
  const [editing, setEditing] = useState<any | null>(null);

  const blank = () => ({
    businessId,
    title: "",
    description: "",
    price_php: null,
    sale_price_php: null,
    photo_url: null,
    in_stock: true,
    active: true,
    sort_order: products.length,
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setEditing(blank())}>
          <Plus className="mr-1 h-4 w-4" />Add product
        </Button>
      </div>
      {products.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">No products yet.</Card>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {products.map((p) => (
            <Card key={p.id} className="overflow-hidden">
              <div className="aspect-square w-full bg-muted">
                {p.photo_url ? <img src={p.photo_url} alt="" className="h-full w-full object-cover" /> : null}
              </div>
              <div className="p-2">
                <div className="line-clamp-2 text-sm font-medium">{p.title}</div>
                {p.price_php != null && <div className="text-xs">₱{Number(p.price_php).toLocaleString()}</div>}
                <div className="mt-2 flex gap-1">
                  <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => setEditing(p)}>Edit</Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      if (!confirm("Delete this product?")) return;
                      await del({ data: { businessId, id: p.id } });
                      onChange();
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <ProductEditor
          initial={editing}
          businessId={businessId}
          userId={userId}
          onClose={() => setEditing(null)}
          onSave={async (payload) => {
            await upsert({ data: { businessId, ...payload } as any });
            setEditing(null);
            onChange();
          }}
        />
      )}
    </div>
  );
}

function ProductEditor({
  initial,
  businessId,
  userId,
  onClose,
  onSave,
}: {
  initial: any;
  businessId: string;
  userId: string;
  onClose: () => void;
  onSave: (payload: any) => Promise<void>;
}) {
  const [title, setTitle] = useState(initial.title ?? "");
  const [description, setDescription] = useState(initial.description ?? "");
  const [price, setPrice] = useState<string>(initial.price_php != null ? String(initial.price_php) : "");
  const [sale, setSale] = useState<string>(initial.sale_price_php != null ? String(initial.sale_price_php) : "");
  const [photoUrl, setPhotoUrl] = useState<string | null>(initial.photo_url ?? null);
  const [inStock, setInStock] = useState<boolean>(initial.in_stock ?? true);
  const [active, setActive] = useState<boolean>(initial.active ?? true);
  const [saving, setSaving] = useState(false);

  return (
    <Card className="space-y-3 border-primary/40 p-4">
      <div className="font-medium">{initial.id ? "Edit product" : "New product"}</div>
      <ImageField label="Photo" url={photoUrl} onUpload={async (f) => setPhotoUrl(await uploadMedia(userId, businessId, f))} onClear={() => setPhotoUrl(null)} square />
      <div>
        <Label>Title *</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} className="h-11 text-base" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Price (₱)</Label>
          <Input type="number" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className="h-11 text-base" />
        </div>
        <div>
          <Label>Sale price (₱)</Label>
          <Input type="number" inputMode="decimal" value={sale} onChange={(e) => setSale(e.target.value)} className="h-11 text-base" />
        </div>
      </div>
      <div>
        <Label>Description</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={2000} />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <span className="text-sm">In stock</span>
          <Switch checked={inStock} onCheckedChange={setInStock} />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <span className="text-sm">Show on public page</span>
          <Switch checked={active} onCheckedChange={setActive} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button
          disabled={saving || title.trim().length === 0}
          onClick={async () => {
            setSaving(true);
            try {
              await onSave({
                id: initial.id,
                title: title.trim(),
                description: description.trim() || null,
                price_php: price ? Number(price) : null,
                sale_price_php: sale ? Number(sale) : null,
                photo_url: photoUrl,
                in_stock: inStock,
                active,
              });
            } catch (e: any) {
              toast.error(e?.message ?? "Save failed");
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </Card>
  );
}

/* ---------------- POSTS ---------------- */

function PostsTab({
  businessId,
  userId,
  posts,
  onChange,
}: {
  businessId: string;
  userId: string;
  posts: any[];
  onChange: () => void;
}) {
  const create = useServerFn(createBusinessPost);
  const del = useServerFn(deleteBusinessPost);
  const [body, setBody] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const post = async () => {
    if (body.trim().length === 0) return;
    setSaving(true);
    try {
      await create({ data: { businessId, body: body.trim(), photo_url: photoUrl } });
      setBody("");
      setPhotoUrl(null);
      toast.success("Posted");
      onChange();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={4000}
          placeholder="Share an update with your customers (promo, schedule, new arrival…)"
        />
        <ImageField label="Photo (optional)" url={photoUrl} onUpload={async (f) => setPhotoUrl(await uploadMedia(userId, businessId, f))} onClear={() => setPhotoUrl(null)} square />
        <div className="flex justify-end">
          <Button onClick={post} disabled={saving || body.trim().length === 0}>{saving ? "Posting…" : "Post update"}</Button>
        </div>
      </Card>

      {posts.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">No posts yet.</Card>
      ) : (
        <div className="space-y-2">
          {posts.map((p) => (
            <Card key={p.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()}</div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    if (!confirm("Delete this post?")) return;
                    await del({ data: { businessId, id: p.id } });
                    onChange();
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm">{p.body}</p>
              {p.photo_url && <img src={p.photo_url} alt="" className="mt-2 max-h-72 rounded-md object-cover" />}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- INQUIRIES ---------------- */

function InquiriesTab({
  businessId,
  inquiries,
  onChange,
}: {
  businessId: string;
  inquiries: any[];
  onChange: () => void;
}) {
  const update = useServerFn(updateInquiryStatus);

  if (inquiries.length === 0) {
    return <Card className="p-6 text-center text-sm text-muted-foreground">No inquiries yet. They'll appear here when customers send a message from your public page.</Card>;
  }

  return (
    <div className="space-y-2">
      {inquiries.map((i) => (
        <Card key={i.id} className="p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-medium">{i.name}</div>
            <div className="flex items-center gap-2">
              <Badge
                variant={i.status === "new" ? "destructive" : i.status === "open" ? "default" : "secondary"}
              >
                {i.status}
              </Badge>
              <Select
                value={i.status}
                onValueChange={async (v) => {
                  await update({ data: { businessId, id: i.id, status: v as any } });
                  onChange();
                }}
              >
                <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {new Date(i.created_at).toLocaleString()}
            {i.phone && <> · {i.phone}</>}
            {i.email && <> · {i.email}</>}
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm">{i.message}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {i.phone && (
              <Button size="sm" variant="outline" asChild>
                <a href={`tel:${i.phone}`}>Call</a>
              </Button>
            )}
            {i.email && (
              <Button size="sm" variant="outline" asChild>
                <a href={`mailto:${i.email}`}>Reply by email</a>
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ---------------- HOURS ---------------- */

function HoursTab({ biz, onSaved }: { biz: any; onSaved: () => void }) {
  const initial = isStructuredHours(biz.hours) ? (biz.hours as StructuredHours) : emptyStructured();
  const [primary, setPrimary] = useState<WeekSchedule>(initial.primary);
  const [store, setStore] = useState<WeekSchedule | null>(initial.store ?? null);
  const [saving, setSaving] = useState(false);
  const showStoreToggle = biz.type_slug === "fuel_station";

  const save = async () => {
    setSaving(true);
    try {
      const payload: StructuredHours = { tz: TZ, primary, ...(store ? { store } : {}) };
      const { error } = await (supabase as any).from("businesses").update({ hours: payload }).eq("id", biz.id);
      if (error) throw new Error(error.message);
      toast.success("Hours saved");
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="space-y-5 p-4 md:p-5">
      <div>
        <h2 className="font-display text-lg font-semibold">Hours</h2>
        <p className="text-sm text-muted-foreground">
          Times are in Asia/Manila. Visitors see an "Open now / Closing soon / Opening soon / Closed" badge automatically.
        </p>
      </div>

      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {biz.type_slug === "fuel_station" ? "Pump / station hours" : "Business hours"}
        </div>
        <WeekHoursEditor value={primary} onChange={setPrimary} />
      </div>

      {showStoreToggle && (
        <div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!store}
              onChange={(e) => setStore(e.target.checked ? (store ?? JSON.parse(JSON.stringify(primary))) : null)}
            />
            Convenience store / Sari-Sari Store has different hours
          </label>
          {store && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Store hours</div>
                <Button type="button" size="sm" variant="ghost" onClick={() => setStore(JSON.parse(JSON.stringify(primary)))}>
                  Copy from station
                </Button>
              </div>
              <WeekHoursEditor value={store} onChange={setStore} />
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save hours"}</Button>
      </div>
    </Card>
  );
}

