import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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

export type CategoryFilterValue = Record<string, string | boolean | undefined>;

interface Props {
  category: string;
  value: CategoryFilterValue;
  onChange: (next: CategoryFilterValue) => void;
  /** When "details" only render selects/ranges/text; when "extras" only render booleans. */
  section?: "details" | "extras" | "all";
}

const ANY = "__any__";

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
  value: CategoryFilterValue;
  onChange: (next: CategoryFilterValue) => void;
}) {
  const v = (value[field] as string | undefined) ?? "";
  return (
    <div className="min-w-0">
      <Label className="text-[11px]">{label}</Label>
      <Select
        value={v || ANY}
        onValueChange={(nv) => onChange({ ...value, [field]: nv === ANY ? undefined : nv })}
      >
        <SelectTrigger className="h-9">
          <SelectValue placeholder="Any" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Any</SelectItem>
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

function Range({
  label,
  minField,
  maxField,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  minField: string;
  maxField: string;
  value: CategoryFilterValue;
  onChange: (next: CategoryFilterValue) => void;
  placeholder?: string;
}) {
  return (
    <div className="col-span-2 min-w-0">
      <Label className="text-[11px]">{label}</Label>
      <div className="grid grid-cols-2 gap-2">
        <Input
          type="number"
          min="0"
          placeholder={placeholder ? `Min ${placeholder}` : "Min"}
          value={(value[minField] as string) ?? ""}
          onChange={(e) => onChange({ ...value, [minField]: e.target.value || undefined })}
          className="h-9"
        />
        <Input
          type="number"
          min="0"
          placeholder={placeholder ? `Max ${placeholder}` : "Max"}
          value={(value[maxField] as string) ?? ""}
          onChange={(e) => onChange({ ...value, [maxField]: e.target.value || undefined })}
          className="h-9"
        />
      </div>
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
  value: CategoryFilterValue;
  onChange: (next: CategoryFilterValue) => void;
}) {
  const v = !!value[field];
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <Checkbox
        checked={v}
        onCheckedChange={(c) => onChange({ ...value, [field]: !!c || undefined })}
      />
      <span>{label}</span>
    </label>
  );
}

function TextField({
  label,
  field,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  field: string;
  placeholder?: string;
  value: CategoryFilterValue;
  onChange: (next: CategoryFilterValue) => void;
}) {
  return (
    <div className="min-w-0">
      <Label className="text-[11px]">{label}</Label>
      <Input
        value={(value[field] as string) ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange({ ...value, [field]: e.target.value || undefined })}
        className="h-9"
      />
    </div>
  );
}

function DetailsGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>;
}

function ExtrasList({ children }: { children: React.ReactNode }) {
  return <div className="space-y-2">{children}</div>;
}

