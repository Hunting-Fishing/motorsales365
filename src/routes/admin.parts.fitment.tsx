import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Barcode, Link2, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  adminDeletePartsFitment,
  adminDeletePartsProductNumber,
  adminListPartsFitmentWorkbench,
  adminUpsertPartsFitment,
  adminUpsertPartsProductNumber,
  adminUpsertPartsVehicleProfile,
} from "@/lib/admin-parts-fitment.functions";

export const Route = createFileRoute("/admin/parts/fitment")({
  component: PartsFitmentWorkbench,
  head: () => ({ meta: [{ title: "Parts Fitment Workbench — 365 Admin" }] }),
});

const EMPTY_FITMENT = {
  product_id: "",
  vehicle_profile_id: "",
  position: "",
  fitment_status: "unverified" as const,
  source: "",
  source_reference: "",
  confidence: 0.5,
};

const EMPTY_NUMBER = {
  product_id: "",
  number: "",
  number_type: "interchange" as const,
  manufacturer: "",
  country_code: "PH",
  is_primary: false,
  source: "",
  source_reference: "",
  active: true,
};

const EMPTY_PROFILE = {
  country_code: "PH",
  make: "",
  model: "",
  variant: "",
  year_min: "",
  year_max: "",
  engine_code: "",
  chassis_code: "",
  source: "",
  source_reference: "",
  status: "pending" as const,
};

