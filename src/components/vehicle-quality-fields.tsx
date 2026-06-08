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

type Props = {
  category: "car" | "motorcycle";
  value: VehicleQuality;
  onChange: (next: VehicleQuality) => void;
};

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

export function VehicleQualityFields({ category, value, onChange }: Props) {
  const set = <K extends keyof VehicleQuality>(k: K, v: VehicleQuality[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card/40 p-4">
      <div>
        <h3 className="font-display text-base font-semibold">Vehicle details & documents</h3>
        <p className="text-xs text-muted-foreground">
          Honest disclosure builds buyer trust and reduces back-and-forth.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Variant / trim</Label>
          <Input
            placeholder={category === "car" ? "e.g. 1.3 E AT" : "e.g. Standard / Premium"}
            value={value.variant ?? ""}
            onChange={(e) => set("variant", e.target.value)}
          />
        </div>
        <div>
          <Label>Color</Label>
          <Input
            placeholder="e.g. Pearl White"
            value={value.color ?? ""}
            onChange={(e) => set("color", e.target.value)}
          />
        </div>

        <div>
          <Label>Plate ending</Label>
          <Input
            placeholder="e.g. 7 (coding)"
            value={value.plate_ending ?? ""}
            onChange={(e) => set("plate_ending", e.target.value)}
          />
        </div>
        {category === "motorcycle" && (
          <div>
            <Label>Plate status</Label>
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
          </div>
        )}

        <div>
          <Label>Registered owner status</Label>
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
        </div>
        <div>
          <Label>OR/CR status</Label>
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
        </div>

        <div>
          <Label>Last registration date</Label>
          <Input
            type="date"
            value={value.last_registration_date ?? ""}
            onChange={(e) => set("last_registration_date", e.target.value)}
          />
        </div>
        {category === "motorcycle" ? (
          <div>
            <Label>Registration expiry</Label>
            <Input
              type="date"
              value={value.registration_expiry ?? ""}
              onChange={(e) => set("registration_expiry", e.target.value)}
            />
          </div>
        ) : null}

        <div>
          <Label>Flood history</Label>
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
        </div>
        <div>
          <Label>Accident history</Label>
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
        </div>

        {category === "motorcycle" && (
          <div className="sm:col-span-2">
            <Label>Modifications</Label>
            <Textarea
              rows={2}
              placeholder="e.g. Yoshimura exhaust, LED headlight, +2 sprocket"
              value={value.modifications ?? ""}
              onChange={(e) => set("modifications", e.target.value)}
            />
          </div>
        )}

        <div className="sm:col-span-2">
          <Label>VIN / chassis (kept private to buyer on request)</Label>
          <Input
            placeholder="Optional — shown only when buyer requests verification"
            value={value.vin_chassis ?? ""}
            onChange={(e) => set("vin_chassis", e.target.value)}
          />
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
