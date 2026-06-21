import type { ComponentType } from "react";
import {
  Fuel,
  Calendar,
  Car,
  Gauge,
  Cog,
  Settings2,
  CircleDot,
  Palette,
  MapPin,
  FileText,
  ShieldCheck,
  Users,
  Wrench,
  Droplets,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Banknote,
  ClipboardCheck,
  Tag,
  Hash,
  Building2,
  Layers,
  Wind,
  Zap,
  Ruler,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
  fuel: Fuel,
  make: Building2,
  model: Car,
  trim: Layers,
  year: Calendar,
  body_type: Car,
  body: Car,
  drivetrain: Settings2,
  transmission: Cog,
  mileage_km: Gauge,
  mileage: Gauge,
  odometer: Gauge,
  color: Palette,
  exterior_color: Palette,
  interior_color: Palette,
  location: MapPin,
  region: MapPin,
  city: MapPin,
  or_cr_status: FileText,
  orcr: FileText,
  owner_status: Users,
  owners: Users,
  registered_owner: ShieldCheck,
  deed_chain_available: ClipboardCheck,
  inspection_available: ClipboardCheck,
  financing_available: Banknote,
  trade_accepted: Tag,
  flood_history: Droplets,
  accident_history: AlertTriangle,
  engine: Wrench,
  engine_size: Wrench,
  displacement: Ruler,
  cylinders: Hash,
  horsepower: Zap,
  hp: Zap,
  aircon: Wind,
  wheels: CircleDot,
  tires: CircleDot,
  vin: Hash,
  plate: Hash,
  plate_number: Hash,
};

export function getSpecIcon(key: string): ComponentType<{ className?: string }> {
  return ICON_MAP[key.toLowerCase()] ?? Tag;
}

export function formatSpecKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\bkm\b/i, "(km)")
    .replace(/\bor cr\b/i, "OR/CR")
    .replace(/\bvin\b/i, "VIN")
    .replace(/\bhp\b/i, "HP");
}

type Tone = "positive" | "negative" | "neutral" | "warning";

function valueTone(key: string, raw: unknown): Tone {
  if (typeof raw === "boolean") return raw ? "positive" : "negative";
  const v = String(raw).toLowerCase().trim();
  const k = key.toLowerCase();
  if (["yes", "complete", "available", "clean", "clear"].includes(v)) return "positive";
  if (["no", "none", "incomplete", "missing", "unavailable"].includes(v)) {
    // For "no" on accident/flood, that's actually GOOD
    if (k.includes("accident") || k.includes("flood")) return "positive";
    return "negative";
  }
  if (k.includes("accident") || k.includes("flood")) {
    if (v && v !== "0") return "warning";
  }
  return "neutral";
}

export function SpecValuePill({
  specKey,
  value,
}: {
  specKey: string;
  value: unknown;
}) {
  const display =
    Array.isArray(value)
      ? value.join(", ")
      : typeof value === "boolean"
        ? value
          ? "Yes"
          : "No"
        : String(value);

  const tone = valueTone(specKey, value);

  if (tone === "neutral") {
    return <span className="text-sm font-semibold text-foreground">{display}</span>;
  }

  const toneClasses: Record<Exclude<Tone, "neutral">, string> = {
    positive:
      "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-950/40 dark:text-emerald-200",
    negative:
      "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-700/60 dark:bg-rose-950/40 dark:text-rose-200",
    warning:
      "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100",
  };

  const Icon = tone === "positive" ? CheckCircle2 : tone === "negative" ? XCircle : AlertTriangle;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold",
        toneClasses[tone],
      )}
    >
      <Icon className="h-3 w-3" />
      {display}
    </span>
  );
}

export function SpecRow({ specKey, value }: { specKey: string; value: unknown }) {
  const Icon = getSpecIcon(specKey);
  return (
    <div className="flex min-w-0 items-center justify-between gap-2 rounded-md border border-border/40 bg-muted/30 px-2.5 py-1.5">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="h-3.5 w-3.5 shrink-0 text-primary/70" />
        <span className="truncate text-xs capitalize text-muted-foreground">
          {formatSpecKey(specKey)}
        </span>
      </div>
      <SpecValuePill specKey={specKey} value={value} />
    </div>
  );
}
