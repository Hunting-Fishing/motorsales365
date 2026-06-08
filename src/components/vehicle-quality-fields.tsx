import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { z } from "zod";
import { vinChecksumValid } from "@/components/vin-scan-dialog";

export type VehicleQuality = {
  variant?: string;
  color?: string;
  plate_ending?: string;
  plate_status?: string; // moto
  registered_owner_status?: string;
  orcr_status?: string;
  last_registration_date?: string;
  registration_expiry?: string; // moto
  flood_history?: string;
  accident_history?: string;
  modifications?: string; // moto
  vin_chassis?: string;
  financing_available?: boolean;
  trade_accepted?: boolean;
  price_negotiable?: boolean;
};

export const VEHICLE_QUALITY_KEYS: (keyof VehicleQuality)[] = [
  "variant",
  "color",
  "plate_ending",
  "plate_status",
  "registered_owner_status",
  "orcr_status",
  "last_registration_date",
  "registration_expiry",
  "flood_history",
  "accident_history",
  "modifications",
  "vin_chassis",
  "financing_available",
  "trade_accepted",
  "price_negotiable",
];

// -----------------------------
// Validation
// -----------------------------

const OWNER_OPTIONS = [
  "1st owner",
  "2nd owner",
  "3rd owner or later",
  "Casa-maintained",
  "Unknown",
];
const ORCR_OPTIONS = [
  "Complete (OR + CR, owner's name)",
  "Complete (OR + CR, open deed of sale)",
  "OR only",
  "CR only",
  "No documents (project / parts)",
  "Lost — affidavit ready",
  "Encumbered / financed",
];
const PLATE_STATUS_OPTIONS = [
  "Updated plate",
  "Improvised / temporary",
  "Conduction sticker only",
  "Missing",
];
const HISTORY_OPTIONS = ["No", "Yes — disclosed below", "Unknown"];

const todayISO = () => new Date().toISOString().slice(0, 10);

// VIN excludes I, O, Q; allow 11–17 chars to accommodate older motos.
const VIN_REGEX = /^[A-HJ-NPR-Z0-9]{11,17}$/i;

export const VehicleQualitySchema = z
  .object({
    variant: z.string().trim().max(80, "Variant must be 80 characters or fewer").optional(),
    color: z.string().trim().max(40, "Color must be 40 characters or fewer").optional(),
    plate_ending: z
      .string()
      .trim()
      .regex(/^[0-9]$/, "Plate ending must be a single digit 0–9")
      .optional()
      .or(z.literal("")),
    plate_status: z.string().optional(),
    registered_owner_status: z.string().optional(),
    orcr_status: z.string().optional(),
    last_registration_date: z
      .string()
      .optional()
      .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Invalid date")
      .refine((v) => !v || v <= todayISO(), "Last registration date can't be in the future")
      .refine(
        (v) => !v || v >= "2000-01-01",
        "Last registration date looks too old — double-check the year",
      ),
    registration_expiry: z
      .string()
      .optional()
      .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Invalid date"),
    flood_history: z.string().optional(),
    accident_history: z.string().optional(),
    modifications: z
      .string()
      .trim()
      .max(500, "Modifications must be 500 characters or fewer")
      .optional(),
    vin_chassis: z
      .string()
      .trim()
      .optional()
      .refine(
        (v) => !v || VIN_REGEX.test(v),
        "VIN/chassis must be 11–17 letters/numbers (no I, O, or Q)",
      ),
    financing_available: z.boolean().optional(),
    trade_accepted: z.boolean().optional(),
    price_negotiable: z.boolean().optional(),
  })
  .refine(
    (v) =>
      !v.plate_status || PLATE_STATUS_OPTIONS.includes(v.plate_status),
    { path: ["plate_status"], message: "Choose a plate status from the list" },
  )
  .refine(
    (v) =>
      !v.registered_owner_status ||
      OWNER_OPTIONS.includes(v.registered_owner_status),
    { path: ["registered_owner_status"], message: "Choose an owner status from the list" },
  )
  .refine(
    (v) => !v.orcr_status || ORCR_OPTIONS.includes(v.orcr_status),
    { path: ["orcr_status"], message: "Choose an OR/CR status from the list" },
  )
  .refine(
    (v) => !v.flood_history || HISTORY_OPTIONS.includes(v.flood_history),
    { path: ["flood_history"], message: "Choose a flood history option" },
  )
  .refine(
    (v) => !v.accident_history || HISTORY_OPTIONS.includes(v.accident_history),
    { path: ["accident_history"], message: "Choose an accident history option" },
  );

