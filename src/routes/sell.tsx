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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatPHP } from "@/lib/format";
import { LocationPicker } from "@/components/location-picker";
import { LocationPicker as MapLocationPicker } from "@/components/businesses/location-picker";
import { VehiclePicker } from "@/components/vehicle-picker";
import { TagPicker } from "@/components/tag-picker";
import { CATEGORY_DEFAULT_GROUPS, SERVICE_CATEGORIES } from "@/data/service-tags";
import { uploadWithRetry } from "@/lib/storage-upload";
import { getUserPlanLimits, FREE_PLAN_LIMITS, type PlanLimits } from "@/lib/plan-limits";
import { useDynamicMeta } from "@/hooks/use-dynamic-meta";
import { useDynamicJsonLd } from "@/hooks/use-dynamic-jsonld";
import { PhoneInput } from "@/components/phone-input";
import { buildE164 } from "@/data/country-codes";
import {
  VehicleQualityFields,
  vehicleQualityToAttributes,
  validateVehicleQuality,
  type VehicleQuality,
  type VehicleQualityIssue,
} from "@/components/vehicle-quality-fields";
import { VinScanDialog } from "@/components/vin-scan-dialog";
import {
  CategoryAttributesEditor,
  CATEGORY_ATTR_KEYS,
} from "@/components/listings/category-attributes-editor";
import { isAttrCategory, isValidDrivetrain } from "@/lib/category-attributes";
import {
  FitmentEditor,
  normalizeFitmentRows,
  type FitmentRow,
} from "@/components/parts/fitment-editor";
import { NEEDED_PARTS_GROUPS } from "@/data/needed-parts-catalog";
import { z } from "zod";

