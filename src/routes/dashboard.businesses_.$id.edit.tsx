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
import { setVanitySlug } from "@/lib/business-mini-site.functions";

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
import { ArrowLeft, Plus, Trash2, Upload, ExternalLink, Image as ImageIcon, X, Pencil } from "lucide-react";
import { WeekHoursEditor } from "@/components/business/hours-editor";
import { isStructuredHours, emptyStructured, TZ, type StructuredHours, type WeekSchedule } from "@/lib/business-hours";
import {
  CatalogPicker,
  PricingFields,
  blankService,
  fromCatalogItem,
  formatServicePrice,
  type ServiceFormValue,
} from "@/components/business/service-catalog-picker";
import { CATEGORY_LABEL } from "@/data/fuel-station-catalog";
import { GalleryTab, ContactChannelsTab } from "@/components/business-page/gallery-contact-tabs";
import { LocationPicker } from "@/components/businesses/location-picker";
import { BookingsTab } from "@/components/business-page/bookings-tab";
import { OnboardingChecklist } from "@/components/business-page/onboarding-checklist";
import { AnalyticsTab } from "@/components/business-page/analytics-tab";




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

  return <EditBusinessPageInner biz={biz} data={data} user={user} refetch={refetch} navigate={navigate} />;
}

function EditBusinessPageInner({ biz, data, user, refetch, navigate }: any) {
  const validTabs = ["profile","location","tags","hours","services","products","gallery","contact","posts","bookings","inquiries","analytics"];
  const [activeTab, setActiveTab] = useState<string>("profile");

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

      <div className="mb-4">
        <OnboardingChecklist
          data={{
            biz,
            services: data.services,
            products: data.products,
            posts: data.posts,
            albums: (data as any).albums ?? [],
            photos: (data as any).photos ?? [],
            contactChannels: (data as any).contactChannels ?? [],
            bookableItems: (data as any).bookableItems ?? [],
            availability: (data as any).availability ?? [],
          }}
          onJumpTab={(v) => {
            if (validTabs.includes(v)) setActiveTab(v);
          }}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex w-full overflow-x-auto">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="location">Location</TabsTrigger>
          <TabsTrigger value="tags">Tags</TabsTrigger>
          <TabsTrigger value="hours">Hours</TabsTrigger>

          <TabsTrigger value="services">Services ({data.services.length})</TabsTrigger>
          <TabsTrigger value="products">Products ({data.products.length})</TabsTrigger>
          <TabsTrigger value="gallery">Gallery ({(data as any).albums?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="contact">Contact ({(data as any).contactChannels?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="posts">Posts ({data.posts.length})</TabsTrigger>
          <TabsTrigger value="bookings">

            Bookings ({(data as any).bookableItems?.length ?? 0})
            {(data as any).bookings?.filter((b: any) => b.status === "pending").length > 0 && (
              <Badge className="ml-2 h-5 px-1.5 text-xs" variant="destructive">
                {(data as any).bookings.filter((b: any) => b.status === "pending").length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="inquiries">
            Inquiries
            {data.inquiries.filter((i: any) => i.status === "new").length > 0 && (
              <Badge className="ml-2 h-5 px-1.5 text-xs" variant="destructive">
                {data.inquiries.filter((i: any) => i.status === "new").length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>


        <TabsContent value="profile">
          <ProfileTab biz={biz} userId={user.id} onSaved={refetch} />
        </TabsContent>
        <TabsContent value="location">
          <LocationTab biz={biz} onSaved={refetch} />
        </TabsContent>
        <TabsContent value="tags">
          <TagsTab businessId={biz.id} typeSlug={biz.type_slug} />
        </TabsContent>
        <TabsContent value="hours">
          <HoursTab biz={biz} onSaved={refetch} />
        </TabsContent>

        <TabsContent value="services">
          <ServicesTab businessId={biz.id} userId={user.id} typeSlug={biz.type_slug} services={data.services} onChange={refetch} />
        </TabsContent>
        <TabsContent value="products">
          <ProductsTab businessId={biz.id} userId={user.id} products={data.products} onChange={refetch} />
        </TabsContent>
        <TabsContent value="gallery">
          <GalleryTab
            businessId={biz.id}
            userId={user.id}
            albums={(data as any).albums ?? []}
            photos={(data as any).photos ?? []}
            onChange={refetch}
          />
        </TabsContent>
        <TabsContent value="contact">
          <ContactChannelsTab
            businessId={biz.id}
            channels={(data as any).contactChannels ?? []}
            onChange={refetch}
          />
        </TabsContent>
        <TabsContent value="posts">
          <PostsTab businessId={biz.id} userId={user.id} posts={data.posts} onChange={refetch} />
        </TabsContent>
        <TabsContent value="bookings">
          <BookingsTab
            businessId={biz.id}
            items={(data as any).bookableItems ?? []}
            availability={(data as any).availability ?? []}
            exceptions={(data as any).exceptions ?? []}
            bookings={(data as any).bookings ?? []}
            onChange={refetch}
          />
        </TabsContent>
        <TabsContent value="inquiries">
          <InquiriesTab businessId={biz.id} inquiries={data.inquiries} onChange={refetch} />
        </TabsContent>
        <TabsContent value="analytics">
          <AnalyticsTab businessId={biz.id} />
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
  const [name, setName] = useState<string>(biz.name ?? "");
  const [tagline, setTagline] = useState(biz.tagline ?? "");
  const [description, setDescription] = useState(biz.description ?? "");
  const [phone, setPhone] = useState<string>(biz.phone ?? "");
  const [email, setEmail] = useState<string>(biz.email ?? "");
  const [website, setWebsite] = useState<string>(biz.website ?? "");
  const [messengerUrl, setMessengerUrl] = useState<string>(biz.messenger_url ?? "");
  const [brandsCarried, setBrandsCarried] = useState<string>(biz.brands_carried ?? "");
  const [themeColor, setThemeColor] = useState<string>(biz.theme_color ?? "#0ea5e9");
  const [showServices, setShowServices] = useState<boolean>(biz.show_services ?? true);
  const [showProducts, setShowProducts] = useState<boolean>(biz.show_products ?? true);
  const [showPosts, setShowPosts] = useState<boolean>(biz.show_posts ?? true);
  const [showGallery, setShowGallery] = useState<boolean>(biz.show_gallery ?? true);
  const [showContact, setShowContact] = useState<boolean>(biz.show_contact ?? true);
  const [ctaPrimary, setCtaPrimary] = useState<string>(biz.cta_primary ?? "inquiry");
  const [logoUrl, setLogoUrl] = useState<string | null>(biz.logo_url);
  const [coverUrl, setCoverUrl] = useState<string | null>(biz.cover_url);
  const [featuredVideoUrl, setFeaturedVideoUrl] = useState<string>(biz.featured_video_url ?? "");
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

  const detectVideoProvider = (url: string): "youtube" | "vimeo" | "facebook" | null => {
    try {
      const u = new URL(url);
      if (u.hostname.includes("youtube.com") || u.hostname === "youtu.be") return "youtube";
      if (u.hostname.includes("vimeo.com")) return "vimeo";
      if (u.hostname.includes("facebook.com") || u.hostname.includes("fb.watch")) return "facebook";
    } catch { /* noop */ }
    return null;
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      toast.error("Business name must be at least 2 characters");
      return;
    }
    setSaving(true);
    try {
      const trimmedVideo = featuredVideoUrl.trim();
      const provider = trimmedVideo ? detectVideoProvider(trimmedVideo) : null;
      if (trimmedVideo && !provider) {
        toast.error("Featured video must be a YouTube, Vimeo, or Facebook URL");
        setSaving(false);
        return;
      }
      await save({
        data: {
          businessId: biz.id,
          name: trimmedName,
          tagline: tagline.trim() || null,
          description: description.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          website: website.trim() || null,
          messenger_url: messengerUrl.trim() || null,
          brands_carried: brandsCarried.trim() || null,
          theme_color: themeColor || null,
          show_services: showServices,
          show_products: showProducts,
          show_posts: showPosts,
          show_gallery: showGallery,
          show_contact: showContact,
          cta_primary: ctaPrimary as any,
          logo_url: logoUrl,
          cover_url: coverUrl,
          featured_video_url: trimmedVideo || null,
          featured_video_provider: provider,
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

      <VanitySlugField businessId={biz.id} currentVanity={biz.vanity_slug ?? null} currentSlug={biz.slug} />



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

      <div>
        <Label>Featured video (optional)</Label>
        <Input
          value={featuredVideoUrl}
          onChange={(e) => setFeaturedVideoUrl(e.target.value)}
          maxLength={500}
          placeholder="https://youtube.com/watch?v=… or Vimeo / Facebook video URL"
          className="h-11"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          When set, this replaces the cover photo with an embedded video at the top of your page.
        </p>
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
          <span className="text-sm">Gallery</span>
          <Switch checked={showGallery} onCheckedChange={setShowGallery} />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <span className="text-sm">Contact channels</span>
          <Switch checked={showContact} onCheckedChange={setShowContact} />
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
  typeSlug,
  services,
  onChange,
}: {
  businessId: string;
  userId: string;
  typeSlug: string | null;
  services: any[];
  onChange: () => void;
}) {
  const upsert = useServerFn(upsertBusinessService);
  const del = useServerFn(deleteBusinessService);
  const [editing, setEditing] = useState<any | null>(null);
  const [showPicker, setShowPicker] = useState<boolean>(services.length === 0);

  const existingKeys = new Set<string>(
    services.map((s: any) => s.catalog_key).filter(Boolean),
  );

  const groupedByCategory = services.reduce((acc: Record<string, any[]>, s: any) => {
    const key = s.category ?? "other";
    (acc[key] ||= []).push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {services.length === 0
            ? "Start by picking from the catalog of fuel-station services & products."
            : "Pick more items from the catalog, or add a custom one."}
        </p>
        <Button size="sm" variant={showPicker ? "secondary" : "default"} onClick={() => setShowPicker((v) => !v)}>
          {showPicker ? <><X className="mr-1 h-4 w-4" /> Hide catalog</> : <><Plus className="mr-1 h-4 w-4" /> Add from catalog</>}
        </Button>
      </div>

      {showPicker && (
        <CatalogPicker
          existingKeys={existingKeys}
          typeSlug={typeSlug}
          onPick={(item) => {
            const v = fromCatalogItem(item);
            setEditing({ ...v, businessId, sort_order: services.length });
          }}
          onCustom={() => setEditing({ ...blankService(), businessId, sort_order: services.length })}
        />
      )}

      {services.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          No services yet. Pick from the catalog above to add your first one.
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedByCategory).map(([cat, list]) => (
            <div key={cat}>
              <div className="mb-2 flex items-center gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {CATEGORY_LABEL[cat] ?? "Other"}
                </h3>
                <Badge variant="outline" className="text-[10px]">{list.length}</Badge>
              </div>
              <div className="space-y-2">
                {list.map((s: any) => {
                  const priceStr = formatServicePrice(s);
                  return (
                    <Card key={s.id} className="flex items-center gap-3 p-3">
                      {s.photo_url ? (
                        <img src={s.photo_url} alt="" className="h-14 w-14 rounded object-cover" />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded bg-muted text-muted-foreground"><ImageIcon className="h-5 w-5" /></div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate font-medium">{s.title}</span>
                          {!s.active && <Badge variant="secondary" className="text-[10px]">Hidden</Badge>}
                        </div>
                        {priceStr ? (
                          <div className="text-sm font-semibold text-primary">{priceStr}</div>
                        ) : (
                          <div className="text-xs text-muted-foreground italic">No price set</div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => setEditing(s)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            if (!confirm("Delete this item?")) return;
                            await del({ data: { businessId, id: s.id } });
                            onChange();
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
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
  const [value, setValue] = useState<ServiceFormValue & { id?: string }>(() => ({
    id: initial.id,
    title: initial.title ?? "",
    description: initial.description ?? null,
    price_label: initial.price_label ?? null,
    photo_url: initial.photo_url ?? null,
    active: initial.active ?? true,
    category: initial.category ?? null,
    unit: initial.unit ?? null,
    price_php: initial.price_php != null ? Number(initial.price_php) : null,
    sale_price_php: initial.sale_price_php != null ? Number(initial.sale_price_php) : null,
    catalog_key: initial.catalog_key ?? null,
  }));
  const [saving, setSaving] = useState(false);

  const patch = (p: Partial<ServiceFormValue>) => setValue((v) => ({ ...v, ...p }));

  return (
    <Card className="space-y-3 border-primary/40 p-4">
      <div className="flex items-center justify-between">
        <div className="font-medium">{initial.id ? "Edit item" : "New item"}</div>
        {value.catalog_key && (
          <Badge variant="outline" className="text-[10px]">From catalog</Badge>
        )}
      </div>
      <ImageField
        label="Photo"
        url={value.photo_url}
        onUpload={async (f) => patch({ photo_url: await uploadMedia(userId, businessId, f) })}
        onClear={() => patch({ photo_url: null })}
        square
      />
      <div>
        <Label>Title *</Label>
        <Input value={value.title} onChange={(e) => patch({ title: e.target.value })} maxLength={120} className="h-11 text-base" />
      </div>
      <PricingFields value={value} onChange={patch} />
      <div>
        <Label>Description</Label>
        <Textarea
          value={value.description ?? ""}
          onChange={(e) => patch({ description: e.target.value || null })}
          rows={3}
          maxLength={2000}
        />
      </div>
      <div className="flex items-center justify-between rounded-lg border border-border p-3">
        <span className="text-sm">Show on public page</span>
        <Switch checked={value.active} onCheckedChange={(c) => patch({ active: c })} />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button
          disabled={saving || value.title.trim().length === 0}
          onClick={async () => {
            setSaving(true);
            try {
              await onSave({
                id: value.id,
                title: value.title.trim(),
                description: value.description?.trim() || null,
                price_label: value.price_label?.trim() || null,
                photo_url: value.photo_url,
                active: value.active,
                category: value.category,
                unit: value.unit,
                price_php: value.price_php,
                sale_price_php: value.sale_price_php,
                catalog_key: value.catalog_key,
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

function LocationTab({ biz, onSaved }: { biz: any; onSaved: () => void }) {
  const save = useServerFn(updateBusinessPageSettings);
  const [streetAddress, setStreetAddress] = useState<string>(biz.street_address ?? "");
  const [region, setRegion] = useState<string>(biz.region ?? "");
  const [province, setProvince] = useState<string>(biz.province ?? "");
  const [city, setCity] = useState<string>(biz.city ?? "");
  const [barangay, setBarangay] = useState<string>(biz.barangay ?? "");
  const [postalCode, setPostalCode] = useState<string>(biz.postal_code ?? "");
  const [lat, setLat] = useState<string>(biz.lat != null ? String(biz.lat) : "");
  const [lng, setLng] = useState<string>(biz.lng != null ? String(biz.lng) : "");
  const [saving, setSaving] = useState(false);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLat(p.coords.latitude.toFixed(6));
        setLng(p.coords.longitude.toFixed(6));
      },
      () => toast.error("Could not get your location"),
    );
  };

  const setCoords = (la: number, ln: number) => {
    setLat(la.toFixed(6));
    setLng(ln.toFixed(6));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await save({
        data: {
          businessId: biz.id,
          street_address: streetAddress.trim() || null,
          region: region.trim() || null,
          province: province.trim() || null,
          city: city.trim() || null,
          barangay: barangay.trim() || null,
          postal_code: postalCode.trim() || null,
          lat: lat ? Number(lat) : null,
          lng: lng ? Number(lng) : null,
        },
      });
      toast.success("Location saved");
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
        <h2 className="font-display text-lg font-semibold">Location</h2>
        <p className="text-sm text-muted-foreground">
          Update your address and pin location. Customers use this for directions and proximity search.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label>Street address</Label>
          <Input value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} placeholder="123 Rizal St." />
        </div>
        <div>
          <Label>Region</Label>
          <Input value={region} onChange={(e) => setRegion(e.target.value)} />
        </div>
        <div>
          <Label>Province</Label>
          <Input value={province} onChange={(e) => setProvince(e.target.value)} />
        </div>
        <div>
          <Label>City / Municipality</Label>
          <Input value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div>
          <Label>Barangay</Label>
          <Input value={barangay} onChange={(e) => setBarangay(e.target.value)} />
        </div>
        <div>
          <Label>Postal code</Label>
          <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label>Pin on the map</Label>
          <Button type="button" variant="outline" size="sm" onClick={useMyLocation}>
            Use my location
          </Button>
        </div>
        <p className="mb-2 mt-1 text-xs text-muted-foreground">
          Click the map or drag the pin to set the exact spot.
        </p>
        <LocationPicker
          lat={lat ? Number(lat) : null}
          lng={lng ? Number(lng) : null}
          region={region || null}
          onChange={(la, ln) => setCoords(la, ln)}
        />
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <Input placeholder="Latitude" value={lat} onChange={(e) => setLat(e.target.value)} />
          <Input placeholder="Longitude" value={lng} onChange={(e) => setLng(e.target.value)} />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save location"}
        </Button>
      </div>
    </Card>
  );
}

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


function VanitySlugField({
  businessId,
  currentVanity,
  currentSlug,
}: {
  businessId: string;
  currentVanity: string | null;
  currentSlug: string;
}) {
  const save = useServerFn(setVanitySlug);
  const [value, setValue] = useState(currentVanity ?? "");
  const [saving, setSaving] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "https://365motorsales.com";

  const onSave = async () => {
    const trimmed = value.trim().toLowerCase();
    setSaving(true);
    try {
      await save({ data: { businessId, vanitySlug: trimmed || null } });
      toast.success(trimmed ? "Short URL saved" : "Short URL removed");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't save");
    } finally {
      setSaving(false);
    }
  };

  const onClear = async () => {
    setValue("");
    setSaving(true);
    try {
      await save({ data: { businessId, vanitySlug: null } });
      toast.success("Short URL removed");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't remove");
    } finally {
      setSaving(false);
    }
  };

  const preview = value.trim().toLowerCase();
  return (
    <Card className="space-y-3 border-primary/40 bg-primary/5 p-4 md:p-5">
      <div>
        <Label className="text-base font-semibold">Your short URL</Label>
        <p className="mt-1 text-xs text-muted-foreground">
          A clean, memorable web address for your business — perfect for business cards, posters, and stickers.
          Replaces the long auto-generated link.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-background px-3 py-2 font-mono text-sm">
        <span className="text-muted-foreground">{origin.replace(/^https?:\/\//, "")}/b/</span>
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 32))}
          placeholder="your-shop-name"
          maxLength={32}
          className="h-8 flex-1 border-0 bg-transparent p-0 font-mono text-sm focus-visible:ring-0"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        3–32 characters · lowercase letters, numbers, and hyphens · cannot start or end with a hyphen.
      </p>
      {preview && (
        <p className="text-xs">
          Will be reachable at{" "}
          <a className="text-primary underline" href={`/b/${preview}`} target="_blank" rel="noreferrer">
            {origin}/b/{preview}
          </a>
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button onClick={onSave} disabled={saving || preview === (currentVanity ?? "")}>
          {saving ? "Saving…" : currentVanity ? "Update short URL" : "Claim short URL"}
        </Button>
        {currentVanity && (
          <Button type="button" variant="outline" onClick={onClear} disabled={saving}>
            Remove
          </Button>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Canonical permalink: <span className="font-mono">/businesses/{currentSlug}</span> (old links keep working).
      </p>
    </Card>
  );
}
