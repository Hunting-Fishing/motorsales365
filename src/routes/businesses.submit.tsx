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
import { LocationDrilldown, type LocationValue } from "@/components/businesses/location-drilldown";
import { LocationPicker } from "@/components/businesses/location-picker";
import { resolvePsgc } from "@/lib/psgc";
import { toast } from "sonner";

export const Route = createFileRoute("/businesses/submit")({
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
  const [tags, setTags] = useState<{ slug: string; label: string; type_slug: string | null }[]>([]);
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
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  useEffect(() => {
    (async () => {
      const [{ data: t1 }, { data: t2 }] = await Promise.all([
        (supabase as any).from("business_types").select("slug,label").order("sort_order"),
        (supabase as any).from("business_tags").select("slug,label,type_slug,sort_order").order("sort_order"),
      ]);
      setTypes(t1 ?? []); setTags(t2 ?? []);
    })();
  }, []);

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
      const resolved = resolvePsgc({ region: regionish, province: provinceish, city: cityish });
      setLoc((prev) => ({
        region: resolved.region ?? prev.region,
        province: resolved.province ?? prev.province,
        city: resolved.city ?? prev.city,
        barangay: barangayish ?? prev.barangay,
      }));
      if (a.road && !streetAddressRef.current) {
        const street = [a.house_number, a.road].filter(Boolean).join(" ");
        if (street) setStreetAddress(street);
      }
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

  const submit = async () => {
    if (!user) return;
    if (!name.trim() || !typeSlug) { toast.error("Name and business type are required"); return; }
    setSubmitting(true);
    const slug = `${slugify(name)}-${Math.random().toString(36).slice(2, 7)}`;
    const insert = {
      owner_id: user.id, slug, name: name.trim(), type_slug: typeSlug,
      description: description.trim() || null,
      phone: phone.trim() || null, email: email.trim() || null,
      website: website.trim() || null, messenger_url: messengerUrl.trim() || null,
      street_address: streetAddress.trim() || null,
      region: loc.region, province: loc.province, city: loc.city, barangay: loc.barangay,
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
            <Label>Business type *</Label>
            <Select value={typeSlug} onValueChange={(v) => { setTypeSlug(v); setSelectedTags([]); }}>
              <SelectTrigger><SelectValue placeholder="Choose a type" /></SelectTrigger>
              <SelectContent>
                {types.map((t) => <SelectItem key={t.slug} value={t.slug}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {visibleTags.length > 0 && (
            <div>
              <Label>Tags</Label>
              <div className="mt-1 flex flex-wrap gap-2">
                {visibleTags.map((t) => {
                  const on = selectedTags.includes(t.slug);
                  return (
                    <button
                      type="button" key={t.slug}
                      onClick={() => setSelectedTags((prev) => on ? prev.filter((x) => x !== t.slug) : [...prev, t.slug])}
                      className={`rounded-full border px-3 py-1 text-xs transition ${on ? "border-foreground bg-foreground text-background" : "border-border hover:bg-secondary"}`}
                    >{t.label}</button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <Label>Description</Label>
            <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div><Label>Website</Label><Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" /></div>
            <div><Label>Messenger / FB</Label><Input value={messengerUrl} onChange={(e) => setMessengerUrl(e.target.value)} placeholder="https://m.me/…" /></div>
          </div>

          <div>
            <Label>Street address</Label>
            <Input value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} maxLength={200} />
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
              onChange={(la, ln) => { setLat(la.toFixed(6)); setLng(ln.toFixed(6)); }}
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
