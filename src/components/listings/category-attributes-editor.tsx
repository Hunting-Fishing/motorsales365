import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TRANSMISSIONS,
  FUEL_TYPES,
  BODY_TYPES,
  DRIVETRAINS,
  OWNER_STATUS,
  OR_CR_STATUS,
  YES_NO_UNKNOWN,
  MOTO_TYPES,
  PLATE_STATUS,
  MOTO_CONDITION,
  EQUIPMENT_TYPES,
  RENTAL_OR_SALE,
  BOAT_TYPES,
  HULL_MATERIALS,
  BOAT_ENGINE_TYPES,
  BOAT_REG_STATUS,
  BOAT_USAGE,
  AIRWORTHINESS,
  MAINTENANCE_LOGS,
  AIRCRAFT_SELLER,
  type Opt,
} from "@/lib/category-attributes";

// Per-category list of attribute keys this editor manages, so callers can
// strip them out of `attributes` before merging the editor's payload back in.
export const CATEGORY_ATTR_KEYS: Record<string, string[]> = {
  car: [
    "body_type",
    "drivetrain",
    "owner_status",
    "or_cr_status",
    "flood_history",
    "accident_history",
    "financing_available",
    "trade_accepted",
    "registered_owner",
    "deed_chain_available",
    "inspection_available",
  ],
  motorcycle: [
    "moto_type",
    "engine_cc",
    "or_cr_status",
    "plate_status",
    "owner_status",
    "moto_condition",
    "delivery_available",
    "registered_owner",
    "deed_chain_available",
    "inspection_available",
  ],
  equipment: [
    "equipment_type",
    "brand",
    "hours",
    "operating_weight_tons",
    "attachment_type",
    "rental_or_sale",
    "with_operator",
    "inspection_available",
    "registered_owner",
    "deed_chain_available",
  ],
  boat: [
    "boat_type",
    "hull_material",
    "boat_engine_type",
    "length_ft",
    "boat_registration_status",
    "boat_usage",
    "trailer_included",
    "registered_owner",
    "deed_chain_available",
    "inspection_available",
  ],
  airplane: [
    "registration_no",
    "airworthiness",
    "maintenance_logs",
    "engine_hours",
    "airport_code",
    "aircraft_seller",
    "inspection_required",
  ],
};

export type CategoryAttrsValue = Record<string, any>;

interface Props {
  category: string;
  value: CategoryAttrsValue;
  onChange: (next: CategoryAttrsValue) => void;
}

const NONE = "__none__";