export type VehicleQualityIssue = { field: keyof VehicleQuality | "_"; message: string };

export function validateVehicleQuality(
  v: VehicleQuality,
): { ok: true } | { ok: false; issues: VehicleQualityIssue[] } {
  const parsed = VehicleQualitySchema.safeParse(v);
  if (parsed.success) return { ok: true };
  const issues: VehicleQualityIssue[] = parsed.error.issues.map((i) => ({
    field: (i.path[0] as keyof VehicleQuality) ?? "_",
    message: i.message,
  }));
  return { ok: false, issues };
}

// Fields we recommend every car/motorcycle listing fills in.
const RECOMMENDED_CAR: (keyof VehicleQuality)[] = [
  "variant",
  "color",
  "registered_owner_status",
  "orcr_status",
  "last_registration_date",
  "flood_history",
  "accident_history",
];
const RECOMMENDED_MOTO: (keyof VehicleQuality)[] = [
  "color",
  "registered_owner_status",
  "orcr_status",
  "plate_status",
  "registration_expiry",
  "accident_history",
];

const FIELD_LABELS: Record<keyof VehicleQuality, string> = {
  variant: "Variant / trim",
  color: "Color",
  plate_ending: "Plate ending",
  plate_status: "Plate status",
  registered_owner_status: "Registered owner status",
  orcr_status: "OR/CR status",
  last_registration_date: "Last registration date",
  registration_expiry: "Registration expiry",
  flood_history: "Flood history",
  accident_history: "Accident history",
  modifications: "Modifications",
  vin_chassis: "VIN / chassis",
  financing_available: "Financing available",
  trade_accepted: "Trade-in accepted",
  price_negotiable: "Price negotiable",
};

function isFilled(v: VehicleQuality, k: keyof VehicleQuality) {
  const val = v[k];
  if (typeof val === "boolean") return true; // checkboxes are always "answered"
  return val !== undefined && val !== null && String(val).trim() !== "";
}

export function vehicleQualityCompleteness(
  category: "car" | "motorcycle",
  v: VehicleQuality,
) {
  const recommended = category === "car" ? RECOMMENDED_CAR : RECOMMENDED_MOTO;
  const filled = recommended.filter((k) => isFilled(v, k));
  const missing = recommended.filter((k) => !isFilled(v, k));
  return {
    percent: Math.round((filled.length / recommended.length) * 100),
    filled: filled.length,
    total: recommended.length,
    missing: missing.map((k) => FIELD_LABELS[k]),
  };
}

export function hydrateVehicleQuality(attrs: Record<string, any> | null | undefined): VehicleQuality {
  const a = attrs ?? {};
  const out: VehicleQuality = {};
  for (const k of VEHICLE_QUALITY_KEYS) {
    if (a[k] !== undefined && a[k] !== null && a[k] !== "") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (out as any)[k] = a[k];
    }
  }
  return out;
}

export function vehicleQualityToAttributes(v: VehicleQuality): Record<string, any> {
  const out: Record<string, any> = {};
  for (const k of VEHICLE_QUALITY_KEYS) {
    const val = v[k];
    if (typeof val === "boolean") {
      if (val) out[k] = true;
    } else if (val !== undefined && val !== null && String(val).trim() !== "") {
      out[k] = String(val).trim();
    }
  }
  return out;
}

// -----------------------------
// UI
// -----------------------------

type Props = {
  category: "car" | "motorcycle";
  value: VehicleQuality;
  onChange: (next: VehicleQuality) => void;
  /** Show per-field errors after a failed submit. Pass the issues array from validateVehicleQuality. */
  issues?: VehicleQualityIssue[];
};

