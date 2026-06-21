import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { confirm } from "@/components/ui/confirm-dialog";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Upload,
  X,
  Trash2,
  Camera,
  Video as VideoIcon,
  AlertCircle,
  RotateCw,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { FormFeedbackLink } from "@/components/form-feedback";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LocationPicker } from "@/components/location-picker";
import { LocationPicker as MapLocationPicker } from "@/components/businesses/location-picker";
import { VehiclePicker } from "@/components/vehicle-picker";
import { TagPicker } from "@/components/tag-picker";
import { CATEGORY_DEFAULT_GROUPS, SERVICE_CATEGORIES } from "@/data/service-tags";
import { uploadWithRetry } from "@/lib/storage-upload";
import { getUserPlanLimits, FREE_PLAN_LIMITS, type PlanLimits } from "@/lib/plan-limits";
import {
  CategoryAttributesEditor,
  CATEGORY_ATTR_KEYS,
} from "@/components/listings/category-attributes-editor";
import { isAttrCategory, isValidDrivetrain } from "@/lib/category-attributes";
import { NeededPartsEditor } from "@/components/listings/needed-parts-editor";
import { PhoneInput } from "@/components/phone-input";
import { parseE164, buildE164 } from "@/data/country-codes";
import {
  VehicleQualityFields,
  vehicleQualityToAttributes,
  hydrateVehicleQuality,
  validateVehicleQuality,
  VEHICLE_QUALITY_KEYS,
  type VehicleQuality,
  type VehicleQualityIssue,
} from "@/components/vehicle-quality-fields";
import { VinScanDialog } from "@/components/vin-scan-dialog";

const CATEGORIES = [
  { slug: "car", name: "Car" },
  { slug: "motorcycle", name: "Motorcycle" },
  { slug: "boat", name: "Boat" },
  { slug: "airplane", name: "Airplane" },
  { slug: "equipment", name: "Heavy Equipment" },
  { slug: "towing", name: "Towing & Transport Services" },
  { slug: "carwash", name: "Car Wash" },
  { slug: "parts", name: "Parts & Accessories (Shop)" },
  { slug: "used_part", name: "Used Part (peer-to-peer)" },
  { slug: "drone", name: "Drones & Aerial" },
  { slug: "repair", name: "Repair Shop" },
  { slug: "bodyshop", name: "Body Shop" },
  { slug: "salvage", name: "Auto Salvage" },
  { slug: "other", name: "Other" },
];

const TOW_SERVICE_TYPES = [
  "Tow car",
  "Tow motorcycle",
  "Flatbed",
  "Wheel-lift / Hook",
  "Heavy wrecker",
  "Self-loader",
  "Box truck",
  "Lowboy / Trailer",
  "Long-distance transport",
  "Heavy equipment hauling",
  "Recovery/winch-out",
  "Roadside assist",
];
const TOW_CAPACITIES = [
  "Motorcycle",
  "Sedan / Hatchback",
  "SUV / Pickup",
  "Van",
  "Heavy equipment",
  "Boat / Trailer",
];
const CARWASH_SERVICES = [
  "Basic wash",
  "Detailing",
  "Interior cleaning",
  "Engine wash",
  "Ceramic coating",
  "Motorcycle wash",
];
const PARTS_TYPES = [
  "Engine",
  "Body",
  "Suspension",
  "Electrical",
  "Tires & Wheels",
  "Accessories",
  "Other",
];
const DRONE_BUSINESS_TYPES = ["Sales", "Aerial photography service", "Repair", "Training"];
const DRONE_SERVICES = ["Photo", "Video", "Mapping", "Inspection", "Agriculture"];

export const Route = createFileRoute("/listing/$id/edit")({
  component: EditListingPage,
});

type UploadState = {
  status: "idle" | "uploading" | "done" | "error";
  percent: number;
  error?: string;
};

