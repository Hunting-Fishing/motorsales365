import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Upload,
  X,
  Camera,
  Video as VideoIcon,
  RotateCw,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { FormFeedbackLink } from "@/components/form-feedback";
import { Input } from "@/components/ui/input";
import { NumericInput, mandatoryFieldClass } from "@/components/ui/numeric-input";
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
import { extractVideoThumbnail, formatDuration } from "@/lib/video-thumbnail";
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
import { VinScanDialog, decodeVin, checkVinFormat, normalizeVin, VinDecodeError, type VinDecodeResult } from "@/components/vin-scan-dialog";
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
import { fileUrl, releaseFileUrl } from "@/lib/blob-url";
import { z } from "zod";

const CATEGORY_LABEL_MAP: Record<string, string> = {
  car: "Car",
  motorcycle: "Motorcycle",
  equipment: "Heavy equipment",
  boat: "Boat",
  airplane: "Aircraft",
};

function SellGroup({
  id,
  title,
  defaultOpen = false,
  status,
  children,
}: {
  id: string;
  title: string;
  defaultOpen?: boolean;
  status?: ReactNode;
  children: ReactNode;
}) {
  const storageKey = `sell:details:open:${id}`;
  const [open, setOpen] = useState<boolean>(defaultOpen);
  useEffect(() => {
    try {
      const v = window.sessionStorage.getItem(storageKey);
      if (v !== null) setOpen(v === "1");
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try {
      window.sessionStorage.setItem(storageKey, open ? "1" : "0");
    } catch {}
  }, [open, storageKey]);
  return (
    <div data-sell-group={id} className="border-t border-border/60 first:border-t-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 py-2 text-left hover:opacity-80"
        aria-expanded={open}
      >
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
        <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
          {status}
          <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open ? <div className="space-y-2 pb-2">{children}</div> : null}
    </div>
  );
}


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
  const [showMapPin, setShowMapPin] = useState<boolean>(false);
  type VinState =
    | { kind: "idle" }
    | { kind: "checking" }
    | { kind: "ok" }
    | { kind: "chassis"; message: string }
    | { kind: "warn"; message: string }
    | { kind: "error"; message: string; retryable?: boolean };
  const [vinState, setVinState] = useState<VinState>({ kind: "idle" });
  const [vinConflicts, setVinConflicts] = useState<
    Array<{ field: string; label: string; current: string; decoded: string; apply: () => void }>
  >([]);
  const vinAutoFilledRef = useRef<Record<string, { vin: string; value: string }>>({});


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
  const submitInFlightRef = useRef(false);

  type UploadState = {
    status: "idle" | "uploading" | "done" | "error";
    percent: number;
    error?: string;
    url?: string;
    path?: string;
  };
  const [photoUploads, setPhotoUploads] = useState<UploadState[]>([]);
  const [videoUploads, setVideoUploads] = useState<UploadState[]>([]);
  const [videoThumbs, setVideoThumbs] = useState<Array<{ dataUrl: string; duration: number } | null>>([]);
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

  // Auto-fill listing fields from a decoded VIN (scanner OR manual blur).
  // Only fills blanks, except when the same VIN is decoded again and a stale
  // VIN-filled value needs correction after decoder data/cache updates.
  // Records any mismatches so we can surface a conflict panel instead of silently
  // dropping decoded values or overwriting what the user typed.
  const norm = (v: unknown) => String(v ?? "").trim().toLowerCase();
  const fillIfBlank = <T,>(
    cur: T,
    decoded: T | undefined,
    field: string,
    label: string,
    conflicts: Array<{ field: string; label: string; current: string; decoded: string; apply: () => void }>,
    apply: (v: T) => void,
    vin?: string,
    allowVinCorrection = false,
  ): T => {
    if (decoded === undefined || decoded === null || decoded === "") return cur;
    const curKey = norm(cur);
    const decKey = norm(decoded);
    const lastAutoFill = vinAutoFilledRef.current[field];
    const wasAutoFilledForVin = !!vin && lastAutoFill?.vin === vin && norm(lastAutoFill.value) === curKey;
    if (!curKey || wasAutoFilledForVin || (allowVinCorrection && curKey !== decKey)) {
      apply(decoded);
      if (vin) vinAutoFilledRef.current[field] = { vin, value: String(decoded) };
      return decoded;
    }
    if (curKey !== decKey) {
      conflicts.push({
        field,
        label,
        current: String(cur ?? ""),
        decoded: String(decoded ?? ""),
        apply: () => {
          apply(decoded);
          if (vin) vinAutoFilledRef.current[field] = { vin, value: String(decoded) };
        },
      });
    }
    return cur;
  };

  const applyVinDecode = (r: VinDecodeResult) => {
    setVehicleQuality((prev) => ({ ...prev, vin_chassis: r.vin }));
    const conflicts: Array<{ field: string; label: string; current: string; decoded: string; apply: () => void }> = [];
    const decodedVin = normalizeVin(r.vin);
    const sameVinAlreadyInForm = normalizeVin(vehicleQuality.vin_chassis ?? "") === decodedVin;

    // Use functional setters so we compare against the freshest value and
    // never race a stale closure. Each helper either fills the blank or
    // records a conflict for the user to resolve.
    setCategory((cur) => fillIfBlank(cur, r.category, "category", "Category", conflicts, (v) => setCategory(v), decodedVin, sameVinAlreadyInForm));
    setYear((cur) => fillIfBlank(cur, r.year, "year", "Year", conflicts, (v) => setYear(v), decodedVin, sameVinAlreadyInForm));
    setMake((cur) => fillIfBlank(cur, r.make, "make", "Make", conflicts, (v) => setMake(v), decodedVin, sameVinAlreadyInForm));
    setModel((cur) => fillIfBlank(cur, r.model, "model", "Model", conflicts, (v) => setModel(v), decodedVin, sameVinAlreadyInForm));
    setEngine((cur) => fillIfBlank(cur, r.engine, "engine", "Engine", conflicts, (v) => setEngine(v), decodedVin, sameVinAlreadyInForm));
    setFuel((cur) => fillIfBlank(cur, r.fuel, "fuel", "Fuel", conflicts, (v) => setFuel(v), decodedVin, sameVinAlreadyInForm));
    setTransmission((cur) =>
      fillIfBlank(cur, r.transmission, "transmission", "Transmission", conflicts, (v) => setTransmission(v), decodedVin, sameVinAlreadyInForm),
    );
    setCategoryAttrs((prev) => {
      const next = { ...prev };
      if (r.trim) {
        const cur = prev.variant;
        if (!norm(cur)) next.variant = r.trim;
        else if (norm(cur) !== norm(r.trim)) {
          conflicts.push({
            field: "variant",
            label: "Variant / trim",
            current: String(cur ?? ""),
            decoded: String(r.trim),
            apply: () => setCategoryAttrs((p) => ({ ...p, variant: r.trim! })),
          });
        }
      }
      if (r.bodyType) {
        const cur = prev.body_type;
        if (!norm(cur)) next.body_type = r.bodyType;
        else if (norm(cur) !== norm(r.bodyType)) {
          conflicts.push({
            field: "body_type",
            label: "Body type",
            current: String(cur ?? ""),
            decoded: String(r.bodyType),
            apply: () => setCategoryAttrs((p) => ({ ...p, body_type: r.bodyType! })),
          });
        }
      }
      if (r.drivetrain) {
        const cur = prev.drivetrain;
        if (!norm(cur)) next.drivetrain = r.drivetrain;
        else if (norm(cur) !== norm(r.drivetrain)) {
          conflicts.push({
            field: "drivetrain",
            label: "Drivetrain",
            current: String(cur ?? ""),
            decoded: String(r.drivetrain),
            apply: () => setCategoryAttrs((p) => ({ ...p, drivetrain: r.drivetrain! })),
          });
        }
      }
      return next;
    });

    // Title conflict — check if title already includes year/make/model tokens
    // that disagree with the VIN. We only warn (never rewrite the title).
    setTitle((curTitle) => {
      const t = norm(curTitle);
      if (t) {
        if (r.year && !t.includes(String(r.year)) && /\b(19|20)\d{2}\b/.test(t)) {
          conflicts.push({
            field: "title_year",
            label: "Title year",
            current: curTitle,
            decoded: String(r.year),
            apply: () => {},
          });
        }
        if (r.make && !t.includes(norm(r.make)) && curTitle.length > 0) {
          // only flag if title looks like it names a make already
          conflicts.push({
            field: "title_make",
            label: "Title make",
            current: curTitle,
            decoded: String(r.make),
            apply: () => {},
          });
        }
      }
      return curTitle;
    });

    setVinConflicts(conflicts);
  };

  // Central VIN decoder — used by onBlur + Retry. Classifies every failure
  // mode so the user knows *why* nothing auto-filled. Never touches typed fields.
  const runVinDecode = async (raw: string) => {
    if (!raw) {
      setVinState({ kind: "idle" });
      return;
    }
    const fmt = checkVinFormat(raw);
    if (fmt.kind === "bad_chars" || fmt.kind === "bad_length") {
      setVinState({ kind: "error", message: fmt.message });
      return;
    }
    if (fmt.kind === "ok_chassis") {
      setVinState({
        kind: "chassis",
        message: "Saved as chassis #. Auto-fill only works for 17-character VINs — please fill the vehicle fields below.",
      });
      return;
    }
    // ok_vin or warn_checksum — attempt decode either way (many JDM/EU VINs fail checksum but still decode).
    setVinState({ kind: "checking" });
    try {
      const r = await decodeVin(raw);
      const gotAnything = !!(r.year || r.make || r.model);
      const gotFull = !!(r.year && r.make && r.model);
      applyVinDecode(r);
      if (gotFull) {
        if (fmt.kind === "warn_checksum") {
          setVinState({
            kind: "warn",
            message: "Check digit didn't match (common for Asia/Europe VINs) — decoded anyway.",
          });
        } else {
          setVinState({ kind: "ok" });
        }
      } else if (gotAnything) {
        // Waterfall filled what it could (NHTSA / structural WMI+VDS / AI).
        // Tell the user which fields still need attention and which region
        // the VIN was routed through.
        const missing = (r.missing?.length ? r.missing : [!r.year && "year", !r.make && "make", !r.model && "model"])
          .filter(Boolean)
          .join(", ");
        const regionLabel = r.region === "NA" ? "North America" : r.region === "Asia" ? "Asia" : r.region === "Europe" ? "Europe" : "this region";
        const sourceLabel =
          r.primarySource === "nhtsa" ? "NHTSA" :
          r.primarySource === "vds" ? "manufacturer VDS table" :
          r.primarySource === "ai" ? "AI VIN analyzer" :
          r.primarySource === "jdm_table" ? "JDM chassis table" : "WMI lookup";
        setVinState({
          kind: "warn",
          message: `Partial decode via ${sourceLabel} (${regionLabel}) — please fill in ${missing || "remaining fields"}.`,
        });
      } else {
        setVinState({
          kind: "warn",
          message:
            "We couldn't identify this VIN from NHTSA, our structural tables, or the AI analyzer. VIN saved — please fill the vehicle fields manually.",
        });
      }
    } catch (e) {
      if (e instanceof VinDecodeError && e.kind === "http") {
        setVinState({
          kind: "error",
          message: `VIN lookup service returned an error (${e.status ?? "?"}). Your VIN is saved — please fill fields manually or retry.`,
          retryable: true,
        });
      } else {
        setVinState({
          kind: "error",
          message: "VIN lookup service is unreachable — check your connection. Your VIN is saved.",
          retryable: true,
        });
      }
    }
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
        // Do NOT auto-prefill the contact phone from the profile — users
        // reported unexpected numbers appearing. They can tap the phone input
        // and use the browser's saved-values suggestion instead.
        if (!region && prof.signup_region) setRegion(prof.signup_region);
        if (!province && prof.signup_province) setProvince(prof.signup_province);
        if (!city && prof.signup_city) setCity(prof.signup_city);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);



  // ── Safe Drafts ──────────────────────────────────────────────────────────
  // Auto-save the form to `listing_drafts` (one row per user) so users can
  // resume where they left off. Media files are NOT persisted (Files can't be
  // serialized) — only the text state.
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [draftBanner, setDraftBanner] = useState<{ updated_at: string; form: any } | null>(null);
  useEffect(() => {
    if (!user?.id || draftLoaded) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("listing_drafts")
        .select("form_json,updated_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.form_json) {
        setDraftBanner({ updated_at: data.updated_at, form: data.form_json });
      }
      setDraftLoaded(true);
    })();
  }, [user?.id, draftLoaded]);

  const applyDraft = (f: any) => {
    if (!f || typeof f !== "object") return;
    if (typeof f.category === "string") setCategory(f.category);
    if (typeof f.title === "string") setTitle(f.title);
    if (typeof f.description === "string") setDescription(f.description);
    if (typeof f.price === "string") setPrice(f.price);
    if (typeof f.negotiable === "boolean") setNegotiable(f.negotiable);
    if (typeof f.priceHidden === "boolean") setPriceHidden(f.priceHidden);
    if (typeof f.registrationStatus === "string") setRegistrationStatus(f.registrationStatus);
    if (f.region !== undefined) setRegion(f.region);
    if (f.province !== undefined) setProvince(f.province);
    if (f.city !== undefined) setCity(f.city);
    if (f.barangay !== undefined) setBarangay(f.barangay);
    if (f.lat !== undefined) setLat(f.lat);
    if (f.lng !== undefined) setLng(f.lng);
    if (typeof f.condition === "string") setCondition(f.condition);
    if (typeof f.phone === "string") setPhone(f.phone);
    if (typeof f.phoneIso === "string") setPhoneIso(f.phoneIso);
    if (typeof f.phoneNational === "string") setPhoneNational(f.phoneNational);
    if (typeof f.year === "string") setYear(f.year);
    if (typeof f.make === "string") setMake(f.make);
    if (typeof f.model === "string") setModel(f.model);
    if (typeof f.mileage === "string") setMileage(f.mileage);
    if (typeof f.transmission === "string") setTransmission(f.transmission);
    if (typeof f.fuel === "string") setFuel(f.fuel);
    if (typeof f.engine === "string") setEngine(f.engine);
    if (f.categoryAttrs && typeof f.categoryAttrs === "object") setCategoryAttrs(f.categoryAttrs);
    toast.success("Draft restored");
  };

  const discardDraft = async () => {
    if (!user?.id) return;
    await (supabase as any).from("listing_drafts").delete().eq("user_id", user.id);
    setDraftBanner(null);
  };

  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  // Debounced auto-save (2s after last change).
  useEffect(() => {
    if (!user?.id || !draftLoaded) return;
    const t = setTimeout(async () => {
      const form_json = {
        category, title, description, price, negotiable, priceHidden,
        registrationStatus, region, province, city, barangay, lat, lng,
        condition, phone, phoneIso, phoneNational,
        year, make, model, mileage, transmission, fuel, engine, categoryAttrs,
      };
      const { error } = await (supabase as any)
        .from("listing_drafts")
        .upsert({ user_id: user.id, category_slug: category, form_json }, { onConflict: "user_id" });
      if (!error) setDraftSavedAt(new Date());
    }, 2000);
    return () => clearTimeout(t);
  }, [
    user?.id, draftLoaded, category, title, description, price, negotiable, priceHidden,
    registrationStatus, region, province, city, barangay, lat, lng, condition,
    phone, phoneIso, phoneNational, year, make, model, mileage, transmission, fuel, engine, categoryAttrs,
  ]);


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
    const startIndex = photos.length;
    setPhotos((p) => [...p, ...accepted].slice(0, maxPhotos));
    setPhotoUploads((u) =>
      [...u, ...accepted.map(() => ({ status: "idle" as const, percent: 0 }))].slice(0, maxPhotos),
    );
    e.target.value = "";
    // Kick off eager uploads to a per-user draft path so progress is visible immediately.
    if (user) {
      accepted.forEach((file, offset) => {
        void uploadOnePhoto(startIndex + offset, file, null);
      });
    }
  };

  const removePhoto = (i: number) => {
    if (photoUploads[i]?.status === "uploading") return;
    const file = photos[i];
    if (file) releaseFileUrl(file);
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
    const startIndex = videos.length;
    setVideos((v) => [...v, ...accepted].slice(0, maxVideos));
    setVideoUploads((u) =>
      [...u, ...accepted.map(() => ({ status: "idle" as const, percent: 0 }))].slice(0, maxVideos),
    );
    setVideoThumbs((t) => [...t, ...accepted.map(() => null)].slice(0, maxVideos));
    e.target.value = "";

    // Generate thumbnails immediately (client-side) so the user sees a preview.
    accepted.forEach((file, offset) => {
      const idx = startIndex + offset;
      extractVideoThumbnail(file)
        .then((thumb) => {
          setVideoThumbs((t) => {
            const next = t.slice();
            next[idx] = { dataUrl: thumb.dataUrl, duration: thumb.durationSec };
            return next;
          });
        })
        .catch(() => {
          /* thumbnail is best-effort */
        });
    });

    // Kick off eager uploads to a per-user draft path so progress shows immediately.
    if (user) {
      accepted.forEach((file, offset) => {
        void uploadOneVideo(startIndex + offset, file, null);
      });
    }
  };

  const removeVideo = (i: number) => {
    if (videoUploads[i]?.status === "uploading") return;
    const file = videos[i];
    if (file) releaseFileUrl(file);
    setVideos((v) => v.filter((_, idx) => idx !== i));
    setVideoUploads((u) => u.filter((_, idx) => idx !== i));
    setVideoThumbs((t) => t.filter((_, idx) => idx !== i));
  };

  const setPhotoState = (i: number, patch: Partial<UploadState>) => {
    setPhotoUploads((u) => u.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  };

  const uploadOnePhoto = async (i: number, file: File, lid: string | null) => {
    setPhotoState(i, { status: "uploading", percent: 0, error: undefined });
    try {
      const scope = lid ?? "_draft";
      const path = `${user!.id}/${scope}/${Date.now()}-${i}-${file.name}`;
      const { publicUrl } = await uploadWithRetry({
        bucket: "listing-photos",
        path,
        file,
        contentType: file.type || "image/jpeg",
        onProgress: (e) => setPhotoState(i, { percent: e.percent }),
      });
      setPhotoState(i, { status: "done", percent: 100, url: publicUrl, path });
      if (lid) {
        await supabase.from("listing_media").insert({
          listing_id: lid,
          type: "photo",
          url: publicUrl,
          storage_path: path,
          sort_order: i,
        });
      }
      return true;
    } catch (err: any) {
      setPhotoState(i, { status: "error", error: err?.message ?? "Upload failed" });
      return false;
    }
  };

  const setVideoState = (i: number, patch: Partial<UploadState>) => {
    setVideoUploads((u) => u.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  };

  const uploadOneVideo = async (i: number, file: File, lid: string | null) => {
    setVideoState(i, { status: "uploading", percent: 0, error: undefined });
    try {
      const scope = lid ?? "_draft";
      const path = `${user!.id}/${scope}/${Date.now()}-${i}-${file.name}`;
      const { publicUrl } = await uploadWithRetry({
        bucket: "listing-videos",
        path,
        file,
        contentType: file.type || "video/mp4",
        onProgress: (e) => setVideoState(i, { percent: e.percent }),
      });
      setVideoState(i, { status: "done", percent: 100, url: publicUrl, path });
      if (lid) {
        await supabase.from("listing_media").insert({
          listing_id: lid,
          type: "video",
          url: publicUrl,
          storage_path: path,
          sort_order: i,
        });
      }
      return true;
    } catch (err: any) {
      setVideoState(i, { status: "error", error: err?.message ?? "Upload failed" });
      return false;
    }
  };

  const retryPhoto = async (i: number) => {
    if (!photos[i]) return;
    await uploadOnePhoto(i, photos[i], listingId);
  };

  const retryVideo = async (i: number) => {
    if (!videos[i]) return;
    await uploadOneVideo(i, videos[i], listingId);
  };

  const attachUploadedMedia = async (
    lid: string,
    media: { type: "photo" | "video"; url: string; path: string; sortOrder: number },
  ) => {
    const { data: existing, error: lookupError } = await supabase
      .from("listing_media")
      .select("id")
      .eq("listing_id", lid)
      .eq("storage_path", media.path)
      .maybeSingle();
    if (lookupError) return { error: lookupError };
    if (existing) return { error: null };
    const { error } = await supabase.from("listing_media").insert({
      listing_id: lid,
      type: media.type,
      url: media.url,
      storage_path: media.path,
      sort_order: media.sortOrder,
    });
    return { error };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitInFlightRef.current) return;
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

    submitInFlightRef.current = true;
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
        if (showMapPin && lat != null && lng != null) attributes.show_map_pin = true;
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

        if (error || !listing) {
          console.error("[sell] listings.insert failed", error);
          const parts = [
            error?.message,
            (error as any)?.details,
            (error as any)?.hint,
          ].filter(Boolean);
          const code = (error as any)?.code;
          const codeHint =
            code === "23502"
              ? "A required field is missing."
              : code === "23514"
                ? "A field value isn't allowed by our checks."
                : code === "42501"
                  ? "Your account isn't allowed to publish this listing. Please sign in again."
                  : code === "23505"
                    ? "A duplicate listing was detected."
                    : null;
          throw new Error(
            [codeHint, parts.join(" — ")].filter(Boolean).join(" ") ||
              "Couldn't save your listing. Please try again.",
          );
        }
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

      // Any items already uploaded eagerly to the draft path just need their
      // listing_media row inserted now that we have a listing id.
      const failedFiles: string[] = [];
      let planLimitHit: null | { kind: "photo" | "video"; message: string } = null;
      const captureLimit = (kind: "photo" | "video", err: any) => {
        if (err?.code === "23514" && /limit reached/i.test(err.message ?? "")) {
          planLimitHit = { kind, message: err.message };
          return true;
        }
        return false;
      };
      for (let i = 0; i < photos.length; i++) {
        const state = photoUploads[i];
        if (state?.status === "done" && state.url && state.path) {
          const { error: mErr } = await attachUploadedMedia(lid, {
            type: "photo",
            url: state.url,
            path: state.path,
            sortOrder: i,
          });
          if (mErr) {
            console.error("[sell] listing_media insert (photo) failed", mErr);
            captureLimit("photo", mErr);
            failedFiles.push(photos[i].name);
          }
          continue;
        }
        const ok = await uploadOnePhoto(i, photos[i], lid);
        if (!ok) failedFiles.push(photos[i].name);
      }
      for (let i = 0; i < videos.length; i++) {
        const state = videoUploads[i];
        if (state?.status === "done" && state.url && state.path) {
          const { error: mErr } = await attachUploadedMedia(lid, {
            type: "video",
            url: state.url,
            path: state.path,
            sortOrder: i,
          });
          if (mErr) {
            console.error("[sell] listing_media insert (video) failed", mErr);
            captureLimit("video", mErr);
            failedFiles.push(videos[i].name);
          }
          continue;
        }
        const ok = await uploadOneVideo(i, videos[i], lid);
        if (!ok) failedFiles.push(videos[i].name);
      }

      if (planLimitHit) {
        toast.error(
          `${(planLimitHit as any).kind === "photo" ? "Photo" : "Video"} limit reached on your current plan`,
          { description: `${(planLimitHit as any).message} Upgrade your plan to attach more.` },
        );
        return;
      }
      if (failedFiles.length > 0) {
        toast.error(
          `Couldn't attach ${failedFiles.length} file${failedFiles.length === 1 ? "" : "s"}: ${failedFiles
            .slice(0, 3)
            .join(", ")}${failedFiles.length > 3 ? "…" : ""}. Retry from the Photos step.`,
        );
        return;
      }


      // Publish succeeded — clear the safe draft so we don't re-offer it.
      try {
        await (supabase as any).from("listing_drafts").delete().eq("user_id", user.id);
      } catch { /* best-effort */ }

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
      console.error("[sell] publish failed", err);
      toast.error(err?.message ?? "Failed to publish listing");
    } finally {
      submitInFlightRef.current = false;
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
      <div className="sell-compact container mx-auto max-w-6xl xl:max-w-[88rem] px-2 py-2 pb-24 sm:px-3 sm:py-3 md:pb-6">
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

        {draftBanner && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
              <div>
                <div className="font-semibold">You have a saved draft</div>
                <div className="text-xs text-muted-foreground">
                  Last edited {new Date(draftBanner.updated_at).toLocaleString()}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                type="button"
                onClick={() => { applyDraft(draftBanner.form); setDraftBanner(null); }}
              >
                Resume draft
              </Button>
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={() => { void discardDraft(); }}
              >
                Discard
              </Button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-3 space-y-2">
          {(() => {
            const TABS = [
              { key: "details", label: "Details" },
              { key: "location", label: "Location & Seller" },
              { key: "plan", label: "Plan & Boost" },
              { key: "media", label: "Photos" },
            ] as const;
            const idx = TABS.findIndex((t) => t.key === activeTab);
            return (
              <div className="sticky top-14 z-20 -mx-3 sm:mx-0 bg-background/95 backdrop-blur border-b border-border sm:rounded-lg sm:border sm:bg-card">
                <div className="flex overflow-x-auto no-scrollbar px-1 pt-0.5 gap-0.5">
                  {TABS.map((t, i) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setActiveTab(t.key)}
                      className={`whitespace-nowrap rounded px-2 py-1 text-[11px] leading-none font-medium transition ${
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
                <Progress value={((idx + 1) / TABS.length) * 100} className="h-0.5 rounded-none" />
                <div className="px-2 py-1 text-[10px] text-muted-foreground flex items-center gap-1">
                  <span className={draftSavedAt ? "text-emerald-600" : ""}>●</span>
                  {draftSavedAt
                    ? `Draft auto-saved · ${draftSavedAt.toLocaleTimeString()}`
                    : "Draft auto-saves as you type"}
                </div>
              </div>

            );
          })()}

          <section data-tab="details" className={`space-y-2 rounded-xl border border-border bg-card p-2.5 sm:p-3 ${activeTab === "details" ? "" : "hidden"}`}>


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
            <SellGroup id="listing" title="Listing" defaultOpen>
              <div>
                <Label htmlFor="title" className="text-[11px]">
                  Title <span className="text-orange-500">*</span>
                </Label>
                <Input
                  id="title"
                  required
                  className={`h-8 text-sm ${mandatoryFieldClass(title.trim().length > 0)}`}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="2019 Toyota Vios 1.3 E AT"
                />
              </div>

              {/* VIN / chassis — moved here, right under Title */}
              {(category === "car" || category === "motorcycle") && (
                <div>
                  <Label className="text-[11px]">VIN / chassis</Label>
                  <div className="flex gap-2">
                    <Input
                      className="h-8 text-sm"
                      placeholder="17-char VIN or 11–16-char chassis # (Asia / Europe)"
                      value={vehicleQuality.vin_chassis ?? ""}
                      maxLength={17}
                      aria-invalid={vinState.kind === "error"}
                      aria-describedby="vin-help vin-msg"
                      onChange={(e) => {
                        const v = e.target.value.toUpperCase().replace(/\s+/g, "");
                        setVehicleQuality((prev) => ({ ...prev, vin_chassis: v }));
                        if (vinState.kind !== "idle") setVinState({ kind: "idle" });
                        if (vinConflicts.length) setVinConflicts([]);
                      }}
                       onBlur={async (e) => {
                         const raw = normalizeVin(e.target.value);
                         await runVinDecode(raw);
                       }}
                       onKeyDown={async (e) => {
                         if (e.key === "Enter") {
                           e.preventDefault();
                           const raw = normalizeVin((e.target as HTMLInputElement).value);
                           await runVinDecode(raw);
                         }
                       }}
                    />
                    <VinScanDialog
                      onResult={(r) => {
                        setVinState({ kind: "ok" });
                        applyVinDecode(r);
                      }}
                    />
                  </div>
                  {(() => {
                    const raw = normalizeVin(vehicleQuality.vin_chassis ?? "");
                    const fmt = checkVinFormat(raw);
                    const len = raw.length;
                    const chip = (ok: boolean | "warn", text: string) => (
                      <span
                        className={
                          "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] " +
                          (ok === true
                            ? "border-emerald-400/60 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : ok === "warn"
                            ? "border-amber-400/60 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                            : "border-muted bg-muted/40 text-muted-foreground")
                        }
                      >
                        {text}
                      </span>
                    );
                    const charsOk = len > 0 && !/[IOQ]/.test(raw) && /^[A-Z0-9]*$/.test(raw);
                    const lengthOk = len >= 11 && len <= 17;
                    const checksumState: boolean | "warn" =
                      len === 17 ? (fmt.kind === "ok_vin" ? true : "warn") : false;
                    return (
                      <div id="vin-help" className="mt-1 flex flex-wrap items-center gap-1">
                        {chip(charsOk, charsOk ? "Format ✓" : "Format: A–Z, 0–9 only (no I/O/Q)")}
                        {chip(
                          lengthOk,
                          lengthOk
                            ? len === 17
                              ? "Length ✓ 17 (VIN)"
                              : `Length ✓ ${len} (chassis)`
                            : `Length ${len}/11–17`,
                        )}
                        {len === 17 &&
                          chip(
                            checksumState,
                            checksumState === true ? "Checksum ✓" : "Checksum ⚠ (JDM/EU VINs often fail)",
                          )}
                        {fmt.kind === "ok_chassis" &&
                          chip(true, "Chassis # — decoder skipped, fill fields manually")}
                      </div>
                    );
                  })()}

                  {vinState.kind === "checking" && (
                    <p id="vin-msg" className="mt-0.5 text-[11px] text-muted-foreground">Decoding VIN…</p>
                  )}
                  {vinState.kind === "ok" && (
                    <p id="vin-msg" className="mt-0.5 text-[11px] text-emerald-600">VIN decoded — blank fields filled in.</p>
                  )}
                  {vinState.kind === "chassis" && (
                    <p id="vin-msg" className="mt-0.5 text-[11px] text-muted-foreground flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {vinState.message}
                    </p>
                  )}
                  {vinState.kind === "warn" && (
                    <p id="vin-msg" className="mt-0.5 text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {vinState.message}
                    </p>
                  )}
                  {vinState.kind === "error" && (
                    <p id="vin-msg" className="mt-0.5 text-[11px] text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>{vinState.message}</span>
                      {vinState.retryable && (
                        <button
                          type="button"
                          className="ml-1 rounded border border-destructive/60 px-1.5 py-0.5 text-[10px] hover:bg-destructive/10"
                          onClick={() => runVinDecode(normalizeVin(vehicleQuality.vin_chassis ?? ""))}
                        >
                          Retry decode
                        </button>
                      )}
                    </p>
                  )}
                  {vinState.kind === "idle" && vehicleQualityIssues.find((i) => i.field === "vin_chassis") && (
                    <p className="mt-0.5 text-[11px] text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {vehicleQualityIssues.find((i) => i.field === "vin_chassis")?.message}
                    </p>
                  )}
                  {vinConflicts.length > 0 && (
                    <div className="mt-1.5 rounded-md border border-amber-400/60 bg-amber-50 p-2 text-[11px] text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 font-medium">
                          <AlertCircle className="h-3 w-3" />
                          VIN doesn't match {vinConflicts.length} field{vinConflicts.length > 1 ? "s" : ""} you already entered
                        </div>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            className="rounded border border-amber-500/60 px-1.5 py-0.5 text-[10px] font-medium hover:bg-amber-100 dark:hover:bg-amber-900/40"
                            onClick={() => {
                              vinConflicts.forEach((c) => c.apply());
                              setVinConflicts([]);
                            }}
                          >
                            Use VIN for all
                          </button>
                          <button
                            type="button"
                            className="rounded border border-amber-500/60 px-1.5 py-0.5 text-[10px] hover:bg-amber-100 dark:hover:bg-amber-900/40"
                            onClick={() => setVinConflicts([])}
                          >
                            Keep mine
                          </button>
                        </div>
                      </div>
                      <ul className="mt-1 space-y-0.5">
                        {vinConflicts.map((c) => (
                          <li key={c.field} className="flex items-center justify-between gap-2">
                            <span>
                              <span className="font-medium">{c.label}:</span>{" "}
                              <span className="line-through opacity-70">{c.current || "—"}</span>{" "}
                              → <span className="font-medium">{c.decoded}</span>
                            </span>
                            {c.field.startsWith("title_") ? (
                              <span className="text-[10px] opacity-70">review title</span>
                            ) : (
                              <button
                                type="button"
                                className="rounded border border-amber-500/60 px-1.5 py-0.5 text-[10px] hover:bg-amber-100 dark:hover:bg-amber-900/40"
                                onClick={() => {
                                  c.apply();
                                  setVinConflicts((prev) => prev.filter((x) => x.field !== c.field));
                                }}
                              >
                                Use VIN
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}


              <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
                <div>
                  <Label className="text-[11px]">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="h-8 w-full text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="min-w-[14rem]">
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.slug} value={c.slug}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[11px]">Condition</Label>
                  <Select value={condition} onValueChange={setCondition}>
                    <SelectTrigger className="h-8 w-full text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Brand new">Brand new</SelectItem>
                      <SelectItem value="Used">Used</SelectItem>
                      <SelectItem value="For parts">For parts</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* Registration status is captured via OR/CR under the vehicle
                    details filters below to avoid duplicate OR/CR fields. */}
                <div>
                  <Label className="text-[11px]">Seller</Label>
                  <div
                    className="flex h-8 items-center rounded-md border border-dashed border-border bg-muted/30 px-2"
                    title="Auto-detected from your profile — shown beside your avatar on the listing."
                  >
                    <span className="inline-flex h-5 items-center rounded-full bg-primary/10 px-2 text-[11px] font-medium text-primary">
                      {sellerType === "business" ? "Business" : "Private"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Vehicle year / make / model / engine (car & motorcycle) */}
              {(category === "car" || category === "motorcycle") && (
                <>
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
                  <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                    <div>
                      <Label className="text-[11px]">Trim / variant</Label>
                      <Input
                        className="h-8 text-sm"
                        value={(categoryAttrs.variant as string) ?? ""}
                        onChange={(e) =>
                          setCategoryAttrs((prev) => ({ ...prev, variant: e.target.value }))
                        }
                        placeholder="e.g. E, G, Sport"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px]">Color</Label>
                      <Input
                        className="h-8 text-sm"
                        value={(categoryAttrs.exterior_color as string) ?? ""}
                        onChange={(e) =>
                          setCategoryAttrs((prev) => ({ ...prev, exterior_color: e.target.value }))
                        }
                        placeholder="e.g. Pearl White"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px]">
                        Mileage (km) <span className="text-orange-500">*</span>
                      </Label>
                      <NumericInput
                        className={`h-8 text-sm ${mandatoryFieldClass(mileage.trim().length > 0)}`}
                        value={mileage}
                        onChange={setMileage}
                        placeholder="e.g. 135,000"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px]">Transmission</Label>
                      <Select value={transmission} onValueChange={setTransmission}>
                        <SelectTrigger className="h-8 w-full text-xs">
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
                      <Label className="text-[11px]">Fuel</Label>
                      <Select value={fuel} onValueChange={setFuel}>
                        <SelectTrigger className="h-8 w-full text-xs">
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
                  {/* Category-specific attributes (Body type, Drivetrain, Owner status, OR/CR, etc.)
                      live right here alongside Year/Make/Model instead of a separate "Car details" section. */}
                  {isAttrCategory(category) && (
                    <div className="mt-2 rounded-md border border-dashed border-border/70 bg-muted/20 p-2">
                      <CategoryAttributesEditor
                        category={category}
                        value={categoryAttrs}
                        onChange={setCategoryAttrs}
                      />
                    </div>
                  )}
                </>
              )}
            </SellGroup>


            {/* PRICE */}
            <SellGroup id="price" title="Price" defaultOpen>
              <div className="grid gap-2 sm:grid-cols-[200px_1fr] items-end">
                <div>
                  <Label htmlFor="price" className="text-xs">
                    Asking price (₱) <span className="text-orange-500">*</span>
                  </Label>
                  <NumericInput
                    id="price"
                    className={`h-9 text-sm ${mandatoryFieldClass(price.trim().length > 0)}`}
                    value={price}
                    onChange={setPrice}
                    placeholder="e.g. 2,250,000"
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
            </SellGroup>

            {/* Vehicle group merged into Listing above */}


            {/* CATEGORY DETAILS — service tags + category-specific block */}
            {(SERVICE_CATEGORIES.has(category) ||
              category === "repair" || category === "bodyshop" || category === "salvage" ||
              category === "carwash" || category === "parts" || category === "used_part" ||
              category === "drone" || category === "towing" ||
              !(category === "car" || category === "motorcycle")) && (
              <SellGroup
                id="category-details"
                title={SERVICE_CATEGORIES.has(category) ? "What you offer" : "Category details"}
                defaultOpen
              >
                {SERVICE_CATEGORIES.has(category) && (
                  <div className="space-y-1">
                    <p className="text-[11px] text-muted-foreground">
                      Pick everything that applies. These tags help buyers find your service.
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
              </SellGroup>
            )}

            {/* CONDITION & QUALITY (car / motorcycle) */}
            {(category === "car" || category === "motorcycle") && (
              <SellGroup id="quality" title="Condition & quality">
                <VehicleQualityFields
                  category={category as "car" | "motorcycle"}
                  value={vehicleQuality}
                  onChange={setVehicleQuality}
                  issues={vehicleQualityIssues}
                />
              </SellGroup>
            )}

            {/* FILTERS — category attributes for non-vehicle categories.
                Car & motorcycle attributes are shown inline in the Listing section above. */}
            {isAttrCategory(category) && category !== "car" && category !== "motorcycle" && (
              <SellGroup id="filters" title={`${CATEGORY_LABEL_MAP[category] ?? "Details"} details`}>
                <p className="text-[11px] text-muted-foreground">
                  These attributes help buyers find your listing in search.
                </p>
                <CategoryAttributesEditor
                  category={category}
                  value={categoryAttrs}
                  onChange={setCategoryAttrs}
                />
              </SellGroup>
            )}

            {/* DESCRIPTION */}
            <SellGroup id="description" title="Description">
              <Textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell buyers what makes this listing stand out…"
              />
            </SellGroup>
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
                <>
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
                        setShowMapPin(false);
                      }}
                    >
                      Clear pin
                    </button>
                  </div>
                  <label className="mt-1 flex items-start gap-2 rounded-md border border-border bg-muted/40 p-2 text-[12px]">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={showMapPin}
                      onChange={(e) => setShowMapPin(e.target.checked)}
                    />
                    <span>
                      Show an approximate-location map on my listing (a ~400m circle,
                      not your exact address). Similar to Facebook Marketplace.
                    </span>
                  </label>
                </>
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

          <section data-tab="plan" className={`rounded-xl border border-border border-t-0 bg-card -mt-2 pt-1 ${activeTab === "plan" ? "" : "hidden"}`}>
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
                      key={`${i}-${file.name}-${file.size}-${file.lastModified}`}
                      className="relative aspect-square overflow-hidden rounded-md bg-secondary"
                    >
                      <img
                        src={fileUrl(file)}
                        alt={`Listing photo ${i + 1} preview`}
                        className="h-full w-full object-cover"
                      />
                      {u.status !== "done" && u.status !== "uploading" && (
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
                    const thumb = videoThumbs[i];
                    return (
                      <li key={`${i}-${file.name}-${file.size}-${file.lastModified}`} className="flex gap-2">
                        <div className="relative h-16 w-24 flex-shrink-0 overflow-hidden rounded bg-muted">
                          {thumb ? (
                            <>
                              <img
                                src={thumb.dataUrl}
                                alt={`${file.name} preview`}
                                className="h-full w-full object-cover"
                              />
                              <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 text-[10px] font-medium text-white">
                                {formatDuration(thumb.duration)}
                              </span>
                            </>
                          ) : (
                            <div className="relative h-full w-full bg-black">
                              <video
                                src={fileUrl(file)}
                                className="h-full w-full object-cover opacity-80"
                                muted
                                preload="metadata"
                              />
                              <span className="absolute inset-0 flex items-center justify-center text-white">
                                <VideoIcon className="h-5 w-5" />
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 space-y-1">
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
                        </div>
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
            const anyUploading =
              photoUploads.some((u) => u.status === "uploading") ||
              videoUploads.some((u) => u.status === "uploading");
            const mediaIssues = [
              photos.length === 0 && "at least 1 photo",
              anyUploading && "wait for uploads to finish",
            ].filter(Boolean) as string[];
            const stepIssues: Record<(typeof order)[number], string[]> = {
              details: detailsIssues,
              location: [!region && "region", !city && "city"].filter(Boolean) as string[],
              plan: [],
              media: mediaIssues,
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
                  {issues.length > 0 && (
                    <div className="text-[11px] text-amber-700">
                      {isLast ? "Missing: " : "Add: "}{issues.join(", ")}{isLast ? "" : " to continue"}
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
