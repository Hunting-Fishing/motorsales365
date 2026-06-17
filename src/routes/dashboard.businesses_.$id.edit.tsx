import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { confirm } from "@/components/ui/confirm-dialog";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
  getMyBusinessPage,
  updateBusinessPageSettings,
  upsertBusinessProduct,
  deleteBusinessProduct,
  createBusinessPost,
  deleteBusinessPost,
  updateInquiryStatus,
} from "@/lib/business-pages.functions";
import { saveBusinessServices } from "@/lib/business-services-save.functions";
import { setVanitySlug } from "@/lib/business-mini-site.functions";
import { FormFeedbackLink } from "@/components/form-feedback";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { uploadWithRetry } from "@/lib/storage-upload";

import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Upload,
  ExternalLink,
  Image as ImageIcon,
  X,
  Facebook,
  MessageCircle,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getBrandSuggestions } from "@/data/brand-suggestions";
import { WeekHoursEditor } from "@/components/business/hours-editor";
import {
  isStructuredHours,
  emptyStructured,
  TZ,
  type StructuredHours,
  type WeekSchedule,
} from "@/lib/business-hours";
import { ServicesTable, type DraftService } from "@/components/business/services-table";
import { GalleryTab, ContactChannelsTab } from "@/components/business-page/gallery-contact-tabs";
import { LocationPicker } from "@/components/businesses/location-picker";
import { BookingsTab } from "@/components/business-page/bookings-tab";
import { OnboardingChecklist } from "@/components/business-page/onboarding-checklist";
import { AnalyticsTab } from "@/components/business-page/analytics-tab";
import { siteOrigin } from "@/lib/site-config";

export const Route = createFileRoute("/dashboard/businesses_/$id/edit")({
  component: EditBusinessPage,
});

async function uploadMedia(userId: string, businessId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${businessId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { publicUrl } = await uploadWithRetry({
    bucket: "business-media",
    path,
    file,
    contentType: file.type,
  });
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
          <p className="text-sm">
            Please{" "}
            <Link to="/login" className="text-primary underline">
              sign in
            </Link>{" "}
            to edit your business page.
          </p>
        </Card>
      </div>
    );
  }

  if (isLoading || !data?.business) {
    return <div className="container mx-auto p-6 text-muted-foreground">Loading…</div>;
  }

  const biz: any = data.business;

  return (
    <EditBusinessPageInner
      biz={biz}
      data={data}
      user={user}
      refetch={refetch}
      navigate={navigate}
    />
  );
}