function EditListingPage() {
  const { id } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [listing, setListing] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [media, setMedia] = useState<any[]>([]);
  const [planLimits, setPlanLimits] = useState<PlanLimits>(FREE_PLAN_LIMITS);

  // Basics
  const [category, setCategory] = useState("car");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [monthly, setMonthly] = useState("");
  const [downPayment, setDownPayment] = useState("");
  const [negotiable, setNegotiable] = useState(false);
  const [priceHidden, setPriceHidden] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState<
    "registered" | "unregistered" | "for_transfer" | "unknown"
  >("unknown");
  const [region, setRegion] = useState<string | null>(null);
  const [province, setProvince] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [barangay, setBarangay] = useState<string | null>(null);
  const [condition, setCondition] = useState("Used");
  const [phoneIso, setPhoneIso] = useState("PH");
  const [phoneNational, setPhoneNational] = useState("");
  const [allowMessages, setAllowMessages] = useState(true);

  // Vehicle attributes
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [mileage, setMileage] = useState("");
  const [transmission, setTransmission] = useState("");
  const [fuel, setFuel] = useState("");
  const [engine, setEngine] = useState("");
  const [vehicleQuality, setVehicleQuality] = useState<VehicleQuality>({});
  const [vehicleQualityIssues, setVehicleQualityIssues] = useState<VehicleQualityIssue[]>([]);
  const [categoryAttrs, setCategoryAttrs] = useState<Record<string, any>>({});
  const [neededParts, setNeededParts] = useState<
    { key: string; label: string; category: string; qty?: number }[]
  >([]);
  const [tireSizeConfirmed, setTireSizeConfirmed] = useState("");

  // Towing
  const [towServiceType, setTowServiceType] = useState("");
  const [towCapacity, setTowCapacity] = useState("");
  const [towCoverage, setTowCoverage] = useState("");
  const [towBaseRate, setTowBaseRate] = useState("");
  const [towPerKm, setTowPerKm] = useState("");
  const [tow247, setTow247] = useState(false);

  // Car Wash
  const [washServices, setWashServices] = useState<string[]>([]);
  const [washTier, setWashTier] = useState("");
  const [washStartingPrice, setWashStartingPrice] = useState("");
  const [washWalkIn, setWashWalkIn] = useState(true);
  const [wash247, setWash247] = useState(false);
  const [washHours, setWashHours] = useState("");

  // Parts
  const [partType, setPartType] = useState("");
  const [partBrand, setPartBrand] = useState("");
  const [partFits, setPartFits] = useState("");
  const [partOemAfter, setPartOemAfter] = useState("");
  const [partStock, setPartStock] = useState("");

  // Drone
  const [droneBizType, setDroneBizType] = useState("");
  const [droneBrands, setDroneBrands] = useState("");
  const [droneServices, setDroneServices] = useState<string[]>([]);
  const [droneLicensed, setDroneLicensed] = useState(false);
  const [droneCoverage, setDroneCoverage] = useState("");

  // Generic service (repair/bodyshop/salvage and reused by carwash/parts)
  const [serviceTags, setServiceTags] = useState<string[]>([]);
  const [serviceHours, setServiceHours] = useState("");
  const [serviceWalkIn, setServiceWalkIn] = useState(true);
  const [serviceBrands, setServiceBrands] = useState("");
  const [serviceWarranty, setServiceWarranty] = useState("");

  // Video upload state
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUpload, setVideoUpload] = useState<UploadState>({ status: "idle", percent: 0 });

  useEffect(() => {
    if (user?.id) getUserPlanLimits(user.id).then(setPlanLimits);
  }, [user?.id]);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data: l } = await supabase.from("listings").select("*").eq("id", id).maybeSingle();
    if (!l) {
      setLoading(false);
      return;
    }
    if (l.user_id !== user.id) {
      toast.error("You don't own this listing");
      navigate({ to: "/dashboard" });
      return;
    }
    setListing(l);
    setCategory(l.category_slug ?? "car");
    setTitle(l.title ?? "");
    setDescription(l.description ?? "");
    setPrice(String(l.price_php ?? ""));
    setMonthly((l as any).monthly_php != null ? String((l as any).monthly_php) : "");
    setDownPayment((l as any).down_payment_php != null ? String((l as any).down_payment_php) : "");
    setNegotiable(!!(l as any).negotiable);
    setPriceHidden(!!(l as any).price_hidden);
    setRegistrationStatus(((l as any).registration_status as any) ?? "unknown");
    setRegion(l.region ?? null);
    setProvince(l.province ?? null);
    setCity(l.city ?? null);
    setBarangay(l.barangay ?? null);
    setCondition(l.condition ?? "Used");
    {
      const p = parseE164(l.contact_phone ?? null);
      setPhoneIso(p.iso);
      setPhoneNational(p.national);
    }
    setAllowMessages(l.allow_messages);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a: Record<string, any> = (l.attributes as any) ?? {};
    setYear(a.year ? String(a.year) : "");
    setMake(a.make ?? "");
    setModel(a.model ?? "");
    setMileage(a.mileage_km ? String(a.mileage_km) : "");
    setTransmission(a.transmission ?? "");
    setFuel(a.fuel ?? "");
    setEngine(a.engine ?? "");
    setVehicleQuality(hydrateVehicleQuality(a));
    setNeededParts(Array.isArray(a.needed_parts) ? a.needed_parts : []);
    setTireSizeConfirmed(a.tire_size_confirmed ?? "");
    if (isAttrCategory(l.category_slug)) {
      const next: Record<string, any> = {};
      for (const k of CATEGORY_ATTR_KEYS[l.category_slug] ?? []) {
        if (a[k] !== undefined && a[k] !== null) next[k] = a[k];
      }
      setCategoryAttrs(next);
    }

    setTowServiceType(a.service_type ?? "");
    setTowCapacity(a.vehicle_capacity ?? "");
    setTowCoverage(Array.isArray(a.coverage_regions) ? a.coverage_regions.join(", ") : "");
    setTowBaseRate(a.base_rate_php != null ? String(a.base_rate_php) : "");
    setTowPerKm(a.per_km_rate_php != null ? String(a.per_km_rate_php) : "");
    setTow247(!!a.available_24_7);

    if (l.category_slug === "carwash") {
      setWashServices(Array.isArray(a.services) ? a.services : []);
      setWashTier(a.pricing_tier ?? "");
      setWashStartingPrice(a.starting_price_php != null ? String(a.starting_price_php) : "");
      setWashWalkIn(a.accepts_walk_ins !== false);
      setWash247(!!a.available_24_7);
      setWashHours(a.operating_hours ?? "");
    }

    setPartType(a.part_type ?? "");
    setPartBrand(a.brand ?? "");
    setPartFits(a.fits ?? "");
    setPartOemAfter(a.oem_or_aftermarket ?? "");
    setPartStock(a.stock_quantity != null ? String(a.stock_quantity) : "");

    if (l.category_slug === "drone") {
      setDroneBizType(a.business_type ?? "");
      setDroneBrands(a.brands_carried ?? "");
      setDroneServices(Array.isArray(a.services) ? a.services : []);
      setDroneLicensed(!!a.licensed_operator);
      setDroneCoverage(Array.isArray(a.coverage_regions) ? a.coverage_regions.join(", ") : "");
    }

    setServiceTags(Array.isArray(a.tags) ? a.tags : []);
    setServiceHours(a.operating_hours ?? "");
    setServiceWalkIn(a.accepts_walk_ins !== false);
    setServiceBrands(a.brands_serviced ?? "");
    setServiceWarranty(a.warranty ?? "");

    const { data: m } = await supabase
      .from("listing_media")
      .select("id,url,type,storage_path,sort_order")
      .eq("listing_id", id)
      .order("sort_order");
    setMedia(m ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (user) load();
    // reason: `load` is recreated each render; depend only on user/id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id]);

  const photos = media.filter((m) => m.type === "photo");
  const videos = media.filter((m) => m.type === "video");
  // Hard per-plan caps (mirror sell.tsx): Free 1/0, Standard 5/1, Upgraded 20/3.
  const planTier = (listing?.plan ?? "free") as "free" | "standard" | "upgraded";
  const maxPhotos = planTier === "upgraded" ? 20 : planTier === "standard" ? 5 : 1;
  const maxVideos = planTier === "upgraded" ? 3 : planTier === "standard" ? 1 : 0;
  // Surfaced for messaging only — actual enforcement uses maxPhotos above.
  void planLimits;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !listing) return;
    if (category === "car" || category === "motorcycle") {
      const vqCheck = validateVehicleQuality(vehicleQuality);
      if (!vqCheck.ok) {
        setVehicleQualityIssues(vqCheck.issues);
        toast.error(vqCheck.issues[0]?.message ?? "Please review the vehicle details.");
        return;
      }
      setVehicleQualityIssues([]);
    }
    if (category === "car" && !isValidDrivetrain(categoryAttrs.drivetrain)) {
      toast.error("Please select a valid drivetrain (FWD, RWD, AWD, 4x4, or 4x2).");
      return;
    }
    setSaving(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseAttrs: Record<string, any> = (listing.attributes as any) ?? {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const attributes: Record<string, any> = { ...baseAttrs };

    // Strip vehicle keys we'll rewrite (so blank values clear them).
    const vehicleKeys = [
      "year",
      "make",
      "model",
      "make_model",
      "mileage_km",
      "transmission",
      "fuel",
      "engine",
    ];
    for (const k of vehicleKeys) delete attributes[k];
    for (const k of VEHICLE_QUALITY_KEYS) delete attributes[k];
    if (year) attributes.year = year;
    if (make) attributes.make = make;
    if (model) attributes.model = model;
    if (make || model) attributes.make_model = [make, model].filter(Boolean).join(" ");
    if (mileage) attributes.mileage_km = mileage;
    if (transmission) attributes.transmission = transmission;
    if (fuel) attributes.fuel = fuel;
    if (engine) attributes.engine = engine;
    if (category === "car" || category === "motorcycle") {
      Object.assign(attributes, vehicleQualityToAttributes(vehicleQuality));
      attributes.needed_parts = neededParts.length ? neededParts : undefined;
      attributes.tire_size_confirmed = tireSizeConfirmed.trim() || undefined;
    }
    if (isAttrCategory(category)) {
      for (const k of CATEGORY_ATTR_KEYS[category] ?? []) delete attributes[k];
      for (const k of CATEGORY_ATTR_KEYS[category] ?? []) {
        const v = categoryAttrs[k];
        if (v === undefined || v === null || v === "") continue;
        attributes[k] = v;
      }
    }

    if (category === "towing") {
      attributes.service_type = towServiceType || undefined;
      attributes.vehicle_capacity = towCapacity || undefined;
      attributes.coverage_regions = towCoverage
        ? towCoverage
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;
      attributes.base_rate_php = towBaseRate ? Number(towBaseRate) : undefined;
      attributes.per_km_rate_php = towPerKm ? Number(towPerKm) : undefined;
      attributes.available_24_7 = tow247;
    }
    if (category === "carwash") {
      attributes.services = washServices.length ? washServices : undefined;
      attributes.pricing_tier = washTier || undefined;
      attributes.starting_price_php = washStartingPrice ? Number(washStartingPrice) : undefined;
      attributes.accepts_walk_ins = washWalkIn;
      attributes.available_24_7 = wash247;
      attributes.operating_hours = washHours || undefined;
    }
    if (category === "parts") {
      attributes.part_type = partType || undefined;
      attributes.brand = partBrand || undefined;
      attributes.fits = partFits || undefined;
      attributes.oem_or_aftermarket = partOemAfter || undefined;
      attributes.stock_quantity = partStock ? Number(partStock) : undefined;
    }
    if (category === "drone") {
      attributes.business_type = droneBizType || undefined;
      attributes.brands_carried = droneBrands || undefined;
      attributes.services = droneServices.length ? droneServices : undefined;
      attributes.licensed_operator = droneLicensed;
      attributes.coverage_regions = droneCoverage
        ? droneCoverage
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;
    }
    attributes.tags = serviceTags.length ? serviceTags : undefined;
    if (
      SERVICE_CATEGORIES.has(category) ||
      category === "repair" ||
      category === "bodyshop" ||
      category === "salvage"
    ) {
      attributes.operating_hours = serviceHours || attributes.operating_hours || undefined;
      attributes.accepts_walk_ins = serviceWalkIn;
      attributes.brands_serviced = serviceBrands || undefined;
      attributes.warranty = serviceWarranty || undefined;
    }
    // Drop undefined keys so we don't store noise.
    for (const k of Object.keys(attributes)) {
      if (attributes[k] === undefined) delete attributes[k];
    }

    const { error } = await supabase
      .from("listings")
      .update({
        category_slug: category,
        title,
        description,
        price_php: Number(price) || 0,
        monthly_php: monthly ? Number(monthly) : null,
        down_payment_php: downPayment ? Number(downPayment) : null,
        negotiable,
        price_hidden: priceHidden,
        registration_status: registrationStatus,
        region,
        province,
        city,
        barangay,
        condition,
        contact_phone: buildE164(phoneIso, phoneNational) ?? null,
        allow_messages: allowMessages,
        attributes,
      })
      .eq("id", id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Listing updated");
    navigate({ to: "/listing/$id", params: { id } });
  };

  const addPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !listing) return;
    const currentCount = photos.length;
    const files = Array.from(e.target.files ?? []).slice(0, maxPhotos - currentCount);
    if (files.length === 0) {
      toast.error(
        planTier === "upgraded"
          ? `Up to ${maxPhotos} photos.`
          : planTier === "standard"
            ? `Standard listings allow up to ${maxPhotos} photos. Upgrade for more.`
            : `Free listings allow only ${maxPhotos} photo. Upgrade for more.`,
      );
      e.target.value = "";
      return;
    }
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const path = `${user.id}/${id}/${Date.now()}-${i}-${file.name}`;
        const { publicUrl } = await uploadWithRetry({
          bucket: "listing-photos",
          path,
          file,
          contentType: file.type || "image/jpeg",
        });
        const { error: insErr } = await supabase.from("listing_media").insert({
          listing_id: id,
          type: "photo",
          url: publicUrl,
          storage_path: path,
          sort_order: currentCount + i,
        });
        if (insErr) {
          toast.error(insErr.message);
          await supabase.storage.from("listing-photos").remove([path]);
          continue;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        toast.error(err?.message ?? "Upload failed");
      }
    }
    toast.success("Photos added");
    e.target.value = "";
    load();
  };

  const handleVideoPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!file) return;
    if (videos.length >= maxVideos) {
      toast.error(
        maxVideos === 0
          ? "Videos are not included in this plan."
          : `Up to ${maxVideos} video${maxVideos === 1 ? "" : "s"} on this plan. Remove one first.`,
      );
      return;
    }
    setVideoFile(file);
    setVideoUpload({ status: "idle", percent: 0 });
  };

  const uploadVideoNow = async () => {
    if (!user || !videoFile) return;
    setVideoUpload({ status: "uploading", percent: 0 });
    try {
      const path = `${user.id}/${id}/${Date.now()}-${videoFile.name}`;
      const { publicUrl } = await uploadWithRetry({
        bucket: "listing-videos",
        path,
        file: videoFile,
        contentType: videoFile.type || "video/mp4",
        onProgress: (p) => setVideoUpload((s) => ({ ...s, percent: p.percent })),
      });
      const { error: insErr } = await supabase.from("listing_media").insert({
        listing_id: id,
        type: "video",
        url: publicUrl,
        storage_path: path,
        sort_order: videos.length,
      });
      if (insErr) {
        await supabase.storage.from("listing-videos").remove([path]);
        throw insErr;
      }
      setVideoUpload({ status: "done", percent: 100 });
      setVideoFile(null);
      toast.success("Video uploaded");
      load();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setVideoUpload({
        status: "error",
        percent: 0,
        error: err?.message ?? "Upload failed",
      });
      toast.error(err?.message ?? "Video upload failed");
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const removeMedia = async (m: any) => {
    if (!(await confirm({ title: "Remove this media?", destructive: true }))) return;
    if (m.storage_path) {
      const bucket = m.type === "video" ? "listing-videos" : "listing-photos";
      await supabase.storage.from(bucket).remove([m.storage_path]);
    }
    await supabase.from("listing_media").delete().eq("id", m.id);
    load();
  };

  if (loading || authLoading)
    return (
      <SiteLayout>
        <div className="p-12 text-center">Loading…</div>
      </SiteLayout>
    );
  if (!listing)
    return (
      <SiteLayout>
        <div className="p-12 text-center">Listing not found.</div>
      </SiteLayout>
    );

  const isService =
    SERVICE_CATEGORIES.has(category) ||
    category === "repair" ||
    category === "bodyshop" ||
    category === "salvage";

  return (
    <SiteLayout>
      <div className="container mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-display text-3xl font-bold">Edit listing</h1>
        <p className="text-muted-foreground">Update details for "{listing.title}".</p>

        <form onSubmit={save} className="mt-8 space-y-6">
          <section className="space-y-4 rounded-xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-semibold">Category & basics</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.slug} value={c.slug}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Condition</Label>
                <Select value={condition} onValueChange={setCondition}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Brand new">Brand new</SelectItem>
                    <SelectItem value="Used">Used</SelectItem>
                    <SelectItem value="For parts">For parts</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className="sm:col-span-2 space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                <div>
                  <Label className="text-sm font-semibold">Pricing — fill any that apply</Label>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Real numbers only. Placeholder prices (₱1, ₱2…) are rejected.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <Label className="text-xs">Asking price (₱)</Label>
                    <Input
                      type="number"
                      min="0"
                      className="mt-1"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="e.g. 450000"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Monthly (₱/mo)</Label>
                    <Input
                      type="number"
                      min="0"
                      className="mt-1"
                      value={monthly}
                      onChange={(e) => setMonthly(e.target.value)}
                      placeholder="e.g. 12000"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Down payment (₱)</Label>
                    <Input
                      type="number"
                      min="0"
                      className="mt-1"
                      value={downPayment}
                      onChange={(e) => setDownPayment(e.target.value)}
                      placeholder="e.g. 80000"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <label className="inline-flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 accent-primary"
                      checked={negotiable}
                      onChange={(e) => setNegotiable(e.target.checked)}
                    />
                    Negotiable
                  </label>
                  <label className="inline-flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 accent-primary"
                      checked={priceHidden}
                      onChange={(e) => setPriceHidden(e.target.checked)}
                    />
                    Hide price — buyers must message me
                  </label>
                </div>
                {(category === "car" || category === "motorcycle" || category === "truck") && (
                  <div>
                    <Label className="text-xs">Registration</Label>
                    <Select
                      value={registrationStatus}
                      onValueChange={(v) => setRegistrationStatus(v as typeof registrationStatus)}
                    >
                      <SelectTrigger className="mt-1 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="registered">Registered (OR/CR current)</SelectItem>
                        <SelectItem value="unregistered">Unregistered / expired</SelectItem>
                        <SelectItem value="for_transfer">For transfer of ownership</SelectItem>
                        <SelectItem value="unknown">Not specified</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div>
                <Label>Contact phone</Label>
                <PhoneInput
                  iso={phoneIso}
                  national={phoneNational}
                  onChange={({ iso, national }) => {
                    setPhoneIso(iso);
                    setPhoneNational(national);
                  }}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Description</Label>
                <Textarea
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
          </section>

          {isService && (
            <section className="space-y-4 rounded-xl border border-border bg-card p-6">
              <div>
                <h2 className="font-display text-lg font-semibold">What do you offer?</h2>
                <p className="text-xs text-muted-foreground">
                  Pick everything that applies — buyers filter by these tags.
                </p>
              </div>
              <TagPicker
                value={serviceTags}
                onChange={setServiceTags}
                defaultGroups={CATEGORY_DEFAULT_GROUPS[category] ?? []}
              />
            </section>
          )}

          <section className="space-y-4 rounded-xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-semibold">Details</h2>
            {category === "repair" || category === "bodyshop" || category === "salvage" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label>Operating hours</Label>
                  <Input
                    value={serviceHours}
                    onChange={(e) => setServiceHours(e.target.value)}
                    placeholder="Mon–Sat, 8AM–6PM"
                  />
                </div>
                <div>
                  <Label>Brands serviced (optional)</Label>
                  <Input value={serviceBrands} onChange={(e) => setServiceBrands(e.target.value)} />
                </div>
                <div>
                  <Label>Warranty (optional)</Label>
                  <Input
                    value={serviceWarranty}
                    onChange={(e) => setServiceWarranty(e.target.value)}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={serviceWalkIn}
                    onChange={(e) => setServiceWalkIn(e.target.checked)}
                  />
                  Accepts walk-ins
                </label>
              </div>
            ) : category === "carwash" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label>Services offered</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {CARWASH_SERVICES.map((s) => {
                      const active = washServices.includes(s);
                      return (
                        <button
                          type="button"
                          key={s}
                          onClick={() =>
                            setWashServices((prev) =>
                              active ? prev.filter((x) => x !== s) : [...prev, s],
                            )
                          }
                          className={`rounded-full border px-3 py-1 text-xs ${active ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground"}`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <Label>Pricing tier</Label>
                  <Select value={washTier} onValueChange={setWashTier}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Budget">Budget</SelectItem>
                      <SelectItem value="Mid">Mid-range</SelectItem>
                      <SelectItem value="Premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Starting price (₱)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={washStartingPrice}
                    onChange={(e) => setWashStartingPrice(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Operating hours</Label>
                  <Input value={washHours} onChange={(e) => setWashHours(e.target.value)} />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={washWalkIn}
                    onChange={(e) => setWashWalkIn(e.target.checked)}
                  />
                  Accepts walk-ins
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={wash247}
                    onChange={(e) => setWash247(e.target.checked)}
                  />
                  Open 24/7
                </label>
              </div>
            ) : category === "parts" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Part type</Label>
                  <Select value={partType} onValueChange={setPartType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {PARTS_TYPES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Brand</Label>
                  <Input value={partBrand} onChange={(e) => setPartBrand(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Fits (make / model / year)</Label>
                  <Input value={partFits} onChange={(e) => setPartFits(e.target.value)} />
                </div>
                <div>
                  <Label>OEM or Aftermarket</Label>
                  <Select value={partOemAfter} onValueChange={setPartOemAfter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OEM">OEM</SelectItem>
                      <SelectItem value="Aftermarket">Aftermarket</SelectItem>
                      <SelectItem value="Surplus">Surplus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Stock quantity</Label>
                  <Input
                    type="number"
                    min="0"
                    value={partStock}
                    onChange={(e) => setPartStock(e.target.value)}
                  />
                </div>
              </div>
            ) : category === "drone" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Business type</Label>
                  <Select value={droneBizType} onValueChange={setDroneBizType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {DRONE_BUSINESS_TYPES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Brands carried</Label>
                  <Input value={droneBrands} onChange={(e) => setDroneBrands(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Services offered</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {DRONE_SERVICES.map((s) => {
                      const active = droneServices.includes(s);
                      return (
                        <button
                          type="button"
                          key={s}
                          onClick={() =>
                            setDroneServices((prev) =>
                              active ? prev.filter((x) => x !== s) : [...prev, s],
                            )
                          }
                          className={`rounded-full border px-3 py-1 text-xs ${active ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground"}`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <Label>Coverage regions (comma-separated)</Label>
                  <Input value={droneCoverage} onChange={(e) => setDroneCoverage(e.target.value)} />
                </div>
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={droneLicensed}
                    onChange={(e) => setDroneLicensed(e.target.checked)}
                  />
                  Licensed CAAP operator
                </label>
              </div>
            ) : category === "towing" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Service type</Label>
                  <Select value={towServiceType} onValueChange={setTowServiceType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {TOW_SERVICE_TYPES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Vehicle capacity</Label>
                  <Select value={towCapacity} onValueChange={setTowCapacity}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {TOW_CAPACITIES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label>Coverage regions (comma-separated)</Label>
                  <Input value={towCoverage} onChange={(e) => setTowCoverage(e.target.value)} />
                </div>
                <div>
                  <Label>Base rate (₱)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={towBaseRate}
                    onChange={(e) => setTowBaseRate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Per-km rate (₱)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={towPerKm}
                    onChange={(e) => setTowPerKm(e.target.value)}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={tow247}
                    onChange={(e) => setTow247(e.target.checked)}
                  />
                  Available 24/7
                </label>
              </div>
            ) : category === "car" || category === "motorcycle" ? (
              <div className="space-y-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label>VIN / chassis</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Optional"
                        value={vehicleQuality.vin_chassis ?? ""}
                        maxLength={17}
                        onChange={(e) =>
                          setVehicleQuality((prev) => ({
                            ...prev,
                            vin_chassis: e.target.value.toUpperCase().replace(/\s+/g, ""),
                          }))
                        }
                      />
                      <VinScanDialog
                        onResult={(r) => {
                          setVehicleQuality((prev) => ({ ...prev, vin_chassis: r.vin }));
                          if (r.year) setYear(r.year);
                          if (r.make) setMake(r.make);
                          if (r.model) setModel(r.model);
                          if (r.fuel) setFuel(r.fuel);
                          if (r.transmission) setTransmission(r.transmission);
                        }}
                      />
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      11–17 letters and numbers, no I/O/Q. Shown only when a buyer requests verification.
                    </p>
                    {vehicleQualityIssues.find((i) => i.field === "vin_chassis") && (
                      <p className="mt-0.5 text-[11px] text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {vehicleQualityIssues.find((i) => i.field === "vin_chassis")?.message}
                      </p>
                    )}
                  </div>
                </div>
                <VehiclePicker
                  category={category as "car" | "motorcycle"}
                  year={year}
                  make={make}
                  model={model}
                  engine={engine}
                  onChange={(v) => {
                    setYear(v.year);
                    setMake(v.make);
                    setModel(v.model);
                    setEngine(v.engine ?? "");
                  }}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Mileage (km)</Label>
                    <Input value={mileage} onChange={(e) => setMileage(e.target.value)} />
                  </div>
                  <div>
                    <Label>Transmission</Label>
                    <Select value={transmission} onValueChange={setTransmission}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
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
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Gasoline">Gasoline</SelectItem>
                        <SelectItem value="Diesel">Diesel</SelectItem>
                        <SelectItem value="Hybrid">Hybrid</SelectItem>
                        <SelectItem value="Electric">Electric</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <VehicleQualityFields
                  category={category as "car" | "motorcycle"}
                  value={vehicleQuality}
                  onChange={setVehicleQuality}
                  issues={vehicleQualityIssues}
                />
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
                <div>
                  <Label>Year</Label>
                  <Input value={year} onChange={(e) => setYear(e.target.value)} />
                </div>
              </div>
            )}
            {isAttrCategory(category) && (
              <div className="mt-4 rounded-md border border-border/60 bg-background/40 p-4">
                <h3 className="mb-3 font-display text-sm font-semibold">Buyer filters</h3>
                <p className="mb-3 text-xs text-muted-foreground">
                  These fields show up as filters on the {category} browse page. Fill them in so
                  your listing gets matched.
                </p>
                <CategoryAttributesEditor
                  category={category}
                  value={categoryAttrs}
                  onChange={setCategoryAttrs}
                />
              </div>
            )}
            {(category === "car" || category === "motorcycle") && (
              <div className="mt-4 rounded-md border border-border/60 bg-background/40 p-4">
                <h3 className="mb-1 font-display text-sm font-semibold">
                  Parts needed / known issues (optional)
                </h3>
                <p className="mb-3 text-xs text-muted-foreground">
                  Flag anything this car needs (brakes, tires, battery, etc.). Buyers will see
                  these on the listing and can request a parts quote from us.
                </p>
                <NeededPartsEditor
                  value={neededParts}
                  onChange={setNeededParts}
                  tireSize={tireSizeConfirmed}
                  onTireSizeChange={setTireSizeConfirmed}
                  make={make}
                  model={model}
                  year={year ? Number(year) : undefined}
                  engine={engine || undefined}
                />
              </div>
            )}
          </section>

          <section className="space-y-4 rounded-xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-semibold">Location & contact</h2>
            <LocationPicker
              value={{ region, province, city, barangay }}
              onChange={(v) => {
                setRegion(v.region ?? null);
                setProvince(v.province ?? null);
                setCity(v.city ?? null);
                setBarangay(v.barangay ?? null);
              }}
            />
            <div className="flex items-center gap-2">
              <input
                id="allow-msg"
                type="checkbox"
                checked={allowMessages}
                onChange={(e) => setAllowMessages(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="allow-msg" className="cursor-pointer">
                Allow buyer messages
              </Label>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-semibold">
              <Camera className="mr-1 inline h-4 w-4 -translate-y-0.5" />
              Photos ({photos.length}/{maxPhotos})
            </h2>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {photos.map((m) => (
                <div
                  key={m.id}
                  className="relative aspect-square overflow-hidden rounded-md bg-secondary"
                >
                  <img
                    src={m.url}
                    alt={`${listing.title} — photo`}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeMedia(m)}
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
                    aria-label="Remove photo"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {photos.length < maxPhotos && (
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-border text-muted-foreground hover:bg-secondary/50">
                  <Upload className="h-5 w-5" />
                  <span className="mt-1 text-xs">Add</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={addPhotos}
                  />
                </label>
              )}
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-semibold">
              <VideoIcon className="mr-1 inline h-4 w-4 -translate-y-0.5" />
              Videos ({videos.length}/{maxVideos})
            </h2>
            {maxVideos === 0 ? (
              <p className="text-sm text-muted-foreground">
                Videos are not included in the Free plan. Upgrade your listing to add a video.
              </p>
            ) : (
              <>
                {videos.length > 0 && (
                  <div className="space-y-2">
                    {videos.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between rounded-md border border-border p-2"
                      >
                        <video
                          src={m.url}
                          controls
                          className="h-16 w-28 rounded bg-black object-cover"
                          aria-label={`${listing.title} video`}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeMedia(m)}
                        >
                          <Trash2 className="mr-1 h-4 w-4" />
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {videos.length < maxVideos && (
                  <div>
                    <Input
                      type="file"
                      accept="video/*"
                      onChange={handleVideoPick}
                      disabled={videoUpload.status === "uploading"}
                    />
                    {videoFile && (
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex-1 truncate">{videoFile.name}</span>
                          {videoUpload.status !== "uploading" && videoUpload.status !== "done" && (
                            <button
                              type="button"
                              onClick={() => {
                                setVideoFile(null);
                                setVideoUpload({ status: "idle", percent: 0 });
                              }}
                              className="hover:underline"
                            >
                              Cancel
                            </button>
                          )}
                          {videoUpload.status === "done" && (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          )}
                        </div>
                        {videoUpload.status === "uploading" && (
                          <div className="flex items-center gap-2">
                            <Progress value={videoUpload.percent} className="h-1.5 flex-1" />
                            <span className="text-xs text-muted-foreground">
                              {videoUpload.percent}%
                            </span>
                          </div>
                        )}
                        {videoUpload.status === "error" && (
                          <div className="flex items-center gap-2 rounded border border-destructive/40 bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
                            <AlertCircle className="h-3.5 w-3.5" />
                            <span className="flex-1 truncate">
                              {videoUpload.error ?? "Upload failed"}
                            </span>
                            <button
                              type="button"
                              onClick={uploadVideoNow}
                              className="inline-flex items-center gap-1 rounded bg-background px-1.5 py-0.5 text-foreground hover:bg-secondary"
                            >
                              <RotateCw className="h-3 w-3" /> Retry
                            </button>
                          </div>
                        )}
                        {videoUpload.status === "idle" && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={uploadVideoNow}
                            disabled={!videoFile}
                          >
                            <Upload className="mr-1 h-4 w-4" />
                            Upload video
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </section>

          <div className="flex justify-between gap-2"><FormFeedbackLink formId="edit-listing" /></div>
          <div className="flex justify-end gap-2">
            <Button asChild type="button" variant="outline">
              <Link to="/dashboard">Cancel</Link>
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </div>
    </SiteLayout>
  );
}
