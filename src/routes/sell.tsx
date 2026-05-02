import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Upload, X, Camera, Video as VideoIcon, RotateCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatPHP } from "@/lib/format";
import { LocationPicker } from "@/components/location-picker";
import { VehiclePicker } from "@/components/vehicle-picker";
import { uploadWithRetry } from "@/lib/storage-upload";

export const Route = createFileRoute("/sell")({
  component: SellPage,
});

const CATEGORIES = [
  { slug: "car", name: "Car" },
  { slug: "motorcycle", name: "Motorcycle" },
  { slug: "boat", name: "Boat" },
  { slug: "airplane", name: "Airplane" },
  { slug: "equipment", name: "Heavy Equipment" },
  { slug: "other", name: "Other" },
];

function SellPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [category, setCategory] = useState("car");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [region, setRegion] = useState<string | null>(null);
  const [province, setProvince] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [barangay, setBarangay] = useState<string | null>(null);
  const [condition, setCondition] = useState("Used");
  const [phone, setPhone] = useState("");
  const [sellerType, setSellerType] = useState<"private" | "business">("private");
  const [plan, setPlan] = useState<"standard" | "upgraded">("standard");
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [mileage, setMileage] = useState("");
  const [transmission, setTransmission] = useState("");
  const [fuel, setFuel] = useState("");

  const [photos, setPhotos] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [pricing, setPricing] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    supabase.from("pricing_settings").select("key,value").then(({ data }) => {
      const map: Record<string, number> = {};
      (data ?? []).forEach((r: any) => { map[r.key] = Number(r.value); });
      setPricing(map);
    });
  }, []);

  const maxPhotos = plan === "upgraded" ? 20 : 5;
  const maxVideos = plan === "upgraded" ? 3 : 1;
  const totalFee = (pricing.listing_fee_php ?? 20) + (plan === "upgraded" ? (pricing.upgrade_fee_php ?? 100) : 0);

  const handlePhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const remaining = maxPhotos - photos.length;
    if (files.length > remaining) {
      const overflow = files.length - Math.max(remaining, 0);
      toast.error(
        plan === "standard"
          ? `Standard listings allow up to ${maxPhotos} photos. ${overflow} photo(s) skipped — upgrade to add up to 20.`
          : `Up to ${maxPhotos} photos allowed. ${overflow} photo(s) skipped.`,
      );
    }
    const next = [...photos, ...files].slice(0, maxPhotos);
    setPhotos(next);
    // Allow re-selecting the same files after a blocked attempt.
    e.target.value = "";
  };

  const removePhoto = (i: number) => setPhotos(photos.filter((_, idx) => idx !== i));

  const handleVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) { setVideo(null); return; }
    if (maxVideos < 1) {
      toast.error("Videos are not included in this plan.");
      e.target.value = "";
      return;
    }
    setVideo(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!title || !price) { toast.error("Title and price are required"); return; }
    if (!region || !city) { toast.error("Please select region and city"); return; }
    if (photos.length === 0) { toast.error("Please add at least one photo"); return; }
    if (photos.length > maxPhotos) {
      toast.error(
        plan === "standard"
          ? `Too many photos for Standard (max ${maxPhotos}). Remove some or upgrade.`
          : `Too many photos (max ${maxPhotos}).`,
      );
      return;
    }
    if (video && maxVideos < 1) {
      toast.error("Remove the video or upgrade your plan to include video.");
      return;
    }

    setSubmitting(true);
    try {
      const attributes: Record<string, any> = {};
      if (year) attributes.year = year;
      if (make) attributes.make = make;
      if (model) attributes.model = model;
      if (make || model) attributes.make_model = [make, model].filter(Boolean).join(" ");
      if (mileage) attributes.mileage_km = mileage;
      if (transmission) attributes.transmission = transmission;
      if (fuel) attributes.fuel = fuel;

      const expiryDays = pricing.listing_expiry_days ?? 60;
      const expires = new Date();
      expires.setDate(expires.getDate() + expiryDays);

      const { data: listing, error } = await supabase.from("listings").insert({
        user_id: user.id,
        category_slug: category,
        title,
        description,
        price_php: Number(price),
        condition,
        region,
        province,
        city,
        barangay,
        seller_type: sellerType,
        plan,
        contact_phone: phone || null,
        attributes,
        status: "pending_payment",
        expires_at: expires.toISOString(),
      }).select().single();

      if (error || !listing) throw error;

      // Upload photos
      const mediaInserts: any[] = [];
      for (let i = 0; i < photos.length; i++) {
        const file = photos[i];
        const path = `${user.id}/${listing.id}/${Date.now()}-${i}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("listing-photos").upload(path, file);
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("listing-photos").getPublicUrl(path);
        mediaInserts.push({ listing_id: listing.id, type: "photo", url: pub.publicUrl, storage_path: path, sort_order: i });
      }
      if (video) {
        const path = `${user.id}/${listing.id}/${Date.now()}-${video.name}`;
        const { error: upErr } = await supabase.storage.from("listing-videos").upload(path, video);
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("listing-videos").getPublicUrl(path);
        mediaInserts.push({ listing_id: listing.id, type: "video", url: pub.publicUrl, storage_path: path, sort_order: 0 });
      }
      if (mediaInserts.length) {
        await supabase.from("listing_media").insert(mediaInserts);
      }

      // Create pending payment record
      await supabase.from("payments").insert({
        user_id: user.id,
        listing_id: listing.id,
        kind: plan === "upgraded" ? "upgrade" : "listing",
        amount_php: totalFee,
        status: "pending",
        method: "manual",
      });

      toast.success("Listing submitted! Awaiting payment confirmation.");
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to publish listing");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) return <SiteLayout><div className="p-12 text-center">Loading…</div></SiteLayout>;

  return (
    <SiteLayout>
      <div className="container mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-display text-3xl font-bold">Post a listing</h1>
        <p className="text-muted-foreground">Reach buyers across the Philippines.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <section className="space-y-4 rounded-xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-semibold">Category & basics</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Condition</Label>
                <Select value={condition} onValueChange={setCondition}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Brand new">Brand new</SelectItem>
                    <SelectItem value="Used">Used</SelectItem>
                    <SelectItem value="For parts">For parts</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="2019 Toyota Vios 1.3 E AT" />
              </div>
              <div>
                <Label htmlFor="price">Price (₱)</Label>
                <Input id="price" type="number" min="0" required value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="phone">Contact phone (optional)</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+63 9XX XXX XXXX" />
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-semibold">Details</h2>
            {(category === "car" || category === "motorcycle") ? (
              <div className="space-y-4">
                <VehiclePicker
                  category={category as "car" | "motorcycle"}
                  make={make}
                  model={model}
                  onChange={(v) => { setMake(v.make); setModel(v.model); }}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label>Year</Label><Input value={year} onChange={(e) => setYear(e.target.value)} placeholder="e.g. 2019" /></div>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Make / Brand</Label>
                  <Input value={make} onChange={(e) => setMake(e.target.value)} />
                </div>
                <div>
                  <Label>Model</Label>
                  <Input value={model} onChange={(e) => setModel(e.target.value)} />
                </div>
                <div><Label>Year</Label><Input value={year} onChange={(e) => setYear(e.target.value)} /></div>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              {(category === "car" || category === "motorcycle") && (
                <>
                  <div><Label>Mileage (km)</Label><Input value={mileage} onChange={(e) => setMileage(e.target.value)} /></div>
                  <div>
                    <Label>Transmission</Label>
                    <Select value={transmission} onValueChange={setTransmission}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Automatic">Automatic</SelectItem>
                        <SelectItem value="Manual">Manual</SelectItem>
                        <SelectItem value="CVT">CVT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Fuel</Label>
                    <Select value={fuel} onValueChange={setFuel}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Gasoline">Gasoline</SelectItem>
                        <SelectItem value="Diesel">Diesel</SelectItem>
                        <SelectItem value="Hybrid">Hybrid</SelectItem>
                        <SelectItem value="Electric">Electric</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <div className="sm:col-span-2">
                <Label>Description</Label>
                <Textarea rows={5} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-semibold">Location</h2>
            <p className="text-xs text-muted-foreground">Based on the official PSA Philippine Standard Geographic Code.</p>
            <LocationPicker
              value={{ region, province, city, barangay }}
              onChange={(v) => {
                setRegion(v.region ?? null);
                setProvince(v.province ?? null);
                setCity(v.city ?? null);
                setBarangay(v.barangay ?? null);
              }}
            />
          </section>

          <section className="space-y-4 rounded-xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-semibold">Seller type</h2>
            <RadioGroup value={sellerType} onValueChange={(v: any) => setSellerType(v)} className="grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 hover:bg-secondary/50">
                <RadioGroupItem value="private" className="mt-1" />
                <div><div className="font-medium">Private seller</div><div className="text-xs text-muted-foreground">I'm selling my personal vehicle</div></div>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 hover:bg-secondary/50">
                <RadioGroupItem value="business" className="mt-1" />
                <div><div className="font-medium">Business / Dealer</div><div className="text-xs text-muted-foreground">I sell vehicles as a business</div></div>
              </label>
            </RadioGroup>
          </section>

          <section className="space-y-4 rounded-xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-semibold">Plan</h2>
            <RadioGroup value={plan} onValueChange={(v: any) => setPlan(v)} className="grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 hover:bg-secondary/50">
                <RadioGroupItem value="standard" className="mt-1" />
                <div>
                  <div className="font-medium">Standard — {formatPHP(pricing.listing_fee_php ?? 20)}</div>
                  <div className="text-xs text-muted-foreground">Up to 5 photos, 1 video</div>
                </div>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 hover:bg-secondary/50">
                <RadioGroupItem value="upgraded" className="mt-1" />
                <div>
                  <div className="font-medium">Upgraded — {formatPHP((pricing.listing_fee_php ?? 20) + (pricing.upgrade_fee_php ?? 100))}</div>
                  <div className="text-xs text-muted-foreground">Up to 20 photos, 3 videos</div>
                </div>
              </label>
            </RadioGroup>
          </section>

          <section className="space-y-4 rounded-xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-semibold">Photos & video</h2>
            {(photos.length > maxPhotos || (video && maxVideos < 1)) && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                Your media exceeds the {plan === "standard" ? "Standard" : "current"} plan limit ({maxPhotos} photos
                {maxVideos > 0 ? `, ${maxVideos} video${maxVideos > 1 ? "s" : ""}` : ", no video"}).
                Remove items or switch to Upgraded to submit.
              </div>
            )}
            <div>
              <Label className="flex items-center gap-2"><Camera className="h-4 w-4" />Photos ({photos.length}/{maxPhotos})</Label>
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {photos.map((file, i) => (
                  <div key={i} className="relative aspect-square overflow-hidden rounded-md bg-secondary">
                    <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
                    <button type="button" onClick={() => removePhoto(i)} className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {photos.length < maxPhotos && (
                  <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-border text-muted-foreground hover:bg-secondary/50">
                    <Upload className="h-5 w-5" />
                    <span className="mt-1 text-xs">Add</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotos} />
                  </label>
                )}
              </div>
            </div>
            <div>
              <Label className="flex items-center gap-2"><VideoIcon className="h-4 w-4" />Video (max {maxVideos})</Label>
              <Input type="file" accept="video/*" onChange={handleVideo} className="mt-2" />
              {video && (
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="truncate">{video.name}</span>
                  <button type="button" onClick={() => setVideo(null)} className="text-foreground hover:underline">Remove</button>
                </div>
              )}
              {plan === "standard" && (
                <p className="mt-1 text-xs text-muted-foreground">Standard includes 1 video. Upgrade to add up to 3.</p>
              )}
            </div>
          </section>

          <div className="flex flex-col items-stretch justify-between gap-3 rounded-xl border border-border bg-card p-6 sm:flex-row sm:items-center">
            <div>
              <div className="text-sm text-muted-foreground">Total listing fee</div>
              <div className="font-display text-2xl font-bold text-primary">{formatPHP(totalFee)}</div>
              <div className="text-xs text-muted-foreground">Listing publishes after payment is confirmed.</div>
            </div>
            <div className="flex gap-2">
              <Button asChild type="button" variant="outline"><Link to="/dashboard">Cancel</Link></Button>
              <Button type="submit" disabled={submitting} size="lg">
                {submitting ? "Submitting…" : "Submit listing"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </SiteLayout>
  );
}