function EditBusinessPageInner({ biz, data, user, refetch, navigate }: any) {
  const validTabs = [
    "profile",
    "location",
    "tags",
    "hours",
    "services",
    "products",
    "gallery",
    "contact",
    "posts",
    "bookings",
    "inquiries",
    "analytics",
  ];
  const [activeTab, setActiveTab] = useState<string>("profile");

  return (
    <div className="container mx-auto max-w-5xl px-3 py-4 md:px-6 md:py-8">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/dashboard/businesses" })}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <h1 className="font-display text-xl font-bold md:text-2xl">{biz.name}</h1>
        <Badge variant="outline">{biz.status}</Badge>
        <div className="ml-auto">
          <Button variant="outline" size="sm" asChild>
            <a href={`/businesses/${biz.slug}`} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-1 h-4 w-4" />
              View public page
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
          userId={user.id}
          onSaved={() => refetch()}
          onJumpTab={(v, anchor) => {
            if (validTabs.includes(v)) setActiveTab(v);
            if (anchor) {
              setTimeout(() => {
                const el = document.getElementById(anchor);
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "center" });
                  el.classList.add("ring-2", "ring-primary", "ring-offset-2", "rounded-md");
                  setTimeout(() => el.classList.remove("ring-2", "ring-primary", "ring-offset-2", "rounded-md"), 2000);
                }
              }, 120);
            }
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
          <TabsTrigger value="contact">
            Contact ({(data as any).contactChannels?.length ?? 0})
          </TabsTrigger>
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
          <ServicesTab
            businessId={biz.id}
            userId={user.id}
            typeSlug={biz.type_slug}
            services={data.services}
            onChange={refetch}
          />
        </TabsContent>
        <TabsContent value="products">
          <ProductsTab
            businessId={biz.id}
            userId={user.id}
            products={data.products}
            onChange={refetch}
          />
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
            businessSlug={(biz as any).slug ?? null}
            businessName={biz.name}
            businessHours={(biz as any).hours ?? null}
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

type TagRow = {
  slug: string;
  label: string;
  type_slug: string | null;
  category: string | null;
  sort_order: number;
  is_popular: boolean;
};

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
  return (
    CATEGORY_LABELS[k] ??
    k
      .split("_")
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join(" ")
  );
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
        (supabase as any)
          .from("business_tags")
          .select("slug,label,type_slug,category,sort_order,is_popular")
          .order("type_slug")
          .order("sort_order"),
        (supabase as any)
          .from("business_tag_links")
          .select("tag_slug")
          .eq("business_id", businessId),
      ]);
      if (cancelled) return;
      setAllTags((t ?? []) as TagRow[]);
      setSelected(new Set((links ?? []).map((l: any) => l.tag_slug)));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [businessId, typeSlug]);


  const toggle = (slug: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const { error: delErr } = await (supabase as any)
        .from("business_tag_links")
        .delete()
        .eq("business_id", businessId);
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
    return (
      <Card className="p-6 text-sm text-muted-foreground">
        No tags available for this business type yet.
      </Card>
    );
  }

  // Group by "${type_slug}::${category}" so cross-type offerings (e.g. a used
  // car dealership that also does A/C service or tire repair) appear in their
  // own sections, prefixed with the type label.
  const grouped: Record<string, TagRow[]> = {};
  for (const t of allTags) {
    const cat = t.category ?? "other";
    const typeKey = t.type_slug ?? "_universal";
    const key = `${typeKey}::${cat}`;
    (grouped[key] = grouped[key] ?? []).push(t);
  }
  const groupKeys = Object.keys(grouped).sort((a, b) => {
    const [aType] = a.split("::");
    const [bType] = b.split("::");
    // Own type first, then universal, then everything else alphabetically.
    const rank = (tk: string) => (tk === typeSlug ? 0 : tk === "_universal" ? 1 : 2);
    const ra = rank(aType);
    const rb = rank(bType);
    if (ra !== rb) return ra - rb;
    return a.localeCompare(b);
  });
  const typeLabel = (tk: string) => {
    if (tk === "_universal") return "Universal";
    return tk
      .split("_")
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join(" ");
  };

  const addCustom = async (groupKey: string, label: string) => {
    const trimmed = label.trim();
    if (trimmed.length < 2) {
      toast.error("Tag must be at least 2 characters");
      return;
    }
    const [typeKey, category] = groupKey.split("::");
    const _type_slug = typeKey === "_universal" ? null : typeKey;
    const { data, error } = await (supabase as any).rpc("suggest_business_tag", {
      _label: trimmed,
      _type_slug,
      _category: category,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    const newSlug = data as string;
    const { data: t } = await (supabase as any)
      .from("business_tags")
      .select("slug,label,type_slug,category,sort_order,is_popular")
      .order("type_slug")
      .order("sort_order");
    setAllTags((t ?? []) as TagRow[]);
    setSelected((prev) => new Set(prev).add(newSlug));
    toast.success("Tag added — remember to click Save tags");
  };


  return (
    <Card className="space-y-5 p-4 md:p-5">
      <div>
        <h2 className="font-display text-lg font-semibold">Tags & offerings</h2>
        <p className="text-sm text-muted-foreground">
          Pick everything this business offers. Tags from your primary type appear first; you can
          also add offerings from other categories (e.g. a used car dealership that also does tire
          repair, vulcanizing, or A/C service). These show as filterable badges and let customers
          discover you under more categories.
        </p>
      </div>


      {selected.size > 0 && (
        <div className="rounded-lg border border-border bg-secondary/40 p-3">
          <div className="mb-2 text-xs font-medium text-muted-foreground">
            {selected.size} selected
          </div>
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

      {groupKeys.map((k) => {
        const [typeKey, category] = k.split("::");
        const isOwn = typeKey === typeSlug || typeKey === "_universal";
        return (
          <div key={k}>
            <div className="mb-2 flex flex-wrap items-baseline gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {!isOwn && (
                <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] normal-case tracking-normal text-foreground/80">
                  Also offered · {typeLabel(typeKey)}
                </span>
              )}
              <span>{prettyCategory(category)}</span>
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
            <AddCustomTagInline category={category} onAdd={(label) => addCustom(k, label)} />
          </div>
        );
      })}


      <div className="flex flex-wrap items-center justify-between gap-3">
        <FormFeedbackLink formId="business-edit-tags" />
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save tags"}
        </Button>
      </div>
    </Card>
  );
}

