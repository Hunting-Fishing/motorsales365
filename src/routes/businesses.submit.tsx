import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/site-layout";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Search, Upload, X } from "lucide-react";
import { LocationDrilldown, type LocationValue } from "@/components/businesses/location-drilldown";
import { LocationPicker } from "@/components/businesses/location-picker";
import { resolvePsgc } from "@/lib/psgc";
import { uploadWithRetry } from "@/lib/storage-upload";
import { toast } from "sonner";
import { useDynamicMeta } from "@/hooks/use-dynamic-meta";
import { useDynamicJsonLd } from "@/hooks/use-dynamic-jsonld";

export const Route = createFileRoute("/businesses/submit")({
  head: () => ({
    meta: [
      { title: "List your business — 365 MotorSales Philippines" },
      { name: "description", content: "Add your dealership, shop, or auto service to the 365 MotorSales Philippines directory. Reach buyers and sellers nationwide." },
      { property: "og:title", content: "List your business — 365 MotorSales Philippines" },
      { property: "og:description", content: "Add your dealership, shop, or auto service to the 365 MotorSales Philippines directory." },
      { property: "og:url", content: "https://www.365motorsales.com/businesses/submit" },
    ],
    links: [{ rel: "canonical", href: "https://www.365motorsales.com/businesses/submit" }],
  }),
  component: SubmitBusinessPage,
});