function PartsFitmentWorkbench() {
  const listFn = useServerFn(adminListPartsFitmentWorkbench);
  const saveFitmentFn = useServerFn(adminUpsertPartsFitment);
  const deleteFitmentFn = useServerFn(adminDeletePartsFitment);
  const saveNumberFn = useServerFn(adminUpsertPartsProductNumber);
  const deleteNumberFn = useServerFn(adminDeletePartsProductNumber);
  const saveProfileFn = useServerFn(adminUpsertPartsVehicleProfile);
  const [data, setData] = useState<any>({
    catalog: [],
    productNumbers: [],
    profiles: [],
    fitments: [],
  });
  const [query, setQuery] = useState("");
  const [fitment, setFitment] = useState<any>(EMPTY_FITMENT);
  const [productNumber, setProductNumber] = useState<any>(EMPTY_NUMBER);
  const [profile, setProfile] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      setData(await listFn());
    } catch (error: any) {
      toast.error(error?.message ?? "Could not load fitment data");
    }
  }
  useEffect(() => void refresh(), []);

  const profiles = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return data.profiles;
    return data.profiles.filter((row: any) =>
      [row.make, row.model, row.variant, row.engine_code, row.chassis_code]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [data.profiles, query]);

  async function saveFitment() {
    if (!fitment.product_id || !fitment.vehicle_profile_id) {
      toast.error("Select both a catalogue part and vehicle profile");
      return;
    }
    setBusy(true);
    try {
      await saveFitmentFn({ data: { ...fitment, confidence: Number(fitment.confidence) } });
      toast.success(
        fitment.fitment_status === "confirmed"
          ? "Verified fitment saved"
          : "Fitment evidence saved",
      );
      setFitment(EMPTY_FITMENT);
      await refresh();
    } catch (error: any) {
      toast.error(error?.message ?? "Could not save fitment");
    } finally {
      setBusy(false);
    }
  }

  async function saveProductNumber() {
    if (!productNumber.product_id) {
      toast.error("Select a canonical catalogue product");
      return;
    }
    setBusy(true);
    try {
      await saveNumberFn({
        data: {
          ...productNumber,
          manufacturer: productNumber.manufacturer || null,
          country_code: productNumber.country_code.toUpperCase(),
        },
      });
      toast.success("Product number mapped");
      setProductNumber(EMPTY_NUMBER);
      await refresh();
    } catch (error: any) {
      toast.error(error?.message ?? "Could not save product number");
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile() {
    setBusy(true);
    try {
      await saveProfileFn({
        data: {
          ...profile,
          year_min: profile.year_min === "" ? null : Number(profile.year_min),
          year_max: profile.year_max === "" ? null : Number(profile.year_max),
          variant: profile.variant || null,
          engine_code: profile.engine_code || null,
          chassis_code: profile.chassis_code || null,
        },
      });
      toast.success("Vehicle profile saved");
      setProfile(null);
      await refresh();
    } catch (error: any) {
      toast.error(error?.message ?? "Could not save vehicle profile");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link to="/admin/parts">
              <ArrowLeft className="mr-1 h-4 w-4" /> Parts admin
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Canonical Parts Fitment</h1>
          <p className="text-sm text-muted-foreground">
            Connect catalogue products to verified Philippine, Asian, and JDM vehicle identities.
          </p>
        </div>
        <Button variant="outline" onClick={() => setProfile({ ...EMPTY_PROFILE })}>
          <Plus className="mr-1 h-4 w-4" /> Vehicle profile
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Catalogue products</p>
          <p className="text-2xl font-bold">{data.catalog.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Mapped product numbers</p>
          <p className="text-2xl font-bold">{data.productNumbers.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Vehicle profiles</p>
          <p className="text-2xl font-bold">{data.profiles.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Confirmed fitments</p>
          <p className="text-2xl font-bold">
            {data.fitments.filter((row: any) => row.fitment_status === "confirmed").length}
          </p>
        </Card>
      </div>

      <div className="grid items-start gap-4 2xl:grid-cols-2">
        <Card className="space-y-4 p-4">
          <div className="flex items-center gap-2">
            <Barcode className="h-5 w-5" />
            <div>
              <h2 className="font-semibold">Map product number</h2>
              <p className="text-xs text-muted-foreground">
                OEM, aftermarket, barcode, supersession, and interchange lookup.
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              label="Canonical part"
              value={productNumber.product_id}
              onChange={(value) => setProductNumber({ ...productNumber, product_id: value })}
            >
              <option value="">Select product…</option>
              {data.catalog.map((row: any) => (
                <option key={row.id} value={row.id}>
                  {[row.manufacturer, row.manufacturer_part_number, row.title]
                    .filter(Boolean)
                    .join(" · ")}
                </option>
              ))}
            </SelectField>
            <TextField
              label="Product number"
              value={productNumber.number}
              onChange={(value) =>
                setProductNumber({ ...productNumber, number: value.toUpperCase() })
              }
              placeholder="OEM or supplier number"
            />
            <SelectField
              label="Number type"
              value={productNumber.number_type}
              onChange={(value) => setProductNumber({ ...productNumber, number_type: value })}
            >
              {["manufacturer", "oem", "aftermarket", "interchange", "superseded", "barcode"].map(
                (value) => (
                  <option key={value} value={value}>
                    {value.replaceAll("_", " ")}
                  </option>
                ),
              )}
            </SelectField>
            <TextField
              label="Manufacturer / brand"
              value={productNumber.manufacturer}
              onChange={(value) => setProductNumber({ ...productNumber, manufacturer: value })}
              placeholder="Toyota, Denso, Bosch…"
            />
            <TextField
              label="Evidence source"
              value={productNumber.source}
              onChange={(value) => setProductNumber({ ...productNumber, source: value })}
              placeholder="Manufacturer EPC, supplier catalogue…"
            />
            <TextField
              label="Source reference"
              value={productNumber.source_reference}
              onChange={(value) => setProductNumber({ ...productNumber, source_reference: value })}
              placeholder="Document, page, URL, or supplier record"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={productNumber.is_primary}
                onChange={(event) =>
                  setProductNumber({ ...productNumber, is_primary: event.target.checked })
                }
              />{" "}
              Primary number
            </label>
            <Button onClick={saveProductNumber} disabled={busy || !productNumber.number.trim()}>
              <Barcode className="mr-1 h-4 w-4" /> Save mapping
            </Button>
          </div>
        </Card>

        <Card className="space-y-4 p-4">
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            <h2 className="font-semibold">Add fitment evidence</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <SelectField
              label="Canonical part"
              value={fitment.product_id}
              onChange={(value) => setFitment({ ...fitment, product_id: value })}
            >
              <option value="">Select product…</option>
              {data.catalog.map((row: any) => (
                <option key={row.id} value={row.id}>
                  {[row.manufacturer, row.manufacturer_part_number, row.title]
                    .filter(Boolean)
                    .join(" · ")}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Vehicle profile"
              value={fitment.vehicle_profile_id}
              onChange={(value) => setFitment({ ...fitment, vehicle_profile_id: value })}
            >
              <option value="">Select vehicle…</option>
              {data.profiles.map((row: any) => (
                <option key={row.id} value={row.id}>
                  {vehicleLabel(row)}
                </option>
              ))}
            </SelectField>
            <TextField
              label="Position / qualifier"
              value={fitment.position}
              onChange={(value) => setFitment({ ...fitment, position: value })}
              placeholder="Front axle, left, with ABS…"
            />
            <SelectField
              label="Review status"
              value={fitment.fitment_status}
              onChange={(value) => setFitment({ ...fitment, fitment_status: value })}
            >
              <option value="unverified">Unverified</option>
              <option value="confirmed">Confirmed</option>
              <option value="does_not_fit">Does not fit</option>
              <option value="retired">Retired</option>
            </SelectField>
            <TextField
              label="Evidence source"
              value={fitment.source}
              onChange={(value) => setFitment({ ...fitment, source: value })}
              placeholder="Manufacturer EPC, supplier catalogue…"
            />
            <TextField
              label="Source reference"
              value={fitment.source_reference}
              onChange={(value) => setFitment({ ...fitment, source_reference: value })}
              placeholder="Document, page, URL, or supplier record"
            />
            <div>
              <Label>Confidence: {Math.round(Number(fitment.confidence) * 100)}%</Label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={fitment.confidence}
                onChange={(event) =>
                  setFitment({ ...fitment, confidence: Number(event.target.value) })
                }
                className="mt-3 w-full"
              />
            </div>
          </div>
          <Button onClick={saveFitment} disabled={busy}>
            <ShieldCheck className="mr-1 h-4 w-4" /> Save evidence
          </Button>
        </Card>
      </div>

      {profile && (
        <Card className="space-y-3 border-primary p-4">
          <h2 className="font-semibold">New vehicle profile</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <TextField
              label="Make"
              value={profile.make}
              onChange={(v) => setProfile({ ...profile, make: v })}
            />
            <TextField
              label="Model"
              value={profile.model}
              onChange={(v) => setProfile({ ...profile, model: v })}
            />
            <TextField
              label="Variant"
              value={profile.variant}
              onChange={(v) => setProfile({ ...profile, variant: v })}
            />
            <TextField
              label="Year from"
              type="number"
              value={profile.year_min}
              onChange={(v) => setProfile({ ...profile, year_min: v })}
            />
            <TextField
              label="Year to"
              type="number"
              value={profile.year_max}
              onChange={(v) => setProfile({ ...profile, year_max: v })}
            />
            <TextField
              label="Engine code"
              value={profile.engine_code}
              onChange={(v) => setProfile({ ...profile, engine_code: v })}
            />
            <TextField
              label="Chassis code"
              value={profile.chassis_code}
              onChange={(v) => setProfile({ ...profile, chassis_code: v.toUpperCase() })}
            />
            <TextField
              label="Evidence source"
              value={profile.source}
              onChange={(v) => setProfile({ ...profile, source: v })}
            />
            <TextField
              label="Source reference"
              value={profile.source_reference}
              onChange={(v) => setProfile({ ...profile, source_reference: v })}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={saveProfile} disabled={busy}>
              Save profile
            </Button>
            <Button variant="ghost" onClick={() => setProfile(null)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      <div className="grid items-start gap-4 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="border-b p-4">
            <h2 className="font-semibold">Product number register</h2>
            <p className="text-xs text-muted-foreground">
              Canonical identifiers customers and associates can search.
            </p>
          </div>
          {data.productNumbers.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              No alternate product numbers yet.
            </p>
          ) : (
            <div className="max-h-[34rem] overflow-y-auto">
              {data.productNumbers.map((row: any) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between gap-3 border-b p-3 text-sm last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {row.number}{" "}
                      <span className="font-normal text-muted-foreground">
                        → {row.parts_catalog?.title ?? "Part"}
                      </span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.number_type} · {row.manufacturer || "Unbranded"} · {row.source}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Badge variant={row.is_primary ? "default" : "outline"}>
                      {row.is_primary ? "Primary" : row.country_code}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={async () => {
                        if (!confirm("Delete this product number mapping?")) return;
                        await deleteNumberFn({ data: { id: row.id } });
                        await refresh();
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b p-4">
            <h2 className="font-semibold">Fitment register</h2>
            <p className="text-xs text-muted-foreground">
              Only confirmed records appear as verified matches to customers.
            </p>
          </div>
          {data.fitments.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              No fitments yet. Add evidence above before confirming compatibility.
            </p>
          ) : (
            <div className="max-h-[34rem] overflow-y-auto">
              {data.fitments.map((row: any) => (
                <div
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-b p-3 text-sm last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {row.parts_catalog?.title ?? "Part"} →{" "}
                      {vehicleLabel(row.parts_vehicle_profiles ?? {})}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.source} · {row.source_reference} ·{" "}
                      {Math.round(Number(row.confidence) * 100)}%
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={row.fitment_status === "confirmed" ? "default" : "secondary"}>
                      {row.fitment_status.replaceAll("_", " ")}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={async () => {
                        if (!confirm("Delete this fitment record?")) return;
                        await deleteFitmentFn({ data: { id: row.id } });
                        await refresh();
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="font-semibold">Vehicle profile coverage</h2>
        <Input
          className="my-3 max-w-md"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search make, model, engine, or chassis code"
        />
        <div className="flex flex-wrap gap-2">
          {profiles.slice(0, 100).map((row: any) => (
            <Badge key={row.id} variant="outline">
              {vehicleLabel(row)}
            </Badge>
          ))}
        </div>
      </Card>
    </div>
  );
}

function vehicleLabel(row: any) {
  const years =
    row.year_min || row.year_max ? `${row.year_min ?? "?"}–${row.year_max ?? "?"}` : null;
  return [row.make, row.model, row.variant, years, row.engine_code, row.chassis_code]
    .filter(Boolean)
    .join(" · ");
}

function TextField({ label, value, onChange, placeholder, type = "text" }: any) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        type={type}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function SelectField({ label, value, onChange, children }: any) {
  return (
    <div>
      <Label>{label}</Label>
      <select
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </div>
  );
}