const CATEGORY_LABEL_MAP: Record<string, string> = {
  car: "Car",
  motorcycle: "Motorcycle",
  equipment: "Heavy equipment",
  boat: "Boat",
  airplane: "Aircraft",
};

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
    title: "List your towing & transport service — 365 MotorSales",
    description:
      "Offer flatbed, wrecker, long-distance, and roadside towing services to drivers across the Philippines.",
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
  used_part: {
    title: "Sell used auto parts — 365 MotorSales Philippines",
    description:
      "List used engines, transmissions, body panels, and salvage parts. Tag vehicle fitment so buyers can find your part.",
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
  validateSearch: (
    search: Record<string, unknown>,
  ): { payment?: "cancelled" | "failed"; listingId?: string } => {
    const p = search.payment;
    const payment = p === "cancelled" || p === "failed" ? p : undefined;
    return {
      payment,
      listingId: typeof search.listingId === "string" ? search.listingId : undefined,
    };
  },
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

function SellPage() {
  const { user, loading: authLoading, effectiveSellerType } = useAuth();
  const navigate = useNavigate();
  const { payment: paymentStatus, listingId: pendingListingId } = Route.useSearch();

  const [category, setCategory] = useState("car");
  const [activeTab, setActiveTab] = useState<"details" | "location" | "plan" | "media">("details");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [myRides, setMyRides] = useState<Array<{ id: string; name: string | null; year: number | null; make: string | null; model: string | null }>>([]);
  const [sourceRideId, setSourceRideId] = useState<string | null>(null);
  const [negotiable, setNegotiable] = useState(false);
  const [priceHidden, setPriceHidden] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState<
    "registered" | "unregistered" | "for_transfer" | "unknown"
  >("unknown");
  const [region, setRegion] = useState<string | null>(null);
  const [province, setProvince] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [barangay, setBarangay] = useState<string | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
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
  const [previewPlan, setPreviewPlan] = useState<"free" | "standard" | "upgraded" | null>(null);
  const [selectedBoost, setSelectedBoost] = useState<string>("");
  const [boostOptions, setBoostOptions] = useState<
    Array<{ slug: string; label: string; price_php: number; duration_days: number }>
  >([]);
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

  // Towing service-specific fields
  const [towServiceType, setTowServiceType] = useState("");
  const [towCapacity, setTowCapacity] = useState("");
  const [towCoverage, setTowCoverage] = useState("");
  const [towBaseRate, setTowBaseRate] = useState("");
  const [towPerKm, setTowPerKm] = useState("");
  const [tow247, setTow247] = useState(false);
  const [towPayments, setTowPayments] = useState<string[]>([]);

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

  // Used part (peer-to-peer) fields
  const [usedPartSystem, setUsedPartSystem] = useState("");
  const [usedPartName, setUsedPartName] = useState("");
  const [usedPartCondition, setUsedPartCondition] = useState("");
  const [usedPartOemAfter, setUsedPartOemAfter] = useState("");
  const [usedPartNumber, setUsedPartNumber] = useState("");
  const [usedPartWarrantyDays, setUsedPartWarrantyDays] = useState("");
  const [fitmentRows, setFitmentRows] = useState<FitmentRow[]>([]);


  // Service business fields (repair, bodyshop, salvage, also reused by carwash/parts)
  const [serviceTags, setServiceTags] = useState<string[]>([]);
  const [serviceHours, setServiceHours] = useState("");
  const [serviceWalkIn, setServiceWalkIn] = useState(true);
  const [serviceBrands, setServiceBrands] = useState("");
  const [serviceWarranty, setServiceWarranty] = useState("");

  const [photos, setPhotos] = useState<File[]>([]);
  const [videos, setVideos] = useState<File[]>([]);

  const [submitting, setSubmitting] = useState(false);

  type UploadState = {
    status: "idle" | "uploading" | "done" | "error";
    percent: number;
    error?: string;
    url?: string;
    path?: string;
  };
  const [photoUploads, setPhotoUploads] = useState<UploadState[]>([]);
  const [videoUploads, setVideoUploads] = useState<UploadState[]>([]);
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

  useEffect(() => {
    supabase
      .from("boost_products")
      .select("slug,label,price_php,duration_days,active,sort_order")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        setBoostOptions((data ?? []) as any);
      });
  }, []);


  // Prefill from a ride profile (used by ?from_ride=<id> and the "Pull from my Rides" picker).
  const prefillFromRide = async (rideId: string) => {
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
    const rideLink = `More photos & build details: https://www.365motorsales.com/rides/${rideId}`;
    setDescription((prev) => {
      const base = r.description ?? prev ?? "";
      if (base.includes(rideLink)) return base;
      return base ? `${base}\n\n${rideLink}` : rideLink;
    });
    if (r.region) setRegion(r.region);
    if (r.province) setProvince(r.province);
    if (r.city) setCity(r.city);
    if (r.barangay) setBarangay(r.barangay);
    setSourceRideId(rideId);
    toast.success("Prefilled from your ride profile");
  };

  // Honor ?from_ride=<id> on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const rideId = sp.get("from_ride");
    if (rideId) prefillFromRide(rideId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch user's rides for the "Pull from my Rides" picker + prefill phone/location from profile.
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data: rides } = await (supabase as any)
        .from("rides")
        .select("id,name,year,make,model")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(20);
      if (rides) setMyRides(rides);
      const { data: prof } = await (supabase as any)
        .from("profiles")
        .select("phone,phone_e164,signup_region,signup_province,signup_city")
        .eq("id", user.id)
        .maybeSingle();
      if (prof) {
        if (!phoneNational && (prof.phone || prof.phone_e164)) {
          const raw = String(prof.phone_e164 || prof.phone || "").replace(/^\+63/, "").replace(/\D/g, "");
          if (raw) {
            setPhoneIso("PH");
            setPhoneNational(raw);
            setPhone(buildE164("PH", raw) ?? "");
          }
        }
        if (!region && prof.signup_region) setRegion(prof.signup_region);
        if (!province && prof.signup_province) setProvince(prof.signup_province);
        if (!city && prof.signup_city) setCity(prof.signup_city);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);



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

  // Strict per-plan caps: Free = 12 photos / 1 video, paid (Standard & Upgraded) = 20 photos / 3 videos.
  // Subscription planLimits cannot raise these listing-tier caps.
  const maxPhotos = plan === "free" ? 12 : 20;
  const maxVideos = plan === "free" ? 1 : 3;
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
        plan === "free"
          ? `Free listings allow up to ${maxPhotos} photos. ${overflow} photo(s) skipped — upgrade to add up to 20.`
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
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    if (maxVideos < 1) {
      toast.error("Videos are not included in this plan.");
      e.target.value = "";
      return;
    }
    const remaining = maxVideos - videos.length;
    if (files.length > remaining) {
      const overflow = files.length - Math.max(remaining, 0);
      toast.error(
        plan === "free"
          ? `Free listings allow up to ${maxVideos} video. ${overflow} video(s) skipped — upgrade to add up to 3.`
          : `Up to ${maxVideos} videos allowed. ${overflow} video(s) skipped.`,
      );
    }
    const accepted = files.slice(0, Math.max(remaining, 0));
    setVideos((v) => [...v, ...accepted].slice(0, maxVideos));
    setVideoUploads((u) =>
      [...u, ...accepted.map(() => ({ status: "idle" as const, percent: 0 }))].slice(0, maxVideos),
    );
    e.target.value = "";
  };

  const removeVideo = (i: number) => {
    setVideos((v) => v.filter((_, idx) => idx !== i));
    setVideoUploads((u) => u.filter((_, idx) => idx !== i));
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

  const setVideoState = (i: number, patch: Partial<UploadState>) => {
    setVideoUploads((u) => u.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  };

  const uploadOneVideo = async (i: number, file: File, lid: string) => {
    setVideoState(i, { status: "uploading", percent: 0, error: undefined });
    try {
      const path = `${user!.id}/${lid}/${Date.now()}-${i}-${file.name}`;
      const { publicUrl } = await uploadWithRetry({
        bucket: "listing-videos",
        path,
        file,
        contentType: file.type || "video/mp4",
        onProgress: (e) => setVideoState(i, { percent: e.percent }),
      });
      setVideoState(i, { status: "done", percent: 100, url: publicUrl, path });
      await supabase.from("listing_media").insert({
        listing_id: lid,
        type: "video",
        url: publicUrl,
        storage_path: path,
        sort_order: i,
      });
      return true;
    } catch (err: any) {
      setVideoState(i, { status: "error", error: err?.message ?? "Upload failed" });
      return false;
    }
  };

  const retryPhoto = async (i: number) => {
    if (!listingId || !photos[i]) return;
    await uploadOnePhoto(i, photos[i], listingId);
  };

  const retryVideo = async (i: number) => {
    if (!listingId || !videos[i]) return;
    await uploadOneVideo(i, videos[i], listingId);
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
        plan === "free"
          ? `Free listings allow up to 12 photos. Remove some or upgrade to add up to 20.`
          : `Paid listings allow up to 20 photos.`,
      );
      return;
    }
    if (videos.length > maxVideos) {
      toast.error(
        plan === "free"
          ? `Free listings allow up to 1 video. Remove some or upgrade to add up to 3.`
          : `Paid listings allow up to 3 videos.`,
      );
      return;
    }

    const textParsed = ListingTextSchema.safeParse({
      title,
      description,
      price_php: Number(price) || 0,
      contact_phone: phone || null,
    });
    if (!textParsed.success) {
      toast.error(textParsed.error.issues[0]?.message ?? "Please check your listing details.");
      return;
    }

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
        if (category === "car" || category === "motorcycle") {
          Object.assign(attributes, vehicleQualityToAttributes(vehicleQuality));
        }
        if (isAttrCategory(category)) {
          for (const k of CATEGORY_ATTR_KEYS[category] ?? []) {
            const v = categoryAttrs[k];
            if (v === undefined || v === null || v === "") continue;
            attributes[k] = v;
          }
        }
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
          if (towPayments.length) attributes.payments = towPayments;
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
        if (category === "used_part") {
          if (usedPartSystem) attributes.system = usedPartSystem;
          if (usedPartName) attributes.part_name = usedPartName;
          if (usedPartCondition) attributes.part_condition = usedPartCondition;
          if (usedPartOemAfter) attributes.oem_or_aftermarket = usedPartOemAfter;
          if (usedPartNumber) attributes.part_number = usedPartNumber;
          if (usedPartWarrantyDays) attributes.warranty_days = Number(usedPartWarrantyDays);
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
            price_php: Number(price) || 0,
            negotiable,
            price_hidden: priceHidden,
            registration_status: registrationStatus,
            condition,
            region,
            province,
            city,
            barangay,
            lat,
            lng,
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

        if (category === "used_part") {
          const { ok: fitRows, error: fitErr } = normalizeFitmentRows(fitmentRows);
          if (fitErr) {
            toast.error(fitErr);
            setSubmitting(false);
            return;
          }
          if (fitRows.length) {
            const { error: fErr } = await supabase
              .from("listing_fitment")
              .insert(fitRows.map((r) => ({ ...r, listing_id: lid! })));
            if (fErr) {
              toast.error(`Saved listing, but fitment failed: ${fErr.message}`);
            }
          }
        }
      }

      // Upload photos that are not already done. Run sequentially to keep the
      // UI responsive and avoid hammering the network on flaky connections.
      let allOk = true;
      for (let i = 0; i < photos.length; i++) {
        if (photoUploads[i]?.status === "done") continue;
        const ok = await uploadOnePhoto(i, photos[i], lid);
        if (!ok) allOk = false;
      }
      for (let i = 0; i < videos.length; i++) {
        if (videoUploads[i]?.status === "done") continue;
        const ok = await uploadOneVideo(i, videos[i], lid);
        if (!ok) allOk = false;
      }

      if (!allOk) {
        toast.error("Some uploads failed. You can retry the failed items and submit again.");
        return;
      }

      if (plan !== "free") {
        toast.success("Listing saved — pay to publish.");
        navigate({
          to: "/listing/checkout",
          search: { listingId: lid, ...(selectedBoost ? { boost: selectedBoost } : {}) },
        });
      } else if (selectedBoost) {
        toast.success("Free listing published! Continue to boost checkout.");
        navigate({
          to: "/boost/checkout",
          search: { listingId: lid, slug: selectedBoost },
        });
      } else {
        toast.success("Free listing published!");
        navigate({ to: "/dashboard" });
      }
    } catch (err: any) {
      toast.error(err.message ?? "Failed to publish listing");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading)
    return (
      <SiteLayout>
        <div className="container mx-auto max-w-3xl px-4 py-6 sm:py-10">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Post a listing</h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Reach buyers across the Philippines.
          </p>

          <div className="mt-6 space-y-4 rounded-xl border border-border bg-card p-5 sm:p-6">
            <h2 className="text-sm font-semibold">How selling works</h2>
            <ol className="ml-5 list-decimal space-y-1 text-sm text-muted-foreground">
              <li>Create a free account (or sign in).</li>
              <li>Add up to 12 photos and 1 walkaround video (free plan).</li>
              <li>Buyers message you directly — no commissions.</li>
              <li>Close the sale safely with our OR/CR checklist.</li>
            </ol>
            <div className="flex flex-wrap gap-2 pt-2 text-sm">
              <Link to="/login" className="rounded-md bg-primary px-3 py-2 text-primary-foreground">
                Sign in to post
              </Link>
              <Link to="/start-selling" className="rounded-md border border-border px-3 py-2">
                Learn how it works
              </Link>
              <Link to="/pricing" className="rounded-md border border-border px-3 py-2">
                See plans & pricing
              </Link>
            </div>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">Checking your account…</p>
        </div>
      </SiteLayout>
    );


  return (
    <SiteLayout>
      <div className="container mx-auto max-w-5xl px-3 py-4 pb-24 sm:py-6 md:pb-6">
        <div className="flex items-end justify-between gap-3">
          <h1 className="font-display text-xl sm:text-2xl font-bold">Post a listing</h1>
          <span className="text-xs text-muted-foreground">Reach buyers across the Philippines.</span>
        </div>

        {paymentStatus && pendingListingId ? (
          <div
            role="alert"
            className="mt-3 flex flex-wrap items-start justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-3"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
              <div>
                <div className="font-semibold text-destructive">
                  {paymentStatus === "cancelled"
                    ? "Payment cancelled"
                    : "Payment didn't go through"}
                </div>
                <p className="text-xs text-muted-foreground">
                  Your listing is saved and still pending payment. You can resume checkout
                  any time — nothing was charged.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="w-full sm:w-auto"
              onClick={() =>
                navigate({
                  to: "/listing/checkout",
                  search: { listingId: pendingListingId },
                })
              }
            >
              Resume payment
            </Button>
          </div>
        ) : null}



        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {(() => {
            const TABS = [
              { key: "details", label: "Details" },
              { key: "location", label: "Location & Seller" },
              { key: "plan", label: "Plan & Boost" },
              { key: "media", label: "Photos" },
            ] as const;
            const idx = TABS.findIndex((t) => t.key === activeTab);
            return (
              <div className="sticky top-14 z-20 -mx-3 sm:mx-0 bg-background/95 backdrop-blur border-b border-border sm:rounded-xl sm:border sm:bg-card">
                <div className="flex overflow-x-auto no-scrollbar px-1 py-1 gap-1">
                  {TABS.map((t, i) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setActiveTab(t.key)}
                      className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition ${
                        activeTab === t.key
                          ? "bg-primary text-primary-foreground"
                          : i < idx
                            ? "text-foreground hover:bg-secondary"
                            : "text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      <span className="mr-1 opacity-60">{i < idx ? "✓" : `${i + 1}.`}</span>{t.label}
                    </button>
                  ))}
                </div>
                <div className="px-2 pb-2">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                    <span>Step {idx + 1} of {TABS.length} — {TABS[idx]?.label}</span>
                    <span>{Math.round(((idx + 1) / TABS.length) * 100)}%</span>
                  </div>
                  <Progress value={((idx + 1) / TABS.length) * 100} className="h-1.5" />
                </div>
              </div>

            );
          })()}
          <section data-tab="details" className={`space-y-3 rounded-xl border border-border bg-card p-3 sm:p-4 ${activeTab === "details" ? "" : "hidden"}`}>
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Listing details</h2>
              {myRides.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline text-[11px] text-muted-foreground">Pull from Rides:</span>
                  <Select
                    value={sourceRideId ?? ""}
                    onValueChange={(v) => { if (v) prefillFromRide(v); }}
                  >
                    <SelectTrigger className="h-8 w-[200px] text-xs">
                      <SelectValue placeholder="Choose a ride…" />
                    </SelectTrigger>
                    <SelectContent>
                      {myRides.map((r) => {
                        const label = [r.year, r.make, r.model].filter(Boolean).join(" ");
                        return (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name ? `${r.name}${label ? ` — ${label}` : ""}` : label || "Untitled ride"}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* LISTING */}
            <div className="space-y-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Listing</h3>
              <div>
                <Label htmlFor="title" className="text-xs">Title</Label>
                <Input
                  id="title"
                  required
                  className="h-9 text-sm"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="2019 Toyota Vios 1.3 E AT"
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <Label className="text-xs">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="h-9 text-sm">
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
                  <Label className="text-xs">Condition</Label>
                  <Select value={condition} onValueChange={setCondition}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Brand new">Brand new</SelectItem>
                      <SelectItem value="Used">Used</SelectItem>
                      <SelectItem value="For parts">For parts</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(category === "car" || category === "motorcycle" || category === "truck") ? (
                  <div>
                    <Label className="text-xs">Registration</Label>
                    <Select
                      value={registrationStatus}
                      onValueChange={(v) => setRegistrationStatus(v as typeof registrationStatus)}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="registered">Registered</SelectItem>
                        <SelectItem value="unregistered">Unregistered</SelectItem>
                        <SelectItem value="for_transfer">For transfer</SelectItem>
                        <SelectItem value="unknown">Not specified</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
                <div>
                  <Label className="text-xs">Seller type</Label>
                  <div className="flex h-9 items-center gap-2 rounded-md border border-dashed border-border bg-muted/30 px-2.5 text-sm">
                    <span className="inline-flex h-5 items-center rounded-full bg-primary/10 px-2 text-[11px] font-medium text-primary">
                      {sellerType === "business" ? "Business / Dealer" : "Private seller"}
                    </span>
                    <span className="truncate text-[11px] text-muted-foreground">
                      Auto-detected from your profile — shown beside your avatar on the listing.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* PRICE */}
            <div className="space-y-2 border-t border-border/60 pt-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Price</h3>
              <div className="grid gap-2 sm:grid-cols-[200px_1fr] items-end">
                <div>
                  <Label htmlFor="price" className="text-xs">Asking price (₱)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    className="h-9 text-sm"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g. 450000"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs pb-1">
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
                  <span className="text-[11px] text-muted-foreground basis-full">
                    Real prices only — placeholders (₱1, ₱2…) lower your seller score.
                  </span>
                </div>
              </div>
            </div>

            {/* VEHICLE (car / motorcycle only) */}
            {(category === "car" || category === "motorcycle") && (
              <div className="space-y-2 border-t border-border/60 pt-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Vehicle</h3>
                <div>
                  <Label className="text-xs">VIN / chassis</Label>
                  <div className="flex gap-2">
                    <Input
                      className="h-9 text-sm"
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
                <div className="grid gap-2 sm:grid-cols-3">
                  <div>
                    <Label className="text-xs">Mileage (km)</Label>
                    <Input className="h-9 text-sm" value={mileage} onChange={(e) => setMileage(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Transmission</Label>
                    <Select value={transmission} onValueChange={setTransmission}>
                      <SelectTrigger className="h-9 text-sm">
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
                    <Label className="text-xs">Fuel</Label>
                    <Select value={fuel} onValueChange={setFuel}>
                      <SelectTrigger className="h-9 text-sm">
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
              </div>
            )}

            {/* CATEGORY DETAILS — service tags + category-specific block */}
            {(SERVICE_CATEGORIES.has(category) ||
              category === "repair" || category === "bodyshop" || category === "salvage" ||
              category === "carwash" || category === "parts" || category === "used_part" ||
              category === "drone" || category === "towing" ||
              !(category === "car" || category === "motorcycle")) && (
              <div className="space-y-2 border-t border-border/60 pt-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {SERVICE_CATEGORIES.has(category) ? "What you offer" : "Category details"}
                </h3>
                {SERVICE_CATEGORIES.has(category) && (
                  <div className="space-y-1">
                    <p className="text-[11px] text-muted-foreground">
                      Pick everything that applies — buyers filter by these tags.
                    </p>
                    <TagPicker
                      value={serviceTags}
                      onChange={setServiceTags}
                      defaultGroups={CATEGORY_DEFAULT_GROUPS[category] ?? []}
                    />
                  </div>
                )}
                {category === "repair" || category === "bodyshop" || category === "salvage" ? (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="sm:col-span-2">
                      <Label className="text-xs">Operating hours</Label>
                      <Input
                        className="h-9 text-sm"
                        value={serviceHours}
                        onChange={(e) => setServiceHours(e.target.value)}
                        placeholder="Mon–Sat, 8AM–6PM"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Brands serviced (optional)</Label>
                      <Input
                        className="h-9 text-sm"
                        value={serviceBrands}
                        onChange={(e) => setServiceBrands(e.target.value)}
                        placeholder="Toyota, Honda, Ford…"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Warranty (optional)</Label>
                      <Input
                        className="h-9 text-sm"
                        value={serviceWarranty}
                        onChange={(e) => setServiceWarranty(e.target.value)}
                        placeholder="e.g. 30-day parts & labor"
                      />
                    </div>
                    <label className="flex items-center gap-2 text-xs sm:col-span-2">
                      <input
                        type="checkbox"
                        checked={serviceWalkIn}
                        onChange={(e) => setServiceWalkIn(e.target.checked)}
                      />
                      Accepts walk-ins
                    </label>
                  </div>
                ) : category === "carwash" ? (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="sm:col-span-2 lg:col-span-3">
                      <Label className="text-xs">Services offered</Label>
                      <div className="mt-1 flex flex-wrap gap-1.5">
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
                              className={`rounded-full border px-2.5 py-0.5 text-xs ${active ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground"}`}
                            >
                              {s}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Pricing tier</Label>
                      <Select value={washTier} onValueChange={setWashTier}>
                        <SelectTrigger className="h-9 text-sm">
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
                      <Label className="text-xs">Starting price (₱)</Label>
                      <Input
                        className="h-9 text-sm"
                        type="number"
                        min="0"
                        value={washStartingPrice}
                        onChange={(e) => setWashStartingPrice(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Operating hours</Label>
                      <Input
                        className="h-9 text-sm"
                        value={washHours}
                        onChange={(e) => setWashHours(e.target.value)}
                        placeholder="Mon–Sat, 8AM–6PM"
                      />
                    </div>
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={washWalkIn}
                        onChange={(e) => setWashWalkIn(e.target.checked)}
                      />
                      Accepts walk-ins
                    </label>
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={wash247}
                        onChange={(e) => setWash247(e.target.checked)}
                      />
                      Open 24/7
                    </label>
                  </div>
                ) : category === "parts" ? (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <Label className="text-xs">Part type</Label>
                      <Select value={partType} onValueChange={setPartType}>
                        <SelectTrigger className="h-9 text-sm">
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
                      <Label className="text-xs">Brand</Label>
                      <Input
                        className="h-9 text-sm"
                        value={partBrand}
                        onChange={(e) => setPartBrand(e.target.value)}
                        placeholder="e.g. Bosch, OEM Toyota"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">OEM or Aftermarket</Label>
                      <Select value={partOemAfter} onValueChange={setPartOemAfter}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="OEM">OEM</SelectItem>
                          <SelectItem value="Aftermarket">Aftermarket</SelectItem>
                          <SelectItem value="Surplus">Surplus</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-xs">Fits (make / model / year)</Label>
                      <Input
                        className="h-9 text-sm"
                        value={partFits}
                        onChange={(e) => setPartFits(e.target.value)}
                        placeholder="e.g. Toyota Vios 2015–2020"
                      />
                    </div>
                    <details className="sm:col-span-2 lg:col-span-3 group">
                      <summary className="cursor-pointer list-none text-xs font-medium text-primary hover:underline">
                        + More options (stock, inventory)
                      </summary>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                          <Label className="text-xs">Stock quantity</Label>
                          <Input
                            className="h-9 text-sm"
                            type="number"
                            min="0"
                            value={partStock}
                            onChange={(e) => setPartStock(e.target.value)}
                            placeholder="e.g. 10"
                          />
                        </div>
                      </div>
                    </details>
                  </div>
                ) : category === "used_part" ? (
                  <div className="space-y-2">
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <Label className="text-xs">Vehicle system *</Label>
                        <Select value={usedPartSystem} onValueChange={setUsedPartSystem}>
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Select system" />
                          </SelectTrigger>
                          <SelectContent>
                            {NEEDED_PARTS_GROUPS.map((g) => (
                              <SelectItem key={g.key} value={g.key}>
                                {g.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Part name *</Label>
                        <Input
                          className="h-9 text-sm"
                          value={usedPartName}
                          onChange={(e) => setUsedPartName(e.target.value)}
                          placeholder="e.g. Alternator, Front bumper"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Condition</Label>
                        <Select value={usedPartCondition} onValueChange={setUsedPartCondition}>
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="nos">New old stock (NOS)</SelectItem>
                            <SelectItem value="used_excellent">Used — excellent</SelectItem>
                            <SelectItem value="used_good">Used — good</SelectItem>
                            <SelectItem value="used_fair">Used — fair</SelectItem>
                            <SelectItem value="for_parts">For parts / not working</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">OEM or Aftermarket</Label>
                        <Select value={usedPartOemAfter} onValueChange={setUsedPartOemAfter}>
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="OEM">OEM</SelectItem>
                            <SelectItem value="Aftermarket">Aftermarket</SelectItem>
                            <SelectItem value="Surplus">Surplus / JDM</SelectItem>
                            <SelectItem value="Unknown">Unknown</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Part number (optional)</Label>
                        <Input
                          className="h-9 text-sm"
                          value={usedPartNumber}
                          onChange={(e) => setUsedPartNumber(e.target.value)}
                          placeholder="OEM or aftermarket part #"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Warranty (days, optional)</Label>
                        <Input
                          className="h-9 text-sm"
                          type="number"
                          min="0"
                          value={usedPartWarrantyDays}
                          onChange={(e) => setUsedPartWarrantyDays(e.target.value)}
                          placeholder="e.g. 7"
                        />
                      </div>
                    </div>
                    <div className="pt-1">
                      <FitmentEditor value={fitmentRows} onChange={setFitmentRows} />
                    </div>
                  </div>
                ) : category === "drone" ? (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <Label className="text-xs">Business type</Label>
                      <Select value={droneBizType} onValueChange={setDroneBizType}>
                        <SelectTrigger className="h-9 text-sm">
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
                      <Label className="text-xs">Brands carried</Label>
                      <Input
                        className="h-9 text-sm"
                        value={droneBrands}
                        onChange={(e) => setDroneBrands(e.target.value)}
                        placeholder="DJI, Autel, Skydio"
                      />
                    </div>
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={droneLicensed}
                        onChange={(e) => setDroneLicensed(e.target.checked)}
                      />
                      Licensed CAAP operator
                    </label>
                    <div className="sm:col-span-2 lg:col-span-3">
                      <Label className="text-xs">Services offered</Label>
                      <div className="mt-1 flex flex-wrap gap-1.5">
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
                              className={`rounded-full border px-2.5 py-0.5 text-xs ${active ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground"}`}
                            >
                              {s}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="sm:col-span-2 lg:col-span-3">
                      <Label className="text-xs">Coverage regions (comma-separated)</Label>
                      <Input
                        className="h-9 text-sm"
                        value={droneCoverage}
                        onChange={(e) => setDroneCoverage(e.target.value)}
                        placeholder="NCR, Region IV-A"
                      />
                    </div>
                  </div>
                ) : category === "towing" ? (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <Label className="text-xs">Service type</Label>
                      <Select value={towServiceType} onValueChange={setTowServiceType}>
                        <SelectTrigger className="h-9 text-sm">
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
                      <Label className="text-xs">Vehicle capacity</Label>
                      <Select value={towCapacity} onValueChange={setTowCapacity}>
                        <SelectTrigger className="h-9 text-sm">
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
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={tow247}
                        onChange={(e) => setTow247(e.target.checked)}
                      />
                      Available 24/7
                    </label>
                    <div>
                      <Label className="text-xs">Base rate (₱)</Label>
                      <Input
                        className="h-9 text-sm"
                        type="number"
                        min="0"
                        value={towBaseRate}
                        onChange={(e) => setTowBaseRate(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Per-km rate (₱)</Label>
                      <Input
                        className="h-9 text-sm"
                        type="number"
                        min="0"
                        value={towPerKm}
                        onChange={(e) => setTowPerKm(e.target.value)}
                      />
                    </div>
                    <div className="sm:col-span-2 lg:col-span-3">
                      <Label className="text-xs">Coverage regions (comma-separated)</Label>
                      <Input
                        className="h-9 text-sm"
                        value={towCoverage}
                        onChange={(e) => setTowCoverage(e.target.value)}
                        placeholder="NCR, Region IV-A, Region III"
                      />
                    </div>
                    <div className="sm:col-span-2 lg:col-span-3">
                      <Label className="text-xs mb-1 block">Accepted payments</Label>
                      <div className="flex flex-wrap gap-3">
                        {["GCash", "Maya", "Cash", "Bank transfer"].map((p) => {
                          const checked = towPayments.includes(p);
                          return (
                            <label key={p} className="flex items-center gap-2 text-xs">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) =>
                                  setTowPayments((prev) =>
                                    e.target.checked
                                      ? [...prev, p]
                                      : prev.filter((x) => x !== p),
                                  )
                                }
                              />
                              {p}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : !(category === "car" || category === "motorcycle") ? (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <Label className="text-xs">Make / Brand</Label>
                      <Input className="h-9 text-sm" value={make} onChange={(e) => setMake(e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">Model</Label>
                      <Input className="h-9 text-sm" value={model} onChange={(e) => setModel(e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">Year</Label>
                      <Input className="h-9 text-sm" value={year} onChange={(e) => setYear(e.target.value)} />
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* CONDITION & QUALITY (car / motorcycle) */}
            {(category === "car" || category === "motorcycle") && (
              <div className="space-y-2 border-t border-border/60 pt-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Condition &amp; quality</h3>
                <VehicleQualityFields
                  category={category as "car" | "motorcycle"}
                  value={vehicleQuality}
                  onChange={setVehicleQuality}
                  issues={vehicleQualityIssues}
                />
              </div>
            )}

            {/* FILTERS (category-attribute categories) */}
            {isAttrCategory(category) && (
              <div className="space-y-2 border-t border-border/60 pt-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {CATEGORY_LABEL_MAP[category] ?? "Details"} — buyers filter by these
                </h3>
                <CategoryAttributesEditor
                  category={category}
                  value={categoryAttrs}
                  onChange={setCategoryAttrs}
                />
              </div>
            )}

            {/* DESCRIPTION */}
            <div className="space-y-2 border-t border-border/60 pt-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Description</h3>
              <Textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell buyers what makes this listing stand out…"
              />
            </div>
          </section>


          <section data-tab="location" className={`space-y-2 rounded-xl border border-border bg-card p-2.5 sm:p-3 ${activeTab === "location" ? "" : "hidden"}`}>
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold">Location &amp; contact</h2>
              <span className="text-[11px] text-muted-foreground">PSA PSGC</span>
            </div>
            <LocationPicker
              value={{ region, province, city, barangay }}
              onChange={(v) => {
                setRegion(v.region ?? null);
                setProvince(v.province ?? null);
                setCity(v.city ?? null);
                setBarangay(v.barangay ?? null);
              }}
            />
            <div className="space-y-1 pt-1">
              <Label className="text-xs">Pin exact location on map (optional)</Label>
              <p className="text-[11px] text-muted-foreground">
                Tap or drag the marker to your city/neighborhood. Buyers see this pin on the marketplace map. If left blank, your listing groups by region.
              </p>
              <MapLocationPicker
                lat={lat}
                lng={lng}
                region={region}
                onChange={(la, ln) => {
                  setLat(la);
                  setLng(ln);
                }}
              />
              {lat != null && lng != null && (
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>
                    Pinned: {lat.toFixed(5)}, {lng.toFixed(5)}
                  </span>
                  <button
                    type="button"
                    className="underline hover:text-foreground"
                    onClick={() => {
                      setLat(null);
                      setLng(null);
                    }}
                  >
                    Clear pin
                  </button>
                </div>
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-2 pt-1">
              <div>
                <Label htmlFor="phone" className="text-xs">Contact phone (optional)</Label>
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



          <section data-tab="plan" className={`space-y-2 rounded-xl border border-border bg-card p-2.5 sm:p-3 ${activeTab === "plan" ? "" : "hidden"}`}>

            <h2 className="text-sm font-semibold">Plan</h2>
            <RadioGroup
              value={plan}
              onValueChange={(v: any) => setPlan(v)}
              className="grid gap-2 sm:grid-cols-3"
            >
              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border p-2.5 hover:bg-secondary/50">
                <RadioGroupItem value="free" className="mt-0.5" />
                <div>
                  <div className="text-sm font-medium">Free — ₱0</div>
                  <div className="text-[11px] text-muted-foreground">
                    12 photos, 1 video · 5 active
                  </div>
                </div>
              </label>
              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border p-2.5 hover:bg-secondary/50">
                <RadioGroupItem value="standard" className="mt-0.5" />
                <div>
                  <div className="text-sm font-medium">
                    Standard — {formatPHP(pricing.listing_fee_php ?? 20)}
                  </div>
                  <div className="text-[11px] text-muted-foreground">20 photos, 3 videos</div>
                </div>
              </label>
              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border p-2.5 hover:bg-secondary/50">
                <RadioGroupItem value="upgraded" className="mt-0.5" />
                <div>
                  <div className="text-sm font-medium">
                    Upgraded —{" "}
                    {formatPHP((pricing.listing_fee_php ?? 20) + (pricing.upgrade_fee_php ?? 100))}
                  </div>
                  <div className="text-[11px] text-muted-foreground">20 photos, 3 videos</div>
                </div>
              </label>
            </RadioGroup>

          </section>

          <section data-tab="plan" className={`rounded-xl border border-border bg-card ${activeTab === "plan" ? "" : "hidden"}`}>
            <details open={!!selectedBoost} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-2.5 sm:p-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">Add a boost</span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">Optional</span>
                  {selectedBoost && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      {boostOptions.find((b) => b.slug === selectedBoost)?.label ?? "Selected"}
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground group-open:hidden">Show options ▾</span>
                <span className="hidden text-xs text-muted-foreground group-open:inline">Hide ▴</span>
              </summary>
              <div className="space-y-2 px-2.5 pb-2.5 sm:px-3 sm:pb-3">
                <p className="text-xs text-muted-foreground">
                  Boost is purchased right after your listing payment for maximum visibility.
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {boostOptions.map((b) => {
                    const active = selectedBoost === b.slug;
                    return (
                      <button
                        type="button"
                        key={b.slug}
                        onClick={() => setSelectedBoost(active ? "" : b.slug)}
                        className={`rounded-lg border p-3 text-left text-sm transition ${
                          active ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{b.label}</span>
                          <span className="text-foreground">{formatPHP(b.price_php)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {b.duration_days} day{b.duration_days === 1 ? "" : "s"}
                        </div>
                      </button>
                    );
                  })}
                  {boostOptions.length === 0 && (
                    <div className="text-xs text-muted-foreground">No boosts available right now.</div>
                  )}
                  {selectedBoost && (
                    <button
                      type="button"
                      onClick={() => setSelectedBoost("")}
                      className="text-left text-xs text-muted-foreground hover:underline"
                    >
                      Clear boost selection
                    </button>
                  )}
                </div>
              </div>
            </details>
          </section>


          <section data-tab="media" className={`space-y-2 rounded-xl border border-border bg-card p-2.5 sm:p-3 ${activeTab === "media" ? "" : "hidden"}`}>
            <h2 className="text-sm font-semibold">Photos & video</h2>
            {(() => {
              const tierCaps: Record<
                "free" | "standard" | "upgraded",
                { photos: number; videos: number; label: string; price: number }
              > = {
                free: { photos: 12, videos: 1, label: "Free", price: 0 },
                standard: {
                  photos: 20,
                  videos: 3,
                  label: "Standard",
                  price: pricing.listing_fee_php ?? 20,
                },
                upgraded: {
                  photos: 20,
                  videos: 3,
                  label: "Upgraded",
                  price:
                    (pricing.listing_fee_php ?? 20) + (pricing.upgrade_fee_php ?? 100),
                },
              };
              const preview = previewPlan ?? plan;
              const previewCaps = tierCaps[preview];
              const remainingPhotos = Math.max(0, previewCaps.photos - photos.length);
              const remainingVideos = Math.max(0, previewCaps.videos - videos.length);
              const upgradeOptions = (["standard", "upgraded"] as const).filter(
                (t) => tierCaps[t].photos > tierCaps[plan].photos,
              );
              return (
                <>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                      {previewCaps.label}
                      {previewPlan && previewPlan !== plan ? " (preview)" : ""}
                    </span>
                    <span className="text-muted-foreground">
                      <Camera className="mr-0.5 inline h-3.5 w-3.5 -translate-y-0.5" />
                      <strong className="text-foreground">{remainingPhotos}</strong>{" "}
                      photo{remainingPhotos !== 1 ? "s" : ""} remaining
                    </span>
                    <span className="text-muted-foreground">
                      <VideoIcon className="mr-0.5 inline h-3.5 w-3.5 -translate-y-0.5" />
                      <strong className="text-foreground">{remainingVideos}</strong>{" "}
                      video{remainingVideos !== 1 ? "s" : ""} remaining
                    </span>
                    {upgradeOptions.length > 0 && (
                      <div className="flex w-full flex-wrap gap-2 sm:ml-auto sm:w-auto">
                        {upgradeOptions.map((tier) => {
                          const caps = tierCaps[tier];
                          const isBoost = tier === "upgraded";
                          return (
                            <Button
                              key={tier}
                              type="button"
                              size="sm"
                              variant={isBoost ? "default" : "outline"}
                              className="flex-1 sm:flex-none"
                              onMouseEnter={() => setPreviewPlan(tier)}
                              onMouseLeave={() => setPreviewPlan(null)}
                              onFocus={() => setPreviewPlan(tier)}
                              onBlur={() => setPreviewPlan(null)}
                              onClick={() => {
                                setPlan(tier);
                                setPreviewPlan(null);
                                toast.success(
                                  `Switched to ${caps.label} — ${caps.photos} photos, ${caps.videos} video${caps.videos === 1 ? "" : "s"}.`,
                                );
                              }}
                            >
                              {isBoost ? "Boost to " : "Upgrade to "}
                              {caps.label} · {formatPHP(caps.price)}
                            </Button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {previewPlan && previewPlan !== plan && (
                    <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs text-foreground">
                      With {previewCaps.label} you'd get{" "}
                      <strong>{previewCaps.photos} photos</strong> and{" "}
                      <strong>
                        {previewCaps.videos} video{previewCaps.videos === 1 ? "" : "s"}
                      </strong>{" "}
                      ({previewCaps.photos - tierCaps[plan].photos > 0
                        ? `+${previewCaps.photos - tierCaps[plan].photos} photos`
                        : "same photos"}
                      {previewCaps.videos - tierCaps[plan].videos > 0
                        ? `, +${previewCaps.videos - tierCaps[plan].videos} video${previewCaps.videos - tierCaps[plan].videos === 1 ? "" : "s"}`
                        : ""}
                      ).
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    Subscription plan: {planLimits.planName}
                  </div>
                </>
              );
            })()}
            {(photos.length > maxPhotos || videos.length > maxVideos) && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                Your media exceeds the {plan === "free" ? "Free" : "current"} plan limit (
                {maxPhotos} photos, {maxVideos} video{maxVideos === 1 ? "" : "s"}).
                Remove items{plan === "free" ? " or switch to a paid plan" : ""} to submit.
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
                        alt={`Listing photo ${i + 1} preview`}
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
                Videos ({videos.length}/{maxVideos})
              </Label>
              <Input
                type="file"
                accept="video/*"
                multiple={maxVideos > 1}
                onChange={handleVideo}
                className="mt-2"
                disabled={
                  videos.length >= maxVideos ||
                  videoUploads.some((u) => u.status === "uploading")
                }
              />
              {videos.length > 0 && (
                <ul className="mt-2 space-y-2">
                  {videos.map((file, i) => {
                    const u = videoUploads[i] ?? { status: "idle" as const, percent: 0 };
                    return (
                      <li key={i} className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="truncate flex-1">{file.name}</span>
                          {u.status === "done" && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          )}
                          {u.status !== "uploading" && u.status !== "done" && (
                            <button
                              type="button"
                              onClick={() => removeVideo(i)}
                              className="text-foreground hover:underline"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        {u.status === "uploading" && (
                          <div className="flex items-center gap-2">
                            <Progress value={u.percent} className="h-1.5 flex-1" />
                            <span className="text-xs text-muted-foreground">{u.percent}%</span>
                          </div>
                        )}
                        {u.status === "error" && (
                          <div className="flex items-center gap-2 rounded border border-destructive/40 bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
                            <AlertCircle className="h-3.5 w-3.5" />
                            <span className="flex-1 truncate">
                              {u.error ?? "Upload failed"}
                            </span>
                            <button
                              type="button"
                              onClick={() => retryVideo(i)}
                              className="inline-flex items-center gap-1 rounded bg-background px-1.5 py-0.5 text-foreground hover:bg-secondary"
                            >
                              <RotateCw className="h-3 w-3" /> Retry
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              {plan === "free" && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Free includes 1 video. Upgrade to add up to 3.
                </p>
              )}
            </div>
          </section>

          {(() => {
            const order = ["details", "location", "plan", "media"] as const;
            const i = order.indexOf(activeTab);
            const detailsIssues: string[] = [
              !title.trim() && "title",
              !price && !priceHidden && "price",
              category === "parts" && !partType && "part type",
              category === "parts" && !partFits.trim() && "fits (vehicle)",
              category === "used_part" && !usedPartSystem && "vehicle system",
              category === "used_part" && !usedPartName.trim() && "part name",
            ].filter(Boolean) as string[];
            const stepIssues: Record<(typeof order)[number], string[]> = {
              details: detailsIssues,
              location: [!region && "region", !city && "city"].filter(Boolean) as string[],
              plan: [],
              media: [photos.length === 0 && "at least 1 photo"].filter(Boolean) as string[],
            };
            const issues = stepIssues[activeTab];
            const canAdvance = issues.length === 0;
            const isLast = i === order.length - 1;
            const canSubmit = isLast && order.every((k) => stepIssues[k].length === 0);
            return (
              <div className="sticky bottom-0 z-30 -mx-3 flex flex-col items-stretch justify-between gap-2 border-t border-border bg-background/95 p-3 backdrop-blur sm:static sm:mx-0 sm:flex-row sm:items-center sm:gap-3 sm:rounded-xl sm:border sm:bg-card sm:p-4">
                <div className="flex items-center justify-between gap-3 sm:block">
                  <div>
                    <div className="text-[11px] text-muted-foreground">Total fee</div>
                    <div className="font-display text-lg font-bold text-primary sm:text-xl">
                      {formatPHP(totalFee)}
                    </div>
                  </div>
                  <div className="hidden text-[11px] text-muted-foreground sm:block">
                    Publishes after payment is confirmed.
                  </div>
                  <div className="hidden sm:block"><FormFeedbackLink formId="post-listing" /></div>
                </div>
                <div className="flex w-full flex-col gap-1 sm:w-auto">
                  {!canAdvance && i < order.length - 1 && (
                    <div className="text-[11px] text-amber-700">
                      Add: {issues.join(", ")} to continue
                    </div>
                  )}
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
                    {i > 0 && (
                      <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => setActiveTab(order[i - 1])}>
                        ← Back
                      </Button>
                    )}
                    {i < order.length - 1 && (
                      <Button
                        type="button"
                        size="sm"
                        className="w-full sm:w-auto"
                        disabled={!canAdvance}
                        onClick={() => { setActiveTab(order[i + 1]); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      >
                        Next →
                      </Button>
                    )}
                    {i === order.length - 1 && (
                      <>
                        <Button asChild type="button" variant="outline" size="sm" className="w-full sm:w-auto">
                          <Link to="/dashboard">Cancel</Link>
                        </Button>
                        <Button type="submit" disabled={submitting || !canSubmit} size="lg" className="w-full sm:w-auto">
                          {submitting ? "Submitting…" : "Submit listing"}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

        </form>
      </div>
    </SiteLayout>
  );
}