function Sel({
  label,
  field,
  opts,
  value,
  onChange,
}: {
  label: string;
  field: string;
  opts: Opt[];
  value: CategoryAttrsValue;
  onChange: (next: CategoryAttrsValue) => void;
}) {
  const v = (value[field] as string | undefined) ?? "";
  return (
    <div>
      <Label>{label}</Label>
      <Select
        value={v || NONE}
        onValueChange={(nv) => onChange({ ...value, [field]: nv === NONE ? undefined : nv })}
      >
        <SelectTrigger>
          <SelectValue placeholder="Not specified" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Not specified</SelectItem>
          {opts.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function Text({
  label,
  field,
  placeholder,
  type,
  value,
  onChange,
}: {
  label: string;
  field: string;
  placeholder?: string;
  type?: string;
  value: CategoryAttrsValue;
  onChange: (next: CategoryAttrsValue) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        type={type}
        placeholder={placeholder}
        value={(value[field] as string) ?? ""}
        onChange={(e) => onChange({ ...value, [field]: e.target.value || undefined })}
      />
    </div>
  );
}

function Bool({
  label,
  field,
  value,
  onChange,
}: {
  label: string;
  field: string;
  value: CategoryAttrsValue;
  onChange: (next: CategoryAttrsValue) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border/60 p-3">
      <Label className="cursor-pointer">{label}</Label>
      <Switch checked={!!value[field]} onCheckedChange={(c) => onChange({ ...value, [field]: !!c })} />
    </div>
  );
}

function TrustBlock({
  value,
  onChange,
  includeInspection = true,
}: {
  value: CategoryAttrsValue;
  onChange: (next: CategoryAttrsValue) => void;
  includeInspection?: boolean;
}) {
  return (
    <div className="space-y-3 rounded-md border border-border/60 bg-background/40 p-3">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Trust & disclosure
      </Label>
      <Sel
        label="Registered owner (your name on CR)"
        field="registered_owner"
        opts={YES_NO_UNKNOWN}
        value={value}
        onChange={onChange}
      />
      <Bool label="Deed of Sale chain available" field="deed_chain_available" value={value} onChange={onChange} />
      {includeInspection && (
        <Bool label="Allow pre-purchase inspection" field="inspection_available" value={value} onChange={onChange} />
      )}
    </div>
  );
}

export function CategoryAttributesEditor({ category, value, onChange }: Props) {
  if (category === "car") {
    return (
      <div className="space-y-3">
        <Sel label="Body type" field="body_type" opts={BODY_TYPES} value={value} onChange={onChange} />
        <Sel label="Drivetrain" field="drivetrain" opts={DRIVETRAINS} value={value} onChange={onChange} />
        <Sel label="Owner status" field="owner_status" opts={OWNER_STATUS} value={value} onChange={onChange} />
        <Sel label="OR / CR status" field="or_cr_status" opts={OR_CR_STATUS} value={value} onChange={onChange} />
        <Sel label="Flood history" field="flood_history" opts={YES_NO_UNKNOWN} value={value} onChange={onChange} />
        <Sel label="Accident history" field="accident_history" opts={YES_NO_UNKNOWN} value={value} onChange={onChange} />
        <Bool label="Financing available" field="financing_available" value={value} onChange={onChange} />
        <Bool label="Trade-in accepted" field="trade_accepted" value={value} onChange={onChange} />
        <TrustBlock value={value} onChange={onChange} />
      </div>
    );
  }
  if (category === "motorcycle") {
    return (
      <div className="space-y-3">
        <Sel label="Type" field="moto_type" opts={MOTO_TYPES} value={value} onChange={onChange} />
        <Text label="Engine displacement (cc)" field="engine_cc" type="number" placeholder="e.g. 155" value={value} onChange={onChange} />
        <Sel label="OR / CR status" field="or_cr_status" opts={OR_CR_STATUS} value={value} onChange={onChange} />
        <Sel label="Plate status" field="plate_status" opts={PLATE_STATUS} value={value} onChange={onChange} />
        <Sel label="Owner status" field="owner_status" opts={OWNER_STATUS} value={value} onChange={onChange} />
        <Sel label="Condition" field="moto_condition" opts={MOTO_CONDITION} value={value} onChange={onChange} />
        <Bool label="Delivery available" field="delivery_available" value={value} onChange={onChange} />
      </div>
    );
  }
  if (category === "equipment") {
    return (
      <div className="space-y-3">
        <Sel label="Equipment type" field="equipment_type" opts={EQUIPMENT_TYPES} value={value} onChange={onChange} />
        <Text label="Brand" field="brand" placeholder="e.g. Caterpillar" value={value} onChange={onChange} />
        <Text label="Hours used" field="hours" type="number" placeholder="e.g. 1200" value={value} onChange={onChange} />
        <Text label="Operating weight (tons)" field="operating_weight_tons" type="number" placeholder="e.g. 12" value={value} onChange={onChange} />
        <Text label="Attachment type" field="attachment_type" placeholder="e.g. bucket, fork, hammer" value={value} onChange={onChange} />
        <Sel label="Rental or sale" field="rental_or_sale" opts={RENTAL_OR_SALE} value={value} onChange={onChange} />
        <Bool label="With operator" field="with_operator" value={value} onChange={onChange} />
        <Bool label="Inspection available" field="inspection_available" value={value} onChange={onChange} />
      </div>
    );
  }
  if (category === "boat") {
    return (
      <div className="space-y-3">
        <Sel label="Boat type" field="boat_type" opts={BOAT_TYPES} value={value} onChange={onChange} />
        <Sel label="Hull material" field="hull_material" opts={HULL_MATERIALS} value={value} onChange={onChange} />
        <Sel label="Engine type" field="boat_engine_type" opts={BOAT_ENGINE_TYPES} value={value} onChange={onChange} />
        <Text label="Length (ft)" field="length_ft" type="number" placeholder="e.g. 24" value={value} onChange={onChange} />
        <Sel label="Registration status" field="boat_registration_status" opts={BOAT_REG_STATUS} value={value} onChange={onChange} />
        <Sel label="Usage" field="boat_usage" opts={BOAT_USAGE} value={value} onChange={onChange} />
        <Bool label="Trailer included" field="trailer_included" value={value} onChange={onChange} />
      </div>
    );
  }
  if (category === "airplane") {
    return (
      <div className="space-y-3">
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
          Aircraft listings are held for manual review before they go live. Please be ready to provide
          maintenance logs and registration documents if requested.
        </div>
        <Text label="Registration number" field="registration_no" placeholder="e.g. RP-C1234" value={value} onChange={onChange} />
        <Sel label="Airworthiness" field="airworthiness" opts={AIRWORTHINESS} value={value} onChange={onChange} />
        <Sel label="Maintenance logs" field="maintenance_logs" opts={MAINTENANCE_LOGS} value={value} onChange={onChange} />
        <Text label="Engine hours" field="engine_hours" type="number" placeholder="e.g. 1500" value={value} onChange={onChange} />
        <Text label="Home airport (ICAO/IATA)" field="airport_code" placeholder="e.g. RPLL / MNL" value={value} onChange={onChange} />
        <Sel label="Seller type" field="aircraft_seller" opts={AIRCRAFT_SELLER} value={value} onChange={onChange} />
        <Bool label="Inspection required before sale" field="inspection_required" value={value} onChange={onChange} />
      </div>
    );
  }
  return null;
}