function AddCustomTagInline({
  category,
  onAdd,
}: {
  category: string;
  onAdd: (label: string) => Promise<void> | void;
}) {
  const [val, setVal] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!val.trim()) return;
    setBusy(true);
    try {
      await onAdd(val);
      setVal("");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mt-2 flex gap-1.5">
      <Input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={`Add a ${prettyCategory(category).toLowerCase()} tag…`}
        className="h-8 max-w-xs text-xs"
        maxLength={40}
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={submit}
        disabled={busy || val.trim().length < 2}
      >
        <Plus className="mr-1 h-3 w-3" />
        Add
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
  const [facebookUrl, setFacebookUrl] = useState<string>(biz.facebook_url ?? "");
  const [whatsappNumber, setWhatsappNumber] = useState<string>(biz.whatsapp_number ?? "");
  const [brands, setBrands] = useState<string[]>([]);
  const [brandInput, setBrandInput] = useState("");

  // Hydrate brand list from DB on mount (public SELECT policy allows the read)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("business_brands")
        .select("name, sort_order")
        .eq("business_id", biz.id)
        .order("sort_order");
      if (cancelled) return;
      const rows = (data ?? []) as { name: string }[];
      if (rows.length > 0) {
        setBrands(rows.map((r) => r.name));
      } else if (biz.brands_carried) {
        // Legacy fallback: split free-text into chips
        setBrands(
          String(biz.brands_carried)
            .split(/[,\n;]+/)
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 60),
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [biz.id, biz.brands_carried]);

  const brandSuggestions = getBrandSuggestions(biz.type_slug);
  const lowerSet = new Set(brands.map((b) => b.toLowerCase()));
  const remainingSuggestions = brandSuggestions.filter((s) => !lowerSet.has(s.toLowerCase()));
  const topSuggestions = remainingSuggestions.slice(0, 8);
  const moreSuggestions = remainingSuggestions.slice(8);

  const addBrand = (raw: string) => {
    const name = raw.trim();
    if (!name) return;
    if (brands.length >= 60) {
      toast.error("Maximum of 60 brands");
      return;
    }
    if (brands.some((b) => b.toLowerCase() === name.toLowerCase())) return;
    setBrands((prev) => [...prev, name]);
    setBrandInput("");
  };
  const removeBrand = (idx: number) => {
    setBrands((prev) => prev.filter((_, i) => i !== idx));
  };
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
    } catch {
      /* noop */
    }
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
          facebook_url: facebookUrl.trim() || null,
          whatsapp_number: whatsappNumber.trim() || null,
          brands: brands.map((name) => ({ name })),
          brands_carried: brands.length > 0 ? brands.join(", ") : null,
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
      <div id="onboard-logo">
        <ImageField
          label="Logo"
          url={logoUrl}
          onUpload={(f) => onUpload(f, "logo")}
          onClear={() => setLogoUrl(null)}
          square
        />
      </div>
      <div id="onboard-cover">
        <ImageField
          label="Cover photo"
          url={coverUrl}
          onUpload={(f) => onUpload(f, "cover")}
          onClear={() => setCoverUrl(null)}
        />
      </div>

      <div>
        <Label>Business name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={160}
          placeholder="Your business name as customers see it"
          className="h-11 text-base"
        />
      </div>

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
      <div id="onboard-description">
        <Label>About / description</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          maxLength={4000}
          placeholder="Tell customers what makes you different"
        />
      </div>

      <div className="space-y-3 rounded-lg border border-border p-3">
        <div className="text-sm font-medium">Contact details</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div id="onboard-phone">
            <Label>Phone</Label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={40}
              placeholder="+63 9XX XXX XXXX"
              className="h-11"
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={200}
              placeholder="hello@yourbusiness.com"
              className="h-11"
            />
          </div>
          <div>
            <Label>Website</Label>
            <Input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              maxLength={500}
              placeholder="https://yourbusiness.com"
              className="h-11"
            />
          </div>
          <div>
            <Label>Messenger URL</Label>
            <Input
              type="url"
              value={messengerUrl}
              onChange={(e) => setMessengerUrl(e.target.value)}
              maxLength={500}
              placeholder="https://m.me/yourpage"
              className="h-11"
            />
          </div>
          <div>
            <Label>Facebook Page URL</Label>
            <Input
              type="url"
              value={facebookUrl}
              onChange={(e) => setFacebookUrl(e.target.value)}
              maxLength={500}
              placeholder="https://facebook.com/yourpage"
              className="h-11"
            />
          </div>
          <div>
            <Label>WhatsApp number</Label>
            <Input
              type="tel"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              maxLength={40}
              placeholder="+63 9XX XXX XXXX"
              className="h-11"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Saved as international format (e.g. +639XXXXXXXXX).
            </p>
          </div>
        </div>

        {/* Brands carried — structured chip editor */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Brands carried</Label>
            <span className="text-xs text-muted-foreground">{brands.length}/60</span>
          </div>
          {brands.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {brands.map((b, i) => (
                <span
                  key={`${b}-${i}`}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2.5 py-1 text-xs"
                >
                  {b}
                  <button
                    type="button"
                    onClick={() => removeBrand(i)}
                    className="rounded-full text-muted-foreground hover:text-foreground"
                    aria-label={`Remove ${b}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input
              value={brandInput}
              onChange={(e) => setBrandInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addBrand(brandInput);
                }
              }}
              maxLength={80}
              placeholder="Type a brand and press Enter…"
              className="h-10"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => addBrand(brandInput)}
              disabled={!brandInput.trim()}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add
            </Button>
          </div>
          {topSuggestions.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Suggested:</span>
              {topSuggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => addBrand(s)}
                  className="rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground hover:border-primary hover:text-foreground"
                >
                  + {s}
                </button>
              ))}
              {moreSuggestions.length > 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      +{moreSuggestions.length} more
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-72 p-2">
                    <div className="flex flex-wrap gap-1.5">
                      {moreSuggestions.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => addBrand(s)}
                          className="rounded-full border border-border bg-background px-2.5 py-1 text-xs hover:bg-secondary"
                        >
                          + {s}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          )}
        </div>
      </div>

      <div id="onboard-vanity">
        <VanitySlugField
          businessId={biz.id}
          currentVanity={biz.vanity_slug ?? null}
          currentSlug={biz.slug}
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
            <Input
              value={themeColor}
              onChange={(e) => setThemeColor(e.target.value)}
              maxLength={7}
              className="h-11"
            />
          </div>
        </div>
        <div>
          <Label>Primary call-to-action</Label>
          <Select value={ctaPrimary} onValueChange={setCtaPrimary}>
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <FormFeedbackLink formId="business-edit-profile" />
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
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
          {url ? (
            <img src={url} alt="Image preview" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          )}
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
            <Button variant="ghost" size="sm" onClick={onClear}>
              Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- SERVICES ---------------- */

function ServicesTab({
  businessId,
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
  const save = useServerFn(saveBusinessServices);

  const initial: DraftService[] = (services ?? []).map((s: any) => ({
    catalog_id: s.catalog_id ?? null,
    pending_suggestion_id: s.pending_suggestion_id ?? null,
    title: s.title,
    description: s.description ?? null,
    unit: s.unit ?? null,
    price_php: s.price_php ?? null,
    max_price_php: s.max_price_php ?? null,
    notes: s.price_label ?? null,
    region_scope: s.region_scope ?? null,
    service_radius_km: s.service_radius_km ?? null,
    eta_minutes: s.eta_minutes ?? null,
    tags: Array.isArray(s.tags) ? s.tags : [],
    available_24_7: !!s.available_24_7,
  }));

  const [draft, setDraft] = useState<DraftService[]>(initial);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Reset draft when server data changes (after a save / refetch).
  useEffect(() => {
    setDraft(initial);
    setDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [services]);

  // Debounced autosave.
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(async () => {
      setSaving(true);
      try {
        await save({ data: { businessId, services: draft } });
        onChange();
      } catch (e: any) {
        toast.error(e?.message ?? "Could not save services");
      } finally {
        setSaving(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [draft, dirty, businessId, save, onChange]);

  if (!typeSlug) {
    return (
      <Card className="p-4 text-sm text-muted-foreground">
        Choose a business type first to load the service catalog.
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end text-xs text-muted-foreground">
        {saving ? "Saving…" : dirty ? "Unsaved changes…" : "All changes saved"}
      </div>
      <ServicesTable
        typeSlug={typeSlug}
        businessId={businessId}
        value={draft}
        onChange={(next) => {
          setDraft(next);
          setDirty(true);
        }}
      />
    </div>
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
          <Plus className="mr-1 h-4 w-4" />
          Add product
        </Button>
      </div>
      {products.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">No products yet.</Card>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {products.map((p) => (
            <Card key={p.id} className="overflow-hidden">
              <div className="aspect-square w-full bg-muted">
                {p.photo_url ? (
                  <img src={p.photo_url} alt={p.title ? `${p.title} product photo` : "Product photo"} className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="p-2">
                <div className="line-clamp-2 text-sm font-medium">{p.title}</div>
                {p.price_php != null && (
                  <div className="text-xs">₱{Number(p.price_php).toLocaleString()}</div>
                )}
                <div className="mt-2 flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs"
                    onClick={() => setEditing(p)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      if (!(await confirm({ title: "Delete this product?", destructive: true })))
                        return;
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
  const [price, setPrice] = useState<string>(
    initial.price_php != null ? String(initial.price_php) : "",
  );
  const [sale, setSale] = useState<string>(
    initial.sale_price_php != null ? String(initial.sale_price_php) : "",
  );
  const [photoUrl, setPhotoUrl] = useState<string | null>(initial.photo_url ?? null);
  const [inStock, setInStock] = useState<boolean>(initial.in_stock ?? true);
  const [active, setActive] = useState<boolean>(initial.active ?? true);
  const [saving, setSaving] = useState(false);

  return (
    <Card className="space-y-3 border-primary/40 p-4">
      <div className="font-medium">{initial.id ? "Edit product" : "New product"}</div>
      <ImageField
        label="Photo"
        url={photoUrl}
        onUpload={async (f) => setPhotoUrl(await uploadMedia(userId, businessId, f))}
        onClear={() => setPhotoUrl(null)}
        square
      />
      <div>
        <Label>Title *</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={160}
          className="h-11 text-base"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Price (₱)</Label>
          <Input
            type="number"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="h-11 text-base"
          />
        </div>
        <div>
          <Label>Sale price (₱)</Label>
          <Input
            type="number"
            inputMode="decimal"
            value={sale}
            onChange={(e) => setSale(e.target.value)}
            className="h-11 text-base"
          />
        </div>
      </div>
      <div>
        <Label>Description</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={2000}
        />
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
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
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
        <ImageField
          label="Photo (optional)"
          url={photoUrl}
          onUpload={async (f) => setPhotoUrl(await uploadMedia(userId, businessId, f))}
          onClear={() => setPhotoUrl(null)}
          square
        />
        <div className="flex justify-end">
          <Button onClick={post} disabled={saving || body.trim().length === 0}>
            {saving ? "Posting…" : "Post update"}
          </Button>
        </div>
      </Card>

      {posts.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">No posts yet.</Card>
      ) : (
        <div className="space-y-2">
          {posts.map((p) => (
            <Card key={p.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="text-xs text-muted-foreground">
                  {new Date(p.created_at).toLocaleString()}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    if (!(await confirm({ title: "Delete this post?", destructive: true }))) return;
                    await del({ data: { businessId, id: p.id } });
                    onChange();
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm">{p.body}</p>
              {p.photo_url && (
                <img src={p.photo_url} alt="Post photo" className="mt-2 max-h-72 rounded-md object-cover" />
              )}
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
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        No inquiries yet. They'll appear here when customers send a message from your public page.
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {inquiries.map((i) => (
        <Card key={i.id} className="p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-medium">{i.name}</div>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  i.status === "new" ? "destructive" : i.status === "open" ? "default" : "secondary"
                }
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
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue />
                </SelectTrigger>
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
          Update your address and pin location. Customers use this for directions and proximity
          search.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label>Street address</Label>
          <Input
            value={streetAddress}
            onChange={(e) => setStreetAddress(e.target.value)}
            placeholder="123 Rizal St."
          />
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <FormFeedbackLink formId="business-edit-location" />
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
      const { error } = await (supabase as any)
        .from("businesses")
        .update({ hours: payload })
        .eq("id", biz.id);
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
          Times are in Asia/Manila. Visitors see an "Open now / Closing soon / Opening soon /
          Closed" badge automatically.
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
              onChange={(e) =>
                setStore(e.target.checked ? (store ?? JSON.parse(JSON.stringify(primary))) : null)
              }
            />
            Convenience store / Sari-Sari Store has different hours
          </label>
          {store && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Store hours
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setStore(JSON.parse(JSON.stringify(primary)))}
                >
                  Copy from station
                </Button>
              </div>
              <WeekHoursEditor value={store} onChange={setStore} />
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <FormFeedbackLink formId="business-edit-hours" />
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save hours"}
        </Button>
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
  const origin =
    siteOrigin();

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
          A clean, memorable web address for your business — perfect for business cards, posters,
          and stickers. Replaces the long auto-generated link.
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
        3–32 characters · lowercase letters, numbers, and hyphens · cannot start or end with a
        hyphen.
      </p>
      {preview && (
        <p className="text-xs">
          Will be reachable at{" "}
          <a
            className="text-primary underline"
            href={`/b/${preview}`}
            target="_blank"
            rel="noreferrer"
          >
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
      <FormFeedbackLink formId="business-edit-vanity" className="pt-1" />
      <p className="text-[11px] text-muted-foreground">
        Canonical permalink: <span className="font-mono">/businesses/{currentSlug}</span> (old links
        keep working).
      </p>
    </Card>
  );
}
