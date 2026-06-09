import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Truck,
  Clock,
  ShieldCheck,
  PhoneCall,
  Wallet,
  MapPin,
  Plus,
  Siren,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LocationPicker } from "@/components/location-picker";
import { ListingCard, type ListingCardData } from "@/components/listing-card";
import { FeaturedTowProviders } from "@/components/tow/featured-tow-providers";

const SERVICE_CHIPS = [
  "Tow car",
  "Tow motorcycle",
  "Flatbed",
  "Long-distance transport",
  "Heavy equipment hauling",
  "Recovery/winch-out",
];

const VEHICLE_TYPES = [
  "Car",
  "Motorcycle",
  "SUV / Pickup",
  "Van",
  "Truck",
  "Heavy equipment",
  "Boat / Trailer",
];

const PAYMENT_METHODS = ["GCash", "Maya", "Cash", "Bank transfer"];

type Loc = {
  region: string | null;
  province: string | null;
  city: string | null;
  barangay: string | null;
};
const emptyLoc: Loc = { region: null, province: null, city: null, barangay: null };

export function TowingServicesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Provider filters
  const [activeService, setActiveService] = useState<string | null>(null);
  const [region, setRegion] = useState<string | null>(null);
  const [province, setProvince] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [open247, setOpen247] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [payment, setPayment] = useState<string>("any");
  const [items, setItems] = useState<ListingCardData[]>([]);
  const [loading, setLoading] = useState(true);

  // Emergency request form
  const [pickup, setPickup] = useState<Loc>(emptyLoc);
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoff, setDropoff] = useState<Loc>(emptyLoc);
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [vehicleType, setVehicleType] = useState<string>("Car");
  const [vehicleSummary, setVehicleSummary] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [preferredPayment, setPreferredPayment] = useState<string>("GCash");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      let q = supabase
        .from("listings")
        .select(
          "id,title,price_php,region,city,seller_type,boost_until,status,category_slug,view_count,attributes,user_id,listing_media(url,type),profiles:user_id(verification_status)",
        )
        .in("status", ["active", "pending_sale"])
        .eq("category_slug", "towing")
        .order("boost_until", { ascending: false, nullsFirst: false })
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(60);
      if (region) q = q.eq("region", region);
      if (province) q = q.eq("province", province);
      if (city) q = q.eq("city", city);
      if (open247) q = q.eq("attributes->>available_24_7", "true");
      const { data } = await q;
      let rows = (data ?? []) as any[];

      // Client-side filters for JSON attrs not easily expressible
      if (activeService) {
        const needle = activeService.toLowerCase();
        rows = rows.filter((r) => {
          const a = r.attributes ?? {};
          const blob = [
            a.service_type,
            a.vehicle_capacity,
            ...(Array.isArray(a.services) ? a.services : []),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          // Map chip → keywords
          if (needle.includes("car")) return blob.includes("sedan") || blob.includes("car") || blob.includes("suv");
          if (needle.includes("motorcycle")) return blob.includes("motorcycle");
          if (needle.includes("flatbed")) return blob.includes("flatbed");
          if (needle.includes("long")) return blob.includes("long") || blob.includes("trailer") || blob.includes("lowboy");
          if (needle.includes("heavy")) return blob.includes("heavy") || blob.includes("wrecker") || blob.includes("lowboy");
          if (needle.includes("recovery") || needle.includes("winch"))
            return blob.includes("roadside") || blob.includes("winch") || blob.includes("recovery");
          return true;
        });
      }
      if (payment !== "any") {
        rows = rows.filter((r) => {
          const pays = r.attributes?.payments;
          if (!Array.isArray(pays)) return false;
          return pays.map((p: string) => p.toLowerCase()).includes(payment.toLowerCase());
        });
      }
      if (verifiedOnly) {
        rows = rows.filter((r) => r.profiles?.verification_status === "verified");
      }

      const mapped: ListingCardData[] = rows.map((r) => {
        const photos = (r.listing_media ?? []).filter((m: any) => m.type === "photo");
        const videos = (r.listing_media ?? []).filter((m: any) => m.type === "video");
        return {
          id: r.id,
          title: r.title,
          price_php: Number(r.price_php),
          region: r.region,
          city: r.city,
          seller_type: r.seller_type,
          boost_until: r.boost_until,
          category_slug: r.category_slug,
          view_count: r.view_count ?? 0,
          cover_url: photos[0]?.url ?? null,
          photo_count: photos.length,
          has_video: videos.length > 0,
          seller_verified: r.profiles?.verification_status === "verified",
          seller_dealer_plan: null,
          seller_dealer_period_end: null,
          seller_dealer_cancel_at_period_end: false,
          status: r.status,
          attributes: r.attributes,
        } as ListingCardData;
      });
      setItems(mapped);
      setLoading(false);
    };
    run();
  }, [activeService, region, province, city, open247, verifiedOnly, payment]);

  const handleEmergencySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (!vehicleSummary.trim() && !vehicleType) {
      toast.error("Tell us what vehicle needs towing");
      return;
    }
    if (!pickup.region || !dropoff.region) {
      toast.error("Pickup and dropoff regions are required");
      return;
    }
    setSubmitting(true);
    try {
      const summary = vehicleSummary.trim()
        ? `${vehicleType} — ${vehicleSummary.trim()}`
        : vehicleType;
      const noteBlob = [
        contactPhone ? `Contact: ${contactPhone}` : null,
        preferredPayment ? `Preferred payment: ${preferredPayment}` : null,
        notes.trim() || null,
      ]
        .filter(Boolean)
        .join("\n");

      const { error } = await supabase.from("tow_requests").insert({
        requester_id: user.id,
        provider_id: null,
        listing_id: null,
        pickup_region: pickup.region,
        pickup_province: pickup.province,
        pickup_city: pickup.city,
        pickup_address: pickupAddress || null,
        dropoff_region: dropoff.region,
        dropoff_province: dropoff.province,
        dropoff_city: dropoff.city,
        dropoff_address: dropoffAddress || null,
        vehicle_summary: summary,
        needed_at: null,
        notes: noteBlob || null,
      });
      if (error) throw error;
      toast.success("Emergency tow request posted — nearby providers will respond.");
      setPickupAddress("");
      setDropoffAddress("");
      setVehicleSummary("");
      setContactPhone("");
      setNotes("");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  const promoted = useMemo(() => {
    const now = Date.now();
    return items.filter((l) => l.boost_until && new Date(l.boost_until).getTime() > now);
  }, [items]);
  const organic = useMemo(() => {
    const now = Date.now();
    return items.filter((l) => !l.boost_until || new Date(l.boost_until).getTime() <= now);
  }, [items]);

  return (
    <>
      {/* Hero */}
      <div className="border-b border-border bg-gradient-to-br from-secondary/60 via-secondary/30 to-background">
        <div className="container mx-auto px-4 py-10">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground">Home</Link>
            <span>/</span>
            <span>Services</span>
            <span>/</span>
            <span className="text-foreground">Towing & Transport</span>
          </div>
          <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Truck className="h-6 w-6" />
              </div>
              <div>
                <h1 className="font-display text-3xl font-bold md:text-4xl">
                  Towing & Transport Services
                </h1>
                <p className="max-w-2xl text-muted-foreground">
                  Find verified towing and vehicle-transport providers across the Philippines,
                  or post an emergency tow request and get matched in minutes.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="lg">
                <a href="#emergency-tow">
                  <Siren className="mr-2 h-4 w-4" /> Request emergency tow
                </a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/sell" search={{ payment: undefined, listingId: undefined }}>
                  <Plus className="mr-2 h-4 w-4" /> List your towing company
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pt-8">
        <FeaturedTowProviders region={region} />
      </div>

      {/* Filters */}
      <div className="container mx-auto px-4 pt-8">
        <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Service:
            </span>
            <button
              type="button"
              onClick={() => setActiveService(null)}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                activeService === null
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:border-primary/40"
              }`}
            >
              All
            </button>
            {SERVICE_CHIPS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setActiveService(s)}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  activeService === s
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:border-primary/40"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto_auto_auto]">
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <MapPin className="mr-1 inline h-3 w-3" /> Province coverage
              </Label>
              <LocationPicker
                asFilter
                showBarangay={false}
                value={{ region, province, city }}
                onChange={(v) => {
                  setRegion(v.region ?? null);
                  setProvince(v.province ?? null);
                  setCity(v.city ?? null);
                }}
              />
            </div>
            <div className="min-w-[160px]">
              <Label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Wallet className="mr-1 inline h-3 w-3" /> Accepts payment
              </Label>
              <Select value={payment} onValueChange={setPayment}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="GCash">GCash</SelectItem>
                  <SelectItem value="Maya">Maya</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col justify-end gap-2">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={open247} onCheckedChange={setOpen247} />
                <Clock className="h-4 w-4 text-muted-foreground" /> 24/7 available
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={verifiedOnly} onCheckedChange={setVerifiedOnly} />
                <ShieldCheck className="h-4 w-4 text-muted-foreground" /> Verified only
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Provider grid */}
      <div className="container mx-auto px-4 py-8">
        {promoted.length > 0 && (
          <section className="mb-6">
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <Badge variant="secondary">Promoted</Badge>
              <span className="ml-auto text-[10px] normal-case tracking-normal">Sponsored</span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {promoted.slice(0, 3).map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          </section>
        )}
        <div className="mb-4 text-sm text-muted-foreground">
          {loading
            ? "Loading providers…"
            : `${organic.length} provider${organic.length === 1 ? "" : "s"}`}
        </div>
        {!loading && organic.length === 0 && promoted.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
            No towing providers match your filters yet. Try widening your area or clearing
            filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {organic.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        )}
      </div>

      {/* Emergency tow form */}
      <div id="emergency-tow" className="border-t border-border bg-secondary/30">
        <div className="container mx-auto px-4 py-12">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive text-destructive-foreground">
              <Siren className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold">Emergency tow request</h2>
              <p className="text-sm text-muted-foreground">
                Post your request to all verified providers in your area.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleEmergencySubmit}
            className="grid gap-6 rounded-xl border border-border bg-card p-6 lg:grid-cols-2"
          >
            <section className="space-y-4">
              <h3 className="font-display text-base font-semibold">Vehicle</h3>
              <div>
                <Label>Vehicle type</Label>
                <Select value={vehicleType} onValueChange={setVehicleType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VEHICLE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="vs">Details (optional)</Label>
                <Input
                  id="vs"
                  value={vehicleSummary}
                  onChange={(e) => setVehicleSummary(e.target.value)}
                  placeholder="e.g. 2018 Honda Civic, non-running"
                />
              </div>
              <div>
                <Label htmlFor="cp">Contact number</Label>
                <Input
                  id="cp"
                  type="tel"
                  required
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="09xx xxx xxxx"
                />
              </div>
              <div>
                <Label>Preferred payment</Label>
                <Select value={preferredPayment} onValueChange={setPreferredPayment}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="font-display text-base font-semibold">Pickup</h3>
              <LocationPicker
                value={pickup}
                onChange={(v) =>
                  setPickup({
                    region: v.region ?? null,
                    province: v.province ?? null,
                    city: v.city ?? null,
                    barangay: v.barangay ?? null,
                  })
                }
              />
              <div>
                <Label>Street / landmark</Label>
                <Input
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  placeholder="optional"
                />
              </div>

              <h3 className="font-display text-base font-semibold">Dropoff</h3>
              <LocationPicker
                value={dropoff}
                onChange={(v) =>
                  setDropoff({
                    region: v.region ?? null,
                    province: v.province ?? null,
                    city: v.city ?? null,
                    barangay: v.barangay ?? null,
                  })
                }
              />
              <div>
                <Label>Street / landmark</Label>
                <Input
                  value={dropoffAddress}
                  onChange={(e) => setDropoffAddress(e.target.value)}
                  placeholder="optional"
                />
              </div>
            </section>

            <section className="space-y-3 lg:col-span-2">
              <Label htmlFor="nt">Notes for the driver</Label>
              <Textarea
                id="nt"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Low-clearance vehicle, no keys, gate access, etc."
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  Open requests are shared with verified PH tow providers. You'll see bids on
                  your dashboard.
                </p>
                <Button type="submit" size="lg" disabled={submitting}>
                  <PhoneCall className="mr-2 h-4 w-4" />
                  {submitting ? "Submitting…" : "Post emergency tow request"}
                </Button>
              </div>
            </section>
          </form>
        </div>
      </div>

      {/* List your company CTA */}
      <div className="border-t border-border">
        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 md:flex-row">
            <div>
              <h2 className="font-display text-xl font-bold md:text-2xl">
                Run a towing or transport company?
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Reach drivers across the Philippines. Set your service types, coverage,
                payments, and 24/7 availability.
              </p>
            </div>
            <Button asChild size="lg">
              <Link to="/sell" search={{ payment: undefined, listingId: undefined }}>
                <Plus className="mr-2 h-4 w-4" /> List your towing company
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