export function CategoryFilters({ category, value, onChange, section = "all" }: Props) {
  const showDetails = section === "all" || section === "details";
  const showExtras = section === "all" || section === "extras";

  if (category === "car") {
    return (
      <div className="space-y-3">
        {showDetails && (
          <DetailsGrid>
            <Sel label="Transmission" field="transmission" opts={TRANSMISSIONS} value={value} onChange={onChange} />
            <Sel label="Fuel" field="fuel" opts={FUEL_TYPES} value={value} onChange={onChange} />
            <Sel label="Body type" field="body_type" opts={BODY_TYPES} value={value} onChange={onChange} />
            <Sel label="Drivetrain" field="drivetrain" opts={DRIVETRAINS} value={value} onChange={onChange} />
            <Range label="Mileage (km)" minField="mileage_min" maxField="mileage_max" value={value} onChange={onChange} />
            <Sel label="Owner status" field="owner_status" opts={OWNER_STATUS} value={value} onChange={onChange} />
            <Sel label="OR/CR" field="or_cr_status" opts={OR_CR_STATUS} value={value} onChange={onChange} />
            <Sel label="Flood history" field="flood_history" opts={YES_NO_UNKNOWN} value={value} onChange={onChange} />
            <Sel label="Accident history" field="accident_history" opts={YES_NO_UNKNOWN} value={value} onChange={onChange} />
            <Sel label="Registered owner" field="registered_owner" opts={YES_NO_UNKNOWN} value={value} onChange={onChange} />
          </DetailsGrid>
        )}
        {showExtras && (
          <ExtrasList>
            <Bool label="Financing available" field="financing_available" value={value} onChange={onChange} />
            <Bool label="Trade accepted" field="trade_accepted" value={value} onChange={onChange} />
            <Bool label="Deed chain available" field="deed_chain_available" value={value} onChange={onChange} />
            <Bool label="Inspection available" field="inspection_available" value={value} onChange={onChange} />
            <Bool label="Verified documents only" field="verified_documents_only" value={value} onChange={onChange} />
          </ExtrasList>
        )}
      </div>
    );
  }
  if (category === "motorcycle") {
    return (
      <div className="space-y-3">
        {showDetails && (
          <DetailsGrid>
            <Sel label="Type" field="moto_type" opts={MOTO_TYPES} value={value} onChange={onChange} />
            <Range label="Engine displacement (cc)" minField="engine_cc_min" maxField="engine_cc_max" value={value} onChange={onChange} />
            <Sel label="OR/CR" field="or_cr_status" opts={OR_CR_STATUS} value={value} onChange={onChange} />
            <Sel label="Plate status" field="plate_status" opts={PLATE_STATUS} value={value} onChange={onChange} />
            <Sel label="Owner status" field="owner_status" opts={OWNER_STATUS} value={value} onChange={onChange} />
            <Sel label="Condition" field="moto_condition" opts={MOTO_CONDITION} value={value} onChange={onChange} />
            <Sel label="Registered owner" field="registered_owner" opts={YES_NO_UNKNOWN} value={value} onChange={onChange} />
          </DetailsGrid>
        )}
        {showExtras && (
          <ExtrasList>
            <Bool label="Delivery available" field="delivery_available" value={value} onChange={onChange} />
            <Bool label="Deed chain available" field="deed_chain_available" value={value} onChange={onChange} />
            <Bool label="Inspection available" field="inspection_available" value={value} onChange={onChange} />
            <Bool label="Verified documents only" field="verified_documents_only" value={value} onChange={onChange} />
          </ExtrasList>
        )}
      </div>
    );
  }
  if (category === "equipment") {
    return (
      <div className="space-y-3">
        {showDetails && (
          <DetailsGrid>
            <Sel label="Equipment type" field="equipment_type" opts={EQUIPMENT_TYPES} value={value} onChange={onChange} />
            <TextField label="Brand" field="brand" placeholder="e.g. Caterpillar" value={value} onChange={onChange} />
            <Range label="Hours used" minField="hours_min" maxField="hours_max" value={value} onChange={onChange} />
            <Range label="Operating weight (tons)" minField="weight_min" maxField="weight_max" value={value} onChange={onChange} />
            <TextField label="Attachment type" field="attachment_type" placeholder="bucket, fork…" value={value} onChange={onChange} />
            <Sel label="Rental or sale" field="rental_or_sale" opts={RENTAL_OR_SALE} value={value} onChange={onChange} />
            <Sel label="Registered owner" field="registered_owner" opts={YES_NO_UNKNOWN} value={value} onChange={onChange} />
          </DetailsGrid>
        )}
        {showExtras && (
          <ExtrasList>
            <Bool label="With operator" field="with_operator" value={value} onChange={onChange} />
            <Bool label="Inspection available" field="inspection_available" value={value} onChange={onChange} />
            <Bool label="Deed chain available" field="deed_chain_available" value={value} onChange={onChange} />
          </ExtrasList>
        )}
      </div>
    );
  }
  if (category === "boat") {
    return (
      <div className="space-y-3">
        {showDetails && (
          <DetailsGrid>
            <Sel label="Boat type" field="boat_type" opts={BOAT_TYPES} value={value} onChange={onChange} />
            <Sel label="Hull material" field="hull_material" opts={HULL_MATERIALS} value={value} onChange={onChange} />
            <Sel label="Engine type" field="boat_engine_type" opts={BOAT_ENGINE_TYPES} value={value} onChange={onChange} />
            <Range label="Length (ft)" minField="length_min" maxField="length_max" value={value} onChange={onChange} />
            <Sel label="Registration" field="boat_registration_status" opts={BOAT_REG_STATUS} value={value} onChange={onChange} />
            <Sel label="Usage" field="boat_usage" opts={BOAT_USAGE} value={value} onChange={onChange} />
            <Sel label="Registered owner" field="registered_owner" opts={YES_NO_UNKNOWN} value={value} onChange={onChange} />
          </DetailsGrid>
        )}
        {showExtras && (
          <ExtrasList>
            <Bool label="Trailer included" field="trailer_included" value={value} onChange={onChange} />
            <Bool label="Deed chain available" field="deed_chain_available" value={value} onChange={onChange} />
            <Bool label="Inspection available" field="inspection_available" value={value} onChange={onChange} />
          </ExtrasList>
        )}
      </div>
    );
  }
  if (category === "airplane") {
    return (
      <div className="space-y-3">
        {showDetails && (
          <>
            <p className="text-[11px] text-muted-foreground">
              Aircraft listings go through manual review before they're shown publicly.
            </p>
            <DetailsGrid>
              <TextField label="Registration #" field="registration_no" placeholder="RP-C1234" value={value} onChange={onChange} />
              <Sel label="Airworthiness" field="airworthiness" opts={AIRWORTHINESS} value={value} onChange={onChange} />
              <Sel label="Maintenance logs" field="maintenance_logs" opts={MAINTENANCE_LOGS} value={value} onChange={onChange} />
              <Range label="Engine hours" minField="engine_hours_min" maxField="engine_hours_max" value={value} onChange={onChange} />
              <TextField label="Home airport" field="airport_code" placeholder="RPLL / MNL" value={value} onChange={onChange} />
              <Sel label="Seller type" field="aircraft_seller" opts={AIRCRAFT_SELLER} value={value} onChange={onChange} />
            </DetailsGrid>
          </>
        )}
        {showExtras && (
          <ExtrasList>
            <Bool label="Inspection required before sale" field="inspection_required" value={value} onChange={onChange} />
          </ExtrasList>
        )}
      </div>
    );
  }
  return null;
}

/** Field keys treated as booleans across categories. */
export const CATEGORY_BOOL_FIELDS = new Set([
  "deed_chain_available",
  "financing_available",
  "trade_accepted",
  "verified_documents_only",
  "delivery_available",
  "with_operator",
  "inspection_available",
  "trailer_included",
  "inspection_required",
]);

/** Whether a given category has any extras (booleans) at all. */
export function categoryHasExtras(category: string): boolean {
  return ["car", "motorcycle", "equipment", "boat", "airplane"].includes(category);
}

/** Whether a given category has details fields. */
export function categoryHasDetails(category: string): boolean {
  return ["car", "motorcycle", "equipment", "boat", "airplane"].includes(category);
}