export function VehicleQualityFields({ category, value, onChange, issues = [] }: Props) {
  const set = <K extends keyof VehicleQuality>(k: K, v: VehicleQuality[K]) =>
    onChange({ ...value, [k]: v });

  const errFor = (field: keyof VehicleQuality) =>
    issues.find((i) => i.field === field)?.message;

  const completeness = vehicleQualityCompleteness(category, value);

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card/40 p-4">
      <div>
        <h3 className="font-display text-base font-semibold">Vehicle details & documents</h3>
        <p className="text-xs text-muted-foreground">
          Honest disclosure builds buyer trust and reduces back-and-forth.
        </p>
      </div>

      {/* Completeness meter */}
      <div className="rounded-lg border border-border/60 bg-background/40 p-3">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 font-medium">
            {completeness.percent === 100 ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
            )}
            Profile completeness
          </span>
          <span className="text-muted-foreground">
            {completeness.filled}/{completeness.total} recommended fields
          </span>
        </div>
        <Progress value={completeness.percent} className="h-1.5" />
        {completeness.missing.length > 0 && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Recommended next:{" "}
            <span className="text-foreground/80">{completeness.missing.join(" · ")}</span>
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldShell label="Variant / trim" error={errFor("variant")}>
          <Input
            placeholder={category === "car" ? "e.g. 1.3 E AT" : "e.g. Standard / Premium"}
            value={value.variant ?? ""}
            maxLength={80}
            onChange={(e) => set("variant", e.target.value)}
          />
        </FieldShell>
        <FieldShell label="Color" error={errFor("color")}>
          <Input
            placeholder="e.g. Pearl White"
            value={value.color ?? ""}
            maxLength={40}
            onChange={(e) => set("color", e.target.value)}
          />
        </FieldShell>

        <FieldShell label="Plate ending (coding day)" error={errFor("plate_ending")}>
          <Input
            placeholder="0–9"
            inputMode="numeric"
            maxLength={1}
            value={value.plate_ending ?? ""}
            onChange={(e) => set("plate_ending", e.target.value.replace(/[^0-9]/g, ""))}
          />
        </FieldShell>
        {category === "motorcycle" && (
          <FieldShell label="Plate status" error={errFor("plate_status")}>
            <Select
              value={value.plate_status ?? ""}
              onValueChange={(v) => set("plate_status", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {PLATE_STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldShell>
        )}

        <FieldShell label="Registered owner status" error={errFor("registered_owner_status")}>
          <Select
            value={value.registered_owner_status ?? ""}
            onValueChange={(v) => set("registered_owner_status", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {OWNER_OPTIONS.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldShell>
        <FieldShell label="OR/CR status" error={errFor("orcr_status")}>
          <Select
            value={value.orcr_status ?? ""}
            onValueChange={(v) => set("orcr_status", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {ORCR_OPTIONS.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldShell>

        <FieldShell label="Last registration date" error={errFor("last_registration_date")}>
          <Input
            type="date"
            max={todayISO()}
            value={value.last_registration_date ?? ""}
            onChange={(e) => set("last_registration_date", e.target.value)}
          />
        </FieldShell>
        {category === "motorcycle" ? (
          <FieldShell label="Registration expiry" error={errFor("registration_expiry")}>
            <Input
              type="date"
              value={value.registration_expiry ?? ""}
              onChange={(e) => set("registration_expiry", e.target.value)}
            />
          </FieldShell>
        ) : null}

        <FieldShell label="Flood history" error={errFor("flood_history")}>
          <Select
            value={value.flood_history ?? ""}
            onValueChange={(v) => set("flood_history", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {HISTORY_OPTIONS.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldShell>
        <FieldShell label="Accident history" error={errFor("accident_history")}>
          <Select
            value={value.accident_history ?? ""}
            onValueChange={(v) => set("accident_history", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {HISTORY_OPTIONS.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldShell>

        {category === "motorcycle" && (
          <div className="sm:col-span-2">
            <FieldShell label="Modifications" error={errFor("modifications")}>
              <Textarea
                rows={2}
                placeholder="e.g. Yoshimura exhaust, LED headlight, +2 sprocket"
                value={value.modifications ?? ""}
                maxLength={500}
                onChange={(e) => set("modifications", e.target.value)}
              />
            </FieldShell>
          </div>
        )}

        <div className="sm:col-span-2">
          <FieldShell
            label="VIN / chassis (kept private to buyer on request)"
            error={errFor("vin_chassis")}
            hint="11–17 letters and numbers, no I/O/Q. Shown only when a buyer requests verification."
          >
            <Input
              placeholder="Optional"
              value={value.vin_chassis ?? ""}
              maxLength={17}
              onChange={(e) =>
                set("vin_chassis", e.target.value.toUpperCase().replace(/\s+/g, ""))
              }
            />
          </FieldShell>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 pt-2">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={!!value.price_negotiable}
            onCheckedChange={(v) => set("price_negotiable", v === true)}
          />
          Price is negotiable
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={!!value.financing_available}
            onCheckedChange={(v) => set("financing_available", v === true)}
          />
          Financing available
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={!!value.trade_accepted}
            onCheckedChange={(v) => set("trade_accepted", v === true)}
          />
          Trade-in accepted
        </label>
      </div>
    </div>
  );
}

function FieldShell({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {hint && !error && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
      {error && (
        <p className="mt-1 text-[11px] text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> {error}
        </p>
      )}
    </div>
  );
}
