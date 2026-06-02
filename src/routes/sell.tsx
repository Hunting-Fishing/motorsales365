import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Upload,
  X,
  Camera,
  Video as VideoIcon,
  RotateCw,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatPHP } from "@/lib/format";
import { LocationPicker } from "@/components/location-picker";
import { VehiclePicker } from "@/components/vehicle-picker";
import { TagPicker } from "@/components/tag-picker";
import { CATEGORY_DEFAULT_GROUPS, SERVICE_CATEGORIES } from "@/data/service-tags";
import { uploadWithRetry } from "@/lib/storage-upload";
import { getUserPlanLimits, FREE_PLAN_LIMITS, type PlanLimits } from "@/lib/plan-limits";
import { useDynamicMeta } from "@/hooks/use-dynamic-meta";
import { useDynamicJsonLd } from "@/hooks/use-dynamic-jsonld";
import { PhoneInput } from "@/components/phone-input";
import { buildE164 } from "@/data/country-codes";
import { z } from "zod";

const ListingTextSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(120, "Title must be 120 characters or fewer"),
  description: z.string().trim().max(5000, "Description must be 5000 characters or fewer").optional().default(""),
  price_php: z.number().int("Price must be a whole number").min(0, "Price cannot be negative").max(1_000_000_000, "Price is too high"),
  contact_phone: z.string().trim().max(40).optional().nullable(),
});

const SELL_SEO: Record<string, { title: string; description: string }> = {
  car: {
    title: "Sell your car in the Philippines — 365 MotorSales",
    description:
      "Post your car for sale and reach Filipino buyers nationwide. Free listings, photos, and instant messaging on 365 MotorSales.",
  },
  motorcycle: {
    title: "Sell your motorcycle in the Philippines — 365 MotorSales",
    description:
      "List your motorcycle or scooter for sale across the Philippines. Free posting with photos and direct buyer messaging.",
  },
  boat: {
    title: "Sell your boat in the Philippines — 365 MotorSales",
    description:
      "Reach Filipino boat and watercraft buyers. Post your boat for sale with photos and contact details on 365 MotorSales.",
  },
  airplane: {
    title: "Sell aircraft in the Philippines — 365 MotorSales",
    description:
      "List airplanes and light aircraft for sale to qualified buyers in the Philippines.",
  },
  equipment: {
    title: "Sell heavy equipment — 365 MotorSales Philippines",
    description:
      "Post backhoes, excavators, loaders, and other heavy equipment for sale across the Philippines.",
  },
  towing: {
    title: "List your towing & trucking service — 365 MotorSales",
    description:
      "Offer flatbed, wrecker, and roadside towing services to drivers across the Philippines.",
  },
  carwash: {
    title: "List your car wash business — 365 MotorSales Philippines",
    description:
      "Promote your car wash, detailing, or ceramic coating services to local customers in the Philippines.",
  },
  parts: {
    title: "Sell auto parts & accessories — 365 MotorSales Philippines",
    description:
      "List OEM and aftermarket vehicle parts, tires, wheels, and accessories for Filipino buyers.",
  },
  drone: {
    title: "List drone services & sales — 365 MotorSales Philippines",
    description:
      "Sell drones or offer aerial photography, mapping, and inspection services in the Philippines.",
  },
  repair: {
    title: "List your auto repair shop — 365 MotorSales Philippines",
    description:
      "Promote your mechanical, electrical, or general auto repair shop to drivers across the Philippines.",
  },
  bodyshop: {
    title: "List your body shop — 365 MotorSales Philippines",
    description:
      "Reach customers needing collision repair, paint, and bodywork services in the Philippines.",
  },
  salvage: {
    title: "List your auto salvage yard — 365 MotorSales Philippines",
    description:
      "Connect with buyers looking for salvage parts and recycled auto components in the Philippines.",
  },
  other: {
    title: "Post a listing — 365 MotorSales Philippines",
    description:
      "Post any vehicle, part, or auto-related service for sale on 365 MotorSales Philippines.",
  },
};