function slugify(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

function SubmitBusinessPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [types, setTypes] = useState<{ slug: string; label: string }[]>([]);
  const [tags, setTags] = useState<{ slug: string; label: string; type_slug: string | null; category: string | null; is_popular: boolean }[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [typeSlug, setTypeSlug] = useState<string>("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [messengerUrl, setMessengerUrl] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [loc, setLoc] = useState<LocationValue>({ region: null, province: null, city: null, barangay: null });
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [brandsCarried, setBrandsCarried] = useState("");
  const [priceLabel, setPriceLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState("");
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestLabel, setSuggestLabel] = useState("");
  const [suggestNotes, setSuggestNotes] = useState("");
  const [suggestSubmitting, setSuggestSubmitting] = useState(false);

  const submitTypeSuggestion = async () => {
    const label = suggestLabel.trim();
    if (label.length < 2) { toast.error("Please enter a type name (min 2 chars)."); return; }
    if (label.length > 80) { toast.error("Type name is too long (max 80)."); return; }
    if (!user) { toast.error("Please sign in first."); return; }
    setSuggestSubmitting(true);
    const { error } = await (supabase as any).from("business_type_suggestions").insert({
      proposed_label: label,
      notes: suggestNotes.trim() || null,
      submitter_id: user.id,
      submitter_email: user.email ?? null,
    });
    setSuggestSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Thanks! Your suggestion was sent to admin for review.");
    setSuggestLabel(""); setSuggestNotes(""); setSuggestOpen(false);
  };

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  useEffect(() => {
    (async () => {
      const [{ data: t1 }, { data: t2 }] = await Promise.all([
        (supabase as any).from("business_types").select("slug,label").order("sort_order"),
        (supabase as any).from("business_tags").select("slug,label,type_slug,category,sort_order,is_popular").order("sort_order"),
      ]);
      setTypes(t1 ?? []); setTags(t2 ?? []);
    })();
  }, []);

  const selectedTypeLabel = types.find((t) => t.slug === typeSlug)?.label;
  const selectedTagLabels = selectedTags
    .map((s) => tags.find((t) => t.slug === s)?.label)
    .filter(Boolean)
    .slice(0, 3)
    .join(", ");
  const dynTitle = selectedTypeLabel
    ? `List your ${selectedTypeLabel.toLowerCase()} — 365 MotorSales Philippines`
    : "List your business — 365 MotorSales Philippines";
  const dynDesc = selectedTypeLabel
    ? `Add your ${selectedTypeLabel.toLowerCase()}${selectedTagLabels ? ` (${selectedTagLabels})` : ""} to the 365 MotorSales Philippines directory and reach buyers and sellers nationwide.`
    : "Add your dealership, shop, or auto service to the 365 MotorSales Philippines directory.";
  useDynamicMeta({
    title: dynTitle,
    description: dynDesc,
    canonical: "https://www.365motorsales.com/businesses/submit",
  });
  useDynamicJsonLd("businesses-submit-page", {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: dynTitle,
    description: dynDesc,
    url: "https://www.365motorsales.com/businesses/submit",
    inLanguage: "en-PH",
    isPartOf: {
      "@type": "WebSite",
      name: "365 MotorSales Philippines",
      url: "https://www.365motorsales.com",
    },
    ...(selectedTypeLabel
      ? {
          about: {
            "@type": "LocalBusiness",
            name: selectedTypeLabel,
            ...(selectedTags.length > 0
              ? {
                  knowsAbout: selectedTags
                    .map((s) => tags.find((t) => t.slug === s)?.label)
                    .filter(Boolean),
                }
              : {}),
            areaServed: { "@type": "Country", name: "Philippines" },
          },
        }
      : {}),
    potentialAction: {
      "@type": "RegisterAction",
      name: selectedTypeLabel ? `List a ${selectedTypeLabel.toLowerCase()}` : "List your business",
      target: "https://www.365motorsales.com/businesses/submit",
    },
  });

  const reverseGeocode = async (la: number, ln: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${la}&lon=${ln}&zoom=18&addressdetails=1`,
        { headers: { "Accept": "application/json", "Accept-Language": "en" } },
      );
      const json = await res.json();
      const a = json?.address ?? {};
      const cityish = a.city || a.town || a.municipality || a.village || a.suburb || null;
      const provinceish = a.province || a.state_district || a.state || null;
      const regionish = a.region || a.state || null;
      const barangayish: string | null =
        a.neighbourhood || a.quarter || a.hamlet || a.suburb || a.village || null;
      const postcode: string | null = a.postcode || null;
      const street = [a.house_number, a.road].filter(Boolean).join(" ").trim() || null;
      const resolved = resolvePsgc({ region: regionish, province: provinceish, city: cityish });
      // Only overwrite empty fields — never clobber what the user already typed.
      setLoc((prev) => ({
        region: prev.region ?? resolved.region ?? null,
        province: prev.province ?? resolved.province ?? null,
        city: prev.city ?? resolved.city ?? null,
        barangay: prev.barangay ?? barangayish ?? null,
      }));
      if (street) setStreetAddress((prev) => (prev.trim() ? prev : street));
      if (postcode) setPostalCode((prev) => (prev.trim() ? prev : postcode));
    } catch {
      /* silent — user can still type fields manually */
    }
  };

  const setCoords = (la: number, ln: number, opts?: { reverse?: boolean }) => {
    setLat(la.toFixed(6));
    setLng(ln.toFixed(6));
    if (opts?.reverse !== false) void reverseGeocode(la, ln);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) { toast.error("Geolocation not supported"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords(pos.coords.latitude, pos.coords.longitude); toast.success("Location captured"); },
      () => toast.error("Could not get your location"),
    );
  };

  const geocodeAddress = async () => {
    const parts = [streetAddress, loc.barangay, loc.city, loc.province, loc.region, "Philippines"]
      .filter(Boolean).join(", ");
    if (!parts.trim()) { toast.error("Enter an address or pick a location first"); return; }
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ph&q=${encodeURIComponent(parts)}`, {
        headers: { "Accept": "application/json" },
      });
      const json = await res.json();
      if (Array.isArray(json) && json[0]) {
        setCoords(Number(json[0].lat), Number(json[0].lon), { reverse: false });
        toast.success("Found location on map");
      } else {
        toast.error("No match — drop the pin manually");
      }
    } catch {
      toast.error("Geocoding failed — drop the pin manually");
    }
  };

  const onLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Logo must be 5MB or smaller"); return; }
    setLogoUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/_pending/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { publicUrl } = await uploadWithRetry({ bucket: "business-media", path, file, contentType: file.type });
      setLogoUrl(publicUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLogoUploading(false);
    }
  };


  const submit = async () => {
    if (!user) return;
    if (!name.trim() || !typeSlug) { toast.error("Name and business type are required"); return; }
    setSubmitting(true);
    const slug = `${slugify(name)}-${Math.random().toString(36).slice(2, 7)}`;
    const insert = {
      owner_id: user.id, slug, name: name.trim(), type_slug: typeSlug,
      description: description.trim() || null,
      logo_url: logoUrl,
      phone: phone.trim() || null, email: email.trim() || null,
      website: website.trim() || null, messenger_url: messengerUrl.trim() || null,
      street_address: streetAddress.trim() || null,
      region: loc.region, province: loc.province, city: loc.city, barangay: loc.barangay,
      postal_code: postalCode.trim() || null,
      brands_carried: brandsCarried.trim() || null,
      price_label: priceLabel.trim() || null,
      lat: lat ? Number(lat) : null, lng: lng ? Number(lng) : null,
      status: "pending",
    };
    const { data, error } = await (supabase as any).from("businesses").insert(insert).select("id").single();
    if (error) { setSubmitting(false); toast.error(error.message); return; }
    if (selectedTags.length > 0) {
      await (supabase as any).from("business_tag_links").insert(selectedTags.map((s) => ({ business_id: data.id, tag_slug: s })));
    }
    setSubmitting(false);
    toast.success("Submitted! It will appear after review.");
    navigate({ to: "/dashboard/businesses" });
  };

  const visibleTags = typeSlug ? tags.filter((t) => t.type_slug === null || t.type_slug === typeSlug) : tags.filter((t) => t.type_slug === null);
  const popularTags = visibleTags.filter((t) => t.is_popular).slice(0, 10);
  const popularSet = new Set(popularTags.map((t) => t.slug));
  const extraSelected = visibleTags.filter((t) => selectedTags.includes(t.slug) && !popularSet.has(t.slug));
  const inlineTags = [...popularTags, ...extraSelected];

  const toggleTag = (slug: string) =>
    setSelectedTags((prev) => prev.includes(slug) ? prev.filter((x) => x !== slug) : [...prev, slug]);

  const prettyCategory = (k: string | null) => {
    if (!k) return "Other";
    const overrides: Record<string, string> = {
      fuel_grade: "Fuel grade / octane",
      ev_charging: "EV charging",
      station_services: "Station services",
    };
    if (overrides[k]) return overrides[k];
    return k.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" & ").replace("Vehicle & Scope", "Vehicle scope").replace("Service & Mode", "Service mode");
  };

  const filteredDialogTags = visibleTags.filter((t) => {
    if (!tagSearch.trim()) return true;
    const q = tagSearch.toLowerCase();
    return t.label.toLowerCase().includes(q) || (t.category ?? "").toLowerCase().includes(q);
  });
  const grouped: Record<string, typeof visibleTags> = {};
  for (const t of filteredDialogTags) {
    const key = t.category ?? "other";
    (grouped[key] = grouped[key] ?? []).push(t);
  }
  const groupKeys = Object.keys(grouped).sort();


  if (loading || !user) return <SiteLayout><div className="p-12 text-center">Loading…</div></SiteLayout>;

  return (
    <SiteLayout>
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <Link to="/businesses" className="text-sm text-muted-foreground hover:text-foreground">← Back to businesses</Link>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight md:text-3xl">List your business</h1>
        <p className="mb-6 text-sm text-muted-foreground">Submissions go through a quick review before being published.</p>

        <Card className="space-y-5 p-5">
          <div>
            <Label>Business name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="e.g. Quezon Ave Toyota" />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <Label>Business type *</Label>
              <Dialog open={suggestOpen} onOpenChange={setSuggestOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" size="sm">+ Add</Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Suggest a new business type</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Don't see your type? Suggest it below. Our admin team will review and either add it to the list or merge it with an existing type.
                    </p>
                    <div>
                      <Label>Type name *</Label>
                      <Input
                        value={suggestLabel}
                        onChange={(e) => setSuggestLabel(e.target.value)}
                        maxLength={80}
                        placeholder="e.g. Tire shop, Window tinting, Truck rental"
                      />
                    </div>
                    <div>
                      <Label>Notes (optional)</Label>
                      <Textarea
                        value={suggestNotes}
                        onChange={(e) => setSuggestNotes(e.target.value)}
                        maxLength={500}
                        rows={3}
                        placeholder="Briefly describe what businesses this type covers."
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => setSuggestOpen(false)}>Cancel</Button>
                    <Button type="button" onClick={submitTypeSuggestion} disabled={suggestSubmitting}>
                      {suggestSubmitting ? "Sending…" : "Send to admin"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <Select value={typeSlug} onValueChange={(v) => { setTypeSlug(v); setSelectedTags([]); }}>
              <SelectTrigger><SelectValue placeholder="Choose a type" /></SelectTrigger>
              <SelectContent>
                {types.map((t) => <SelectItem key={t.slug} value={t.slug}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {visibleTags.length > 0 && (
            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <Label>Tags {selectedTags.length > 0 && <span className="ml-1 text-xs text-muted-foreground">({selectedTags.length} selected)</span>}</Label>
                <Dialog open={tagsOpen} onOpenChange={setTagsOpen}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" size="sm">Browse all tags</Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden p-0">
                    <DialogHeader className="border-b p-4">
                      <DialogTitle>Browse all tags</DialogTitle>
                    </DialogHeader>
                    <div className="border-b p-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          autoFocus
                          placeholder="Search tags…"
                          value={tagSearch}
                          onChange={(e) => setTagSearch(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <div className="max-h-[55vh] space-y-5 overflow-y-auto p-4">
                      {groupKeys.length === 0 && (
                        <p className="py-8 text-center text-sm text-muted-foreground">No tags match "{tagSearch}"</p>
                      )}
                      {groupKeys.map((k) => (
                        <div key={k}>
                          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {prettyCategory(k)}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {grouped[k].map((t) => {
                              const on = selectedTags.includes(t.slug);
                              return (
                                <button
                                  type="button" key={t.slug}
                                  onClick={() => toggleTag(t.slug)}
                                  className={`rounded-full border px-3 py-1 text-xs transition ${on ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary"}`}
                                >{t.label}</button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                    <DialogFooter className="border-t p-4">
                      <span className="mr-auto self-center text-xs text-muted-foreground">{selectedTags.length} selected</span>
                      <Button type="button" onClick={() => { setTagsOpen(false); setTagSearch(""); }}>Done</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <p className="mb-2 text-xs text-muted-foreground">Top {popularTags.length} popular tags shown — use "Browse all tags" for the full library.</p>
              <div className="flex flex-wrap gap-2">
                {inlineTags.map((t) => {
                  const on = selectedTags.includes(t.slug);
                  return (
                    <button
                      type="button" key={t.slug}
                      onClick={() => toggleTag(t.slug)}
                      className={`rounded-full border px-3 py-1 text-xs transition ${on ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary"}`}
                    >{t.label}</button>
                  );
                })}
              </div>
            </div>
          )}

          {["parts_accessories", "repair_shop", "body_paint", "salvage"].includes(typeSlug) && (
            <div>
              <Label>Brands carried / serviced</Label>
              <Input
                value={brandsCarried}
                onChange={(e) => setBrandsCarried(e.target.value)}
                maxLength={300}
                placeholder={
                  typeSlug === "parts_accessories"
                    ? "e.g. Bosch, Denso, NGK, Michelin, Yokohama"
                    : typeSlug === "salvage"
                    ? "e.g. Toyota, Honda, Mitsubishi, Isuzu"
                    : "e.g. Toyota, Honda, Mitsubishi, Ford"
                }
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Comma-separated. Helps buyers find you when searching for specific brands.
              </p>
            </div>
          )}

          <div>
            <Label>Description</Label>
            <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} />
          </div>

          <div>
            <Label>Price / rate label <span className="text-xs font-normal text-muted-foreground">(optional, shown on map and profile)</span></Label>
            <Input
              value={priceLabel}
              onChange={(e) => setPriceLabel(e.target.value)}
              maxLength={40}
              placeholder="e.g. ₱65/L, From ₱500, Free estimate"
            />
          </div>


          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div><Label>Website</Label><Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" /></div>
            <div><Label>Messenger / FB</Label><Input value={messengerUrl} onChange={(e) => setMessengerUrl(e.target.value)} placeholder="https://m.me/…" /></div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
            <div>
              <Label>Street address</Label>
              <Input value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} maxLength={200} />
            </div>
            <div>
              <Label>Postal code</Label>
              <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} maxLength={10} />
            </div>
          </div>

          <div>
            <Label>Location</Label>
            <LocationDrilldown value={loc} onChange={setLoc} />
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label>Pin your business on the map</Label>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={geocodeAddress}>Find on map</Button>
                <Button type="button" variant="outline" size="sm" onClick={useMyLocation}>Use my location</Button>
              </div>
            </div>
            <p className="mb-2 mt-1 text-xs text-muted-foreground">Click the map or drag the pin to set the exact spot. Coordinates are saved with your listing.</p>
            <LocationPicker
              lat={lat ? Number(lat) : null}
              lng={lng ? Number(lng) : null}
              region={loc.region}
              onChange={(la, ln) => setCoords(la, ln)}
            />
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <Input placeholder="Latitude" value={lat} onChange={(e) => setLat(e.target.value)} />
              <Input placeholder="Longitude" value={lng} onChange={(e) => setLng(e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={submit} disabled={submitting}>{submitting ? "Submitting…" : "Submit for review"}</Button>
          </div>
        </Card>
      </div>
    </SiteLayout>
  );
}