export const Route = createFileRoute("/sell")({
  head: () => ({
    meta: [
      { title: "Sell your vehicle — 365 MotorSales Philippines" },
      {
        name: "description",
        content:
          "Post your car, motorcycle, truck, or parts for sale on 365 MotorSales. Free listings, fast reach across the Philippines.",
      },
      { property: "og:title", content: "Sell your vehicle — 365 MotorSales Philippines" },
      {
        property: "og:description",
        content:
          "Post your car, motorcycle, truck, or parts for sale on 365 MotorSales. Free listings, fast reach across the Philippines.",
      },
      { property: "og:url", content: "https://www.365motorsales.com/sell" },
    ],
    links: [{ rel: "canonical", href: "https://www.365motorsales.com/sell" }],
  }),
  component: SellPage,
});

const CATEGORIES = [
  { slug: "car", name: "Car" },
  { slug: "motorcycle", name: "Motorcycle" },
  { slug: "boat", name: "Boat" },
  { slug: "airplane", name: "Airplane" },
  { slug: "equipment", name: "Heavy Equipment" },
  { slug: "towing", name: "Towing & Trucking service" },
  { slug: "carwash", name: "Car Wash" },
  { slug: "parts", name: "Parts & Accessories" },
  { slug: "drone", name: "Drones & Aerial" },
  { slug: "repair", name: "Repair Shop" },
  { slug: "bodyshop", name: "Body Shop" },
  { slug: "salvage", name: "Auto Salvage" },
  { slug: "other", name: "Other" },
];

const TOW_SERVICE_TYPES = [
  "Flatbed",
  "Wheel-lift / Hook",
  "Heavy wrecker",
  "Self-loader",
  "Box truck",
  "Lowboy / Trailer",
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

function SellPage() {
  const { user, loading: authLoading, effectiveSellerType } = useAuth();
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
  const [phoneIso, setPhoneIso] = useState("PH");
  const [phoneNational, setPhoneNational] = useState("");
  const [sellerType, setSellerType] = useState<"private" | "business">(
    effectiveSellerType === "private" ? "private" : "business",
  );
  // Keep the form's seller-type radio in sync when staff flip the "View as"
  // simulator, so previewing the dealer flow actually shows the dealer fields.
  useEffect(() => {
    setSellerType(effectiveSellerType === "private" ? "private" : "business");
  }, [effectiveSellerType]);
  const [plan, setPlan] = useState<"free" | "standard" | "upgraded">("free");
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [mileage, setMileage] = useState("");
  const [transmission, setTransmission] = useState("");
  const [fuel, setFuel] = useState("");
  const [engine, setEngine] = useState("");

  // Towing service-specific fields
  const [towServiceType, setTowServiceType] = useState("");
  const [towCapacity, setTowCapacity] = useState("");
  const [towCoverage, setTowCoverage] = useState("");
  const [towBaseRate, setTowBaseRate] = useState("");
  const [towPerKm, setTowPerKm] = useState("");
  const [tow247, setTow247] = useState(false);

  // Car Wash fields
  const [washServices, setWashServices] = useState<string[]>([]);
  const [washTier, setWashTier] = useState("");
  const [washStartingPrice, setWashStartingPrice] = useState("");
  const [washWalkIn, setWashWalkIn] = useState(true);
  const [wash247, setWash247] = useState(false);
  const [washHours, setWashHours] = useState("");

  // Parts fields
  const [partType, setPartType] = useState("");
  const [partBrand, setPartBrand] = useState("");
  const [partFits, setPartFits] = useState("");
  const [partOemAfter, setPartOemAfter] = useState("");
  const [partStock, setPartStock] = useState("");

  // Drone fields
  const [droneBizType, setDroneBizType] = useState("");
  const [droneBrands, setDroneBrands] = useState("");
  const [droneServices, setDroneServices] = useState<string[]>([]);
  const [droneLicensed, setDroneLicensed] = useState(false);
  const [droneCoverage, setDroneCoverage] = useState("");

  // Service business fields (repair, bodyshop, salvage, also reused by carwash/parts)
  const [serviceTags, setServiceTags] = useState<string[]>([]);
  const [serviceHours, setServiceHours] = useState("");
  const [serviceWalkIn, setServiceWalkIn] = useState(true);
  const [serviceBrands, setServiceBrands] = useState("");
  const [serviceWarranty, setServiceWarranty] = useState("");

  const [photos, setPhotos] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  type UploadState = {
    status: "idle" | "uploading" | "done" | "error";
    percent: number;
    error?: string;
    url?: string;
    path?: string;
  };
  const [photoUploads, setPhotoUploads] = useState<UploadState[]>([]);
  const [videoUpload, setVideoUpload] = useState<UploadState>({ status: "idle", percent: 0 });
  const [listingId, setListingId] = useState<string | null>(null);

  const [pricing, setPricing] = useState<Record<string, number>>({});
  const [planLimits, setPlanLimits] = useState<PlanLimits>(FREE_PLAN_LIMITS);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    supabase
      .from("pricing_settings")
      .select("key,value")
      .then(({ data }) => {
        const map: Record<string, number> = {};
        (data ?? []).forEach((r: any) => {
          map[r.key] = Number(r.value);
        });
        setPricing(map);
      });
  }, []);

  useEffect(() => {
    if (user?.id) getUserPlanLimits(user.id).then(setPlanLimits);
  }, [user?.id]);

  // Prefill from a ride profile via ?from_ride=<id>
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const rideId = sp.get("from_ride");
    if (!rideId) return;
    (async () => {
      const { data: r } = await (supabase as any)
        .from("rides")
        .select(
          "name,year,make,model,trim,mileage_km,transmission,description,vehicle_type,region,province,city,barangay",
        )
        .eq("id", rideId)
        .maybeSingle();
      if (!r) return;
      const typeMap: Record<string, string> = {
        car: "car",
        suv: "car",
        truck: "car",
        van: "car",
        motorcycle: "motorcycle",
        scooter: "motorcycle",
        boat: "boat",
        atv: "other",
        utv: "other",
        other: "other",
      };
      setCategory(typeMap[r.vehicle_type] ?? "car");
      const vehicle = [r.year, r.make, r.model, r.trim].filter(Boolean).join(" ");
      setTitle(r.name ? (vehicle ? `${vehicle} — ${r.name}` : r.name) : vehicle);
      if (r.year) setYear(String(r.year));
      if (r.make) setMake(r.make);
      if (r.model) setModel(r.model);
      if (r.mileage_km != null) setMileage(String(r.mileage_km));
      if (r.transmission) setTransmission(r.transmission);
      if (r.description) setDescription(r.description);
      if (r.region) setRegion(r.region);
      if (r.province) setProvince(r.province);
      if (r.city) setCity(r.city);
      if (r.barangay) setBarangay(r.barangay);
      toast.success("Prefilled from your ride profile");
    })();
  }, []);

  const sellSeo = SELL_SEO[category] ?? SELL_SEO.other;
  const sellCategoryLabel = CATEGORIES.find((c) => c.slug === category)?.name ?? "Vehicle";
  useDynamicMeta({
    title: sellSeo.title,
    description: sellSeo.description,
    canonical: "https://www.365motorsales.com/sell",
  });
  useDynamicJsonLd("sell-page", {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: sellSeo.title,
    description: sellSeo.description,
    url: "https://www.365motorsales.com/sell",
    inLanguage: "en-PH",
    isPartOf: {
      "@type": "WebSite",
      name: "365 MotorSales Philippines",
      url: "https://www.365motorsales.com",
    },
    about: {
      "@type": "Thing",
      name: sellCategoryLabel,
      identifier: category,
    },
    potentialAction: {
      "@type": "CreateAction",
      name: `Post a ${sellCategoryLabel.toLowerCase()} listing`,
      target: "https://www.365motorsales.com/sell",
    },
  });

  // Strict per-plan caps: Free = 1 photo / 0 video, Standard = 5 / 1, Upgraded = 20 / 3.
  // Subscription planLimits cannot raise these listing-tier caps.
  const maxPhotos = plan === "upgraded" ? 20 : plan === "standard" ? 5 : 1;
  const maxVideos = plan === "upgraded" ? 3 : plan === "standard" ? 1 : 0;
  // Surfaced for messaging only — actual enforcement uses maxPhotos above.
  void planLimits;
  const totalFee =
    plan === "free"
      ? 0
      : (pricing.listing_fee_php ?? 20) +
        (plan === "upgraded" ? (pricing.upgrade_fee_php ?? 100) : 0);

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
    const accepted = files.slice(0, Math.max(remaining, 0));
    setPhotos((p) => [...p, ...accepted].slice(0, maxPhotos));
    setPhotoUploads((u) =>
      [...u, ...accepted.map(() => ({ status: "idle" as const, percent: 0 }))].slice(0, maxPhotos),
    );
    e.target.value = "";
  };

  const removePhoto = (i: number) => {
    setPhotos((p) => p.filter((_, idx) => idx !== i));
    setPhotoUploads((u) => u.filter((_, idx) => idx !== i));
  };

  const handleVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      setVideo(null);
      setVideoUpload({ status: "idle", percent: 0 });
      return;
    }
    if (maxVideos < 1) {
      toast.error("Videos are not included in this plan.");
      e.target.value = "";
      return;
    }
    setVideo(file);
    setVideoUpload({ status: "idle", percent: 0 });
  };

  const removeVideo = () => {
    setVideo(null);
    setVideoUpload({ status: "idle", percent: 0 });
  };

  const setPhotoState = (i: number, patch: Partial<UploadState>) => {
    setPhotoUploads((u) => u.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  };

  const uploadOnePhoto = async (i: number, file: File, lid: string) => {
    setPhotoState(i, { status: "uploading", percent: 0, error: undefined });
    try {
      const path = `${user!.id}/${lid}/${Date.now()}-${i}-${file.name}`;
      const { publicUrl } = await uploadWithRetry({
        bucket: "listing-photos",
        path,
        file,
        contentType: file.type || "image/jpeg",
        onProgress: (e) => setPhotoState(i, { percent: e.percent }),
      });
      setPhotoState(i, { status: "done", percent: 100, url: publicUrl, path });
      await supabase.from("listing_media").insert({
        listing_id: lid,
        type: "photo",
        url: publicUrl,
        storage_path: path,
        sort_order: i,
      });
      return true;
    } catch (err: any) {
      setPhotoState(i, { status: "error", error: err?.message ?? "Upload failed" });
      return false;
    }
  };

  const uploadVideo = async (file: File, lid: string) => {
    setVideoUpload({ status: "uploading", percent: 0 });
    try {
      const path = `${user!.id}/${lid}/${Date.now()}-${file.name}`;
      const { publicUrl } = await uploadWithRetry({
        bucket: "listing-videos",
        path,
        file,
        contentType: file.type || "video/mp4",
        onProgress: (e) => setVideoUpload((s) => ({ ...s, percent: e.percent })),
      });
      setVideoUpload({ status: "done", percent: 100, url: publicUrl, path });
      await supabase.from("listing_media").insert({
        listing_id: lid,
        type: "video",
        url: publicUrl,
        storage_path: path,
        sort_order: 0,
      });
      return true;
    } catch (err: any) {
      setVideoUpload((s) => ({ ...s, status: "error", error: err?.message ?? "Upload failed" }));
      return false;
    }
  };

  const retryPhoto = async (i: number) => {
    if (!listingId || !photos[i]) return;
    await uploadOnePhoto(i, photos[i], listingId);
  };

  const retryVideo = async () => {
    if (!listingId || !video) return;
    await uploadVideo(video, listingId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!title || !price) {
      toast.error("Title and price are required");
      return;
    }
    if (!region || !city) {
      toast.error("Please select region and city");
      return;
    }
    if (photos.length === 0) {
      toast.error("Please add at least one photo");
      return;
    }
    if (photos.length > maxPhotos) {
      toast.error(
        plan === "upgraded"
          ? `Upgraded listings allow up to 20 photos.`
          : plan === "standard"
            ? `Standard listings allow up to 5 photos. Remove some or upgrade to add up to 20.`
            : `Free listings allow only 1 photo. Choose Standard or Upgraded for more.`,
      );
      return;
    }
    if (video && maxVideos < 1) {
      toast.error("Remove the video or upgrade your plan to include video.");
      return;
    }
    if (video && maxVideos >= 1 && 1 > maxVideos) {
      // single-video uploader; reserved guard if multi-video added later
      toast.error(`This plan allows up to ${maxVideos} video${maxVideos > 1 ? "s" : ""}.`);
      return;
    }

    const textParsed = ListingTextSchema.safeParse({
      title,
      description,
      price_php: Number(price),
      contact_phone: phone || null,
    });
    if (!textParsed.success) {
      toast.error(textParsed.error.issues[0]?.message ?? "Please check your listing details.");
      return;
    }

    setSubmitting(true);
    try {
      let lid = listingId;
      if (!lid) {
        const attributes: Record<string, any> = {};
        if (year) attributes.year = year;
        if (make) attributes.make = make;
        if (model) attributes.model = model;
        if (make || model) attributes.make_model = [make, model].filter(Boolean).join(" ");
        if (mileage) attributes.mileage_km = mileage;
        if (transmission) attributes.transmission = transmission;
        if (fuel) attributes.fuel = fuel;
        if (engine) attributes.engine = engine;
        if (category === "towing") {
          if (towServiceType) attributes.service_type = towServiceType;
          if (towCapacity) attributes.vehicle_capacity = towCapacity;
          if (towCoverage)
            attributes.coverage_regions = towCoverage
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
          if (towBaseRate) attributes.base_rate_php = Number(towBaseRate);
          if (towPerKm) attributes.per_km_rate_php = Number(towPerKm);
          attributes.available_24_7 = tow247;
        }
        if (category === "carwash") {
          if (washServices.length) attributes.services = washServices;
          if (washTier) attributes.pricing_tier = washTier;
          if (washStartingPrice) attributes.starting_price_php = Number(washStartingPrice);
          attributes.accepts_walk_ins = washWalkIn;
          attributes.available_24_7 = wash247;
          if (washHours) attributes.operating_hours = washHours;
        }
        if (category === "parts") {
          if (partType) attributes.part_type = partType;
          if (partBrand) attributes.brand = partBrand;
          if (partFits) attributes.fits = partFits;
          if (partOemAfter) attributes.oem_or_aftermarket = partOemAfter;
          if (partStock) attributes.stock_quantity = Number(partStock);
        }
        if (category === "drone") {
          if (droneBizType) attributes.business_type = droneBizType;
          if (droneBrands) attributes.brands_carried = droneBrands;
          if (droneServices.length) attributes.services = droneServices;
          attributes.licensed_operator = droneLicensed;
          if (droneCoverage)
            attributes.coverage_regions = droneCoverage
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
        }
        // Unified service tags (works for any service category, including parts/carwash)
        if (serviceTags.length) attributes.tags = serviceTags;
        if (
          SERVICE_CATEGORIES.has(category) ||
          category === "repair" ||
          category === "bodyshop" ||
          category === "salvage"
        ) {
          if (serviceHours) attributes.operating_hours = serviceHours;
          attributes.accepts_walk_ins = serviceWalkIn;
          if (serviceBrands) attributes.brands_serviced = serviceBrands;
          if (serviceWarranty) attributes.warranty = serviceWarranty;
        }
        const expiryDays = pricing.listing_expiry_days ?? 60;
        const expires = new Date();
        expires.setDate(expires.getDate() + expiryDays);

        const { data: listing, error } = await supabase
          .from("listings")
          .insert({
            user_id: user.id,
            category_slug: category,
            title: textParsed.data.title,
            description: textParsed.data.description,
            price_php: textParsed.data.price_php,
            condition,
            region,
            province,
            city,
            barangay,
            seller_type: sellerType,
            plan,
            contact_phone: textParsed.data.contact_phone ?? null,
            attributes,
            status: plan === "free" ? "active" : "pending_payment",
            published_at: plan === "free" ? new Date().toISOString() : null,
            expires_at: expires.toISOString(),
          })
          .select()
          .single();

        if (error || !listing) throw error;
        lid = listing.id;
        setListingId(lid);
      }

      // Upload photos that are not already done. Run sequentially to keep the
      // UI responsive and avoid hammering the network on flaky connections.
      let allOk = true;
      for (let i = 0; i < photos.length; i++) {
        if (photoUploads[i]?.status === "done") continue;
        const ok = await uploadOnePhoto(i, photos[i], lid);
        if (!ok) allOk = false;
      }
      if (video && videoUpload.status !== "done") {
        const ok = await uploadVideo(video, lid);
        if (!ok) allOk = false;
      }

      if (!allOk) {
        toast.error("Some uploads failed. You can retry the failed items and submit again.");
        return;
      }

      if (plan !== "free") {
        // Create pending payment record (only once — guarded by a select first).
        const { data: existingPayments } = await supabase
          .from("payments")
          .select("id")
          .eq("listing_id", lid)
          .limit(1);
        if (!existingPayments || existingPayments.length === 0) {
          await supabase.from("payments").insert({
            user_id: user.id,
            listing_id: lid,
            kind: plan === "upgraded" ? "upgrade" : "listing",
            amount_php: totalFee,
            status: "pending",
            method: "manual",
          });
        }
        toast.success("Listing submitted! Awaiting payment confirmation.");
      } else {
        toast.success("Free listing published!");
      }
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to publish listing");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading)
    return (
      <SiteLayout>
        <div className="p-12 text-center">Loading…</div>
      </SiteLayout>
    );

  return (
    <SiteLayout>
      <div className="container mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-display text-3xl font-bold">Post a listing</h1>
        <p className="text-muted-foreground">Reach buyers across the Philippines.</p>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div>
            <div className="font-semibold">Already selling on Facebook Marketplace?</div>
            <p className="text-sm text-muted-foreground">
              Import a listing in seconds — we verify your FB profile so buyers know it's the real
              you.
            </p>
          </div>
          <Button asChild variant="default" size="sm">
            <Link to="/sell/import">Import from Facebook</Link>
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
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
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="2019 Toyota Vios 1.3 E AT"
                />
              </div>
              <div>
                <Label htmlFor="price">Price (₱)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="phone">Contact phone (optional)</Label>
                <PhoneInput
                  id="phone"
                  iso={phoneIso}
                  national={phoneNational}
                  onChange={({ iso, national }) => {
                    setPhoneIso(iso);
                    setPhoneNational(national);
                    setPhone(buildE164(iso, national) ?? "");
                  }}
                />
              </div>
            </div>
          </section>

          {SERVICE_CATEGORIES.has(category) && (
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
                  <Input
                    value={serviceBrands}
                    onChange={(e) => setServiceBrands(e.target.value)}
                    placeholder="Toyota, Honda, Ford…"
                  />
                </div>
                <div>
                  <Label>Warranty (optional)</Label>
                  <Input
                    value={serviceWarranty}
                    onChange={(e) => setServiceWarranty(e.target.value)}
                    placeholder="e.g. 30-day parts & labor"
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
                  <Input
                    value={washHours}
                    onChange={(e) => setWashHours(e.target.value)}
                    placeholder="Mon–Sat, 8AM–6PM"
                  />
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
                  <Input
                    value={partBrand}
                    onChange={(e) => setPartBrand(e.target.value)}
                    placeholder="e.g. Bosch, OEM Toyota"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Fits (make / model / year)</Label>
                  <Input
                    value={partFits}
                    onChange={(e) => setPartFits(e.target.value)}
                    placeholder="e.g. Toyota Vios 2015–2020"
                  />
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
                  <Input
                    value={droneBrands}
                    onChange={(e) => setDroneBrands(e.target.value)}
                    placeholder="DJI, Autel, Skydio"
                  />
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
                  <Input
                    value={droneCoverage}
                    onChange={(e) => setDroneCoverage(e.target.value)}
                    placeholder="NCR, Region IV-A"
                  />
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
                  <Input
                    value={towCoverage}
                    onChange={(e) => setTowCoverage(e.target.value)}
                    placeholder="NCR, Region IV-A, Region III"
                  />
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
              <div className="space-y-4">
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
            <div className="grid gap-4 sm:grid-cols-2">
              {(category === "car" || category === "motorcycle") && (
                <>
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
                </>
              )}
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

          <section className="space-y-4 rounded-xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-semibold">Location</h2>
            <p className="text-xs text-muted-foreground">
              Based on the official PSA Philippine Standard Geographic Code.
            </p>
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
            <RadioGroup
              value={sellerType}
              onValueChange={(v: any) => setSellerType(v)}
              className="grid gap-3 sm:grid-cols-2"
            >
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 hover:bg-secondary/50">
                <RadioGroupItem value="private" className="mt-1" />
                <div>
                  <div className="font-medium">Private seller</div>
                  <div className="text-xs text-muted-foreground">
                    I'm selling my personal vehicle
                  </div>
                </div>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 hover:bg-secondary/50">
                <RadioGroupItem value="business" className="mt-1" />
                <div>
                  <div className="font-medium">Business / Dealer</div>
                  <div className="text-xs text-muted-foreground">I sell vehicles as a business</div>
                </div>
              </label>
            </RadioGroup>
          </section>

          <section className="space-y-4 rounded-xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-semibold">Plan</h2>
            <RadioGroup
              value={plan}
              onValueChange={(v: any) => setPlan(v)}
              className="grid gap-3 sm:grid-cols-3"
            >
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 hover:bg-secondary/50">
                <RadioGroupItem value="free" className="mt-1" />
                <div>
                  <div className="font-medium">Free — ₱0</div>
                  <div className="text-xs text-muted-foreground">
                    1 photo, no video. Limit 1 listing per week.
                  </div>
                </div>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 hover:bg-secondary/50">
                <RadioGroupItem value="standard" className="mt-1" />
                <div>
                  <div className="font-medium">
                    Standard — {formatPHP(pricing.listing_fee_php ?? 20)}
                  </div>
                  <div className="text-xs text-muted-foreground">Up to 5 photos, 1 video</div>
                </div>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 hover:bg-secondary/50">
                <RadioGroupItem value="upgraded" className="mt-1" />
                <div>
                  <div className="font-medium">
                    Upgraded —{" "}
                    {formatPHP((pricing.listing_fee_php ?? 20) + (pricing.upgrade_fee_php ?? 100))}
                  </div>
                  <div className="text-xs text-muted-foreground">Up to 20 photos, 3 videos</div>
                </div>
              </label>
            </RadioGroup>
          </section>

          <section className="space-y-4 rounded-xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-semibold">Photos & video</h2>
            {(photos.length > maxPhotos || (video && maxVideos < 1)) && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                Your media exceeds the {plan === "standard" ? "Standard" : "current"} plan limit (
                {maxPhotos} photos
                {maxVideos > 0 ? `, ${maxVideos} video${maxVideos > 1 ? "s" : ""}` : ", no video"}).
                Remove items or switch to Upgraded to submit.
              </div>
            )}
            <div>
              <Label className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Photos ({photos.length}/{maxPhotos})
              </Label>
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {photos.map((file, i) => {
                  const u = photoUploads[i] ?? { status: "idle" as const, percent: 0 };
                  return (
                    <div
                      key={i}
                      className="relative aspect-square overflow-hidden rounded-md bg-secondary"
                    >
                      <img
                        src={URL.createObjectURL(file)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      {u.status !== "done" && (
                        <button
                          type="button"
                          onClick={() => removePhoto(i)}
                          className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
                          aria-label="Remove photo"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                      {u.status === "done" && (
                        <div className="absolute right-1 top-1 rounded-full bg-emerald-600 p-1 text-white">
                          <CheckCircle2 className="h-3 w-3" />
                        </div>
                      )}
                      {u.status === "uploading" && (
                        <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1.5">
                          <Progress value={u.percent} className="h-1" />
                          <div className="mt-0.5 text-center text-[10px] text-white">
                            {u.percent}%
                          </div>
                        </div>
                      )}
                      {u.status === "error" && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-destructive/85 p-1 text-center text-[10px] text-destructive-foreground">
                          <AlertCircle className="h-4 w-4" />
                          <span className="line-clamp-2">{u.error ?? "Failed"}</span>
                          <button
                            type="button"
                            onClick={() => retryPhoto(i)}
                            className="inline-flex items-center gap-1 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium text-foreground hover:bg-background"
                          >
                            <RotateCw className="h-3 w-3" /> Retry
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {photos.length < maxPhotos && (
                  <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-border text-muted-foreground hover:bg-secondary/50">
                    <Upload className="h-5 w-5" />
                    <span className="mt-1 text-xs">Add</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handlePhotos}
                    />
                  </label>
                )}
              </div>
            </div>
            <div>
              <Label className="flex items-center gap-2">
                <VideoIcon className="h-4 w-4" />
                Video (max {maxVideos})
              </Label>
              <Input
                type="file"
                accept="video/*"
                onChange={handleVideo}
                className="mt-2"
                disabled={videoUpload.status === "uploading"}
              />
              {video && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="truncate flex-1">{video.name}</span>
                    {videoUpload.status === "done" && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    )}
                    {videoUpload.status !== "uploading" && videoUpload.status !== "done" && (
                      <button
                        type="button"
                        onClick={removeVideo}
                        className="text-foreground hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  {videoUpload.status === "uploading" && (
                    <div className="flex items-center gap-2">
                      <Progress value={videoUpload.percent} className="h-1.5 flex-1" />
                      <span className="text-xs text-muted-foreground">{videoUpload.percent}%</span>
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
                        onClick={retryVideo}
                        className="inline-flex items-center gap-1 rounded bg-background px-1.5 py-0.5 text-foreground hover:bg-secondary"
                      >
                        <RotateCw className="h-3 w-3" /> Retry
                      </button>
                    </div>
                  )}
                </div>
              )}
              {plan === "standard" && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Standard includes 1 video. Upgrade to add up to 3.
                </p>
              )}
            </div>
          </section>

          <div className="flex flex-col items-stretch justify-between gap-3 rounded-xl border border-border bg-card p-6 sm:flex-row sm:items-center">
            <div>
              <div className="text-sm text-muted-foreground">Total listing fee</div>
              <div className="font-display text-2xl font-bold text-primary">
                {formatPHP(totalFee)}
              </div>
              <div className="text-xs text-muted-foreground">
                Listing publishes after payment is confirmed.
              </div>
            </div>
            <div className="flex gap-2">
              <Button asChild type="button" variant="outline">
                <Link to="/dashboard">Cancel</Link>
              </Button>
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
