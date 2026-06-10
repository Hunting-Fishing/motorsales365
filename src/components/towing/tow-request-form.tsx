import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Siren,
  Clock,
  CalendarClock,
  PhoneCall,
  Camera,
  X,
  Wrench,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LocationPicker } from "@/components/location-picker";
import { TowMapPin, type MapPinValue } from "@/components/towing/tow-map-pin";
import { RidePicker, type RideOption } from "@/components/towing/ride-picker";
import { uploadWithRetry } from "@/lib/storage-upload";
import { cn } from "@/lib/utils";

type Loc = {
  region: string | null;
  province: string | null;
  city: string | null;
  barangay: string | null;
};
const emptyLoc: Loc = { region: null, province: null, city: null, barangay: null };
const emptyPin: MapPinValue = { lat: null, lng: null, address: null };

const VEHICLE_TYPES = [
  "Car",
  "Motorcycle",
  "SUV / Pickup",
  "Van",
  "Truck",
  "Heavy equipment",
  "Boat / Trailer",
];
const DRIVETRAINS = [
  { v: "FWD", label: "FWD (Front-wheel drive)" },
  { v: "RWD", label: "RWD (Rear-wheel drive)" },
  { v: "AWD", label: "AWD (All-wheel drive)" },
  { v: "4x4", label: "4x4 / 4WD" },
  { v: "unknown", label: "Not sure" },
];
const TRANSMISSIONS = ["Automatic", "Manual", "CVT", "Unknown"];
const PAYMENT_METHODS = ["GCash", "Maya", "Cash", "Bank transfer"];

const URGENCY = [
  { v: "emergency", label: "Emergency now", icon: Siren, desc: "Need help ASAP" },
  { v: "time_sensitive", label: "Time sensitive", icon: Clock, desc: "Within a few hours" },
  { v: "scheduled", label: "Scheduled", icon: CalendarClock, desc: "Book for later" },
] as const;

const SITUATIONS = [
  { v: "breakdown", label: "Breakdown" },
  { v: "accident", label: "Accident" },
  { v: "flat_tire", label: "Flat tire" },
  { v: "no_start", label: "Won't start" },
  { v: "no_fuel", label: "Out of fuel" },
  { v: "winch", label: "Stuck / needs winch" },
  { v: "other", label: "Other" },
] as const;

type TriState = "yes" | "no" | "unknown";

type Props = {
  requestedProviderId?: string | null;
  requestedProviderName?: string | null;
  onClearRequestedProvider?: () => void;
  providerSearchSlot?: React.ReactNode;
};

export function TowRequestForm({
  requestedProviderId,
  requestedProviderName,
  onClearRequestedProvider,
  providerSearchSlot,
}: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [urgency, setUrgency] = useState<(typeof URGENCY)[number]["v"]>("emergency");
  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [situation, setSituation] = useState<(typeof SITUATIONS)[number]["v"]>("breakdown");

  const [rideId, setRideId] = useState<string | null>(null);
  const [vehicleType, setVehicleType] = useState<string>("Car");
  const [vYear, setVYear] = useState<string>("");
  const [vMake, setVMake] = useState<string>("");
  const [vModel, setVModel] = useState<string>("");
  const [vTrim, setVTrim] = useState<string>("");
  const [drivetrain, setDrivetrain] = useState<string>("unknown");
  const [transmission, setTransmission] = useState<string>("Unknown");
  const [vehicleNotes, setVehicleNotes] = useState<string>("");
  const [vehiclePhotoUrl, setVehiclePhotoUrl] = useState<string | null>(null);

  const [canRoll, setCanRoll] = useState<TriState>("unknown");
  const [canSteer, setCanSteer] = useState<TriState>("unknown");
  const [canBrake, setCanBrake] = useState<TriState>("unknown");

  const [photos, setPhotos] = useState<{ url: string; path: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [pickup, setPickup] = useState<Loc>(emptyLoc);
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupPin, setPickupPin] = useState<MapPinValue>(emptyPin);
  const [dropoff, setDropoff] = useState<Loc>(emptyLoc);
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [dropoffPin, setDropoffPin] = useState<MapPinValue>(emptyPin);

  const [contactPhone, setContactPhone] = useState("");
  const [preferredPayment, setPreferredPayment] = useState<string>("GCash");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Apply pin reverse-geocoded address to the address textbox when empty
  useEffect(() => {
    if (pickupPin.address && !pickupAddress) setPickupAddress(pickupPin.address);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickupPin.address]);
  useEffect(() => {
    if (dropoffPin.address && !dropoffAddress) setDropoffAddress(dropoffPin.address);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dropoffPin.address]);

  function applyRide(r: RideOption | null) {
    setRideId(r?.id ?? null);
    if (!r) return;
    if (r.vehicle_type === "motorcycle") setVehicleType("Motorcycle");
    else setVehicleType("Car");
    if (r.year != null) setVYear(String(r.year));
    if (r.make) setVMake(r.make);
    if (r.model) setVModel(r.model);
    if (r.trim) setVTrim(r.trim);
    if (r.drivetrain) {
      const dt = r.drivetrain.toUpperCase();
      const match = DRIVETRAINS.find((d) => d.v.toUpperCase() === dt);
      if (match) setDrivetrain(match.v);
    }
    if (r.transmission) {
      const t = TRANSMISSIONS.find((x) => x.toLowerCase() === r.transmission!.toLowerCase());
      if (t) setTransmission(t);
    }
    if (r.cover_photo_url) setVehiclePhotoUrl(r.cover_photo_url);
  }

  async function handlePhotoPick(files: FileList | null) {
    if (!files || !user) return;
    if (photos.length + files.length > 5) {
      toast.error("Up to 5 photos");
      return;
    }
    setUploading(true);
    try {
      const next = [...photos];
      for (const file of Array.from(files)) {
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        await uploadWithRetry({
          bucket: "tow-request-photos",
          path,
          file,
          contentType: file.type || undefined,
        });
        const { data } = await supabase.storage
          .from("tow-request-photos")
          .createSignedUrl(path, 60 * 60 * 24 * 7);
        next.push({ url: data?.signedUrl ?? "", path });
      }
      setPhotos(next);
    } catch (e: any) {
      toast.error(e?.message ?? "Photo upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function removePhoto(path: string) {
    setPhotos((p) => p.filter((x) => x.path !== path));
    supabase.storage.from("tow-request-photos").remove([path]).catch(() => {});
  }

  const triToBool = (v: TriState) => (v === "unknown" ? null : v === "yes");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (!pickup.region) {
      toast.error("Pickup region is required");
      return;
    }
    if (!dropoff.region) {
      toast.error("Dropoff region is required");
      return;
    }
    if (!contactPhone.trim()) {
      toast.error("Contact number is required");
      return;
    }
    if (urgency === "scheduled" && !scheduledAt) {
      toast.error("Pick a scheduled time");
      return;
    }
    setSubmitting(true);
    try {
      const summary = [
        vYear || null,
        vMake || null,
        vModel || null,
        vTrim || null,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();
      const vehicle_summary = summary
        ? `${vehicleType} — ${summary}`
        : vehicleNotes.trim()
          ? `${vehicleType} — ${vehicleNotes.trim()}`
          : vehicleType;

      const noteBlob = [
        contactPhone ? `Contact: ${contactPhone}` : null,
        preferredPayment ? `Preferred payment: ${preferredPayment}` : null,
        vehicleNotes.trim() || null,
        notes.trim() || null,
      ]
        .filter(Boolean)
        .join("\n");

      const { error } = await (supabase as any).from("tow_requests").insert({
        requester_id: user.id,
        provider_id: null,
        requested_provider_id: requestedProviderId ?? null,
        listing_id: null,
        urgency,
        situation,
        ride_id: rideId,
        pickup_region: pickup.region,
        pickup_province: pickup.province,
        pickup_city: pickup.city,
        pickup_address: pickupAddress || null,
        pickup_lat: pickupPin.lat,
        pickup_lng: pickupPin.lng,
        dropoff_region: dropoff.region,
        dropoff_province: dropoff.province,
        dropoff_city: dropoff.city,
        dropoff_address: dropoffAddress || null,
        dropoff_lat: dropoffPin.lat,
        dropoff_lng: dropoffPin.lng,
        vehicle_summary,
        vehicle_year: vYear ? Number(vYear) : null,
        vehicle_make: vMake || null,
        vehicle_model: vModel || null,
        vehicle_trim: vTrim || null,
        vehicle_drivetrain: drivetrain,
        vehicle_transmission: transmission === "Unknown" ? null : transmission,
        vehicle_photo_url: vehiclePhotoUrl,
        damage_photo_urls: photos.map((p) => p.path),
        can_roll: triToBool(canRoll),
        can_steer: triToBool(canSteer),
        can_brake: triToBool(canBrake),
        needed_at: urgency === "scheduled" ? new Date(scheduledAt).toISOString() : null,
        notes: noteBlob || null,
      });
      if (error) throw error;
      toast.success(
        requestedProviderName
          ? `Request sent to ${requestedProviderName}.`
          : "Tow request posted — nearby 365 Dispatch providers will respond shortly.",
      );
      // Reset minimally
      setNotes("");
      setPhotos([]);
      setPickupPin(emptyPin);
      setDropoffPin(emptyPin);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-6 rounded-xl border border-border bg-card p-6 lg:grid-cols-2"
    >
      {/* Urgency + situation */}
      <section className="space-y-4 lg:col-span-2">
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            How urgent is this?
          </Label>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {URGENCY.map((u) => {
              const Icon = u.icon;
              const active = urgency === u.v;
              return (
                <button
                  key={u.v}
                  type="button"
                  onClick={() => setUrgency(u.v)}
                  className={cn(
                    "flex items-start gap-2 rounded-lg border p-3 text-left transition",
                    active
                      ? u.v === "emergency"
                        ? "border-destructive bg-destructive/10"
                        : "border-primary bg-primary/10"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  <Icon
                    className={cn(
                      "mt-0.5 h-4 w-4",
                      active && u.v === "emergency"
                        ? "text-destructive"
                        : active
                          ? "text-primary"
                          : "text-muted-foreground",
                    )}
                  />
                  <div>
                    <div className="text-sm font-semibold">{u.label}</div>
                    <div className="text-xs text-muted-foreground">{u.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
          {urgency === "scheduled" && (
            <div className="mt-3">
              <Label htmlFor="sched">Scheduled time</Label>
              <Input
                id="sched"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
              />
            </div>
          )}
        </div>

        <div>
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            What happened?
          </Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {SITUATIONS.map((s) => {
              const active = situation === s.v;
              return (
                <button
                  key={s.v}
                  type="button"
                  onClick={() => setSituation(s.v)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs transition",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Vehicle */}
      <section className="space-y-4">
        <h3 className="font-display text-base font-semibold">Vehicle</h3>

        <RidePicker value={rideId} onSelect={applyRide} />

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Vehicle type</Label>
            <Select value={vehicleType} onValueChange={setVehicleType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VEHICLE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="vy">Year</Label>
            <Input
              id="vy"
              inputMode="numeric"
              value={vYear}
              onChange={(e) => setVYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="2018"
            />
          </div>
          <div>
            <Label htmlFor="vm">Make</Label>
            <Input id="vm" value={vMake} onChange={(e) => setVMake(e.target.value)} placeholder="Honda" />
          </div>
          <div>
            <Label htmlFor="vmo">Model</Label>
            <Input
              id="vmo"
              value={vModel}
              onChange={(e) => setVModel(e.target.value)}
              placeholder="Civic"
            />
          </div>
          <div>
            <Label htmlFor="vtr">Trim</Label>
            <Input
              id="vtr"
              value={vTrim}
              onChange={(e) => setVTrim(e.target.value)}
              placeholder="Type R"
            />
          </div>
          <div>
            <Label>Drivetrain</Label>
            <Select value={drivetrain} onValueChange={setDrivetrain}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DRIVETRAINS.map((d) => (
                  <SelectItem key={d.v} value={d.v}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Transmission</Label>
            <Select value={transmission} onValueChange={setTransmission}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRANSMISSIONS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="vn">Other vehicle notes</Label>
          <Input
            id="vn"
            value={vehicleNotes}
            onChange={(e) => setVehicleNotes(e.target.value)}
            placeholder="Lowered, custom bumper, no keys, etc."
          />
        </div>

        {/* Condition */}
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Wrench className="h-3.5 w-3.5" /> Drivability
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <TriToggle label="Rolls" value={canRoll} onChange={setCanRoll} />
            <TriToggle label="Steers" value={canSteer} onChange={setCanSteer} />
            <TriToggle label="Brakes" value={canBrake} onChange={setCanBrake} />
          </div>
        </div>

        {/* Photos */}
        <div>
          <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Camera className="h-3.5 w-3.5" /> Damage / scene photos (up to 5)
          </Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {photos.map((p) => (
              <div
                key={p.path}
                className="relative h-20 w-20 overflow-hidden rounded-md border border-border"
              >
                {p.url ? (
                  <img src={p.url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted text-xs">
                    Uploaded
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removePhoto(p.path)}
                  className="absolute right-0.5 top-0.5 rounded-full bg-black/70 p-0.5 text-white"
                  aria-label="Remove"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {photos.length < 5 && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading || !user}
                className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-xs text-muted-foreground hover:border-primary/50 disabled:opacity-60"
              >
                <Camera className="h-4 w-4" />
                {uploading ? "Uploading…" : "Add"}
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handlePhotoPick(e.target.files)}
            />
          </div>
          {!user && (
            <p className="mt-1 text-xs text-muted-foreground">Sign in to attach photos.</p>
          )}
        </div>

        <div>
          <Label htmlFor="cp">Contact number</Label>
          <Input
            id="cp"
            type="tel"
            required
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder="09xx xxx xxxx"
          />
        </div>
        <div>
          <Label>Preferred payment</Label>
          <Select value={preferredPayment} onValueChange={setPreferredPayment}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {providerSearchSlot && (
          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Request a specific provider (optional)
            </Label>
            {requestedProviderName ? (
              <div className="mt-2 flex items-center justify-between rounded-md bg-card p-2">
                <span className="text-sm">
                  <strong>{requestedProviderName}</strong> will receive this request directly.
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={onClearRequestedProvider}
                >
                  Clear
                </Button>
              </div>
            ) : (
              providerSearchSlot
            )}
          </div>
        )}
      </section>

      {/* Locations */}
      <section className="space-y-5">
        <div className="space-y-3">
          <h3 className="font-display text-base font-semibold">Pickup</h3>
          <LocationPicker
            value={pickup}
            onChange={(v) =>
              setPickup({
                region: v.region ?? null,
                province: v.province ?? null,
                city: v.city ?? null,
                barangay: v.barangay ?? null,
              })
            }
          />
          <div>
            <Label>Street / landmark</Label>
            <Input
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
              placeholder="optional"
            />
          </div>
          <TowMapPin
            value={pickupPin}
            onChange={setPickupPin}
            label="Pin exact pickup spot"
            required
          />
        </div>

        <div className="space-y-3">
          <h3 className="font-display text-base font-semibold">Dropoff</h3>
          <LocationPicker
            value={dropoff}
            onChange={(v) =>
              setDropoff({
                region: v.region ?? null,
                province: v.province ?? null,
                city: v.city ?? null,
                barangay: v.barangay ?? null,
              })
            }
          />
          <div>
            <Label>Street / landmark</Label>
            <Input
              value={dropoffAddress}
              onChange={(e) => setDropoffAddress(e.target.value)}
              placeholder="optional"
            />
          </div>
          <TowMapPin value={dropoffPin} onChange={setDropoffPin} label="Pin dropoff spot" />
        </div>
      </section>

      <section className="space-y-3 lg:col-span-2">
        <Label htmlFor="nt">Notes for the driver</Label>
        <Textarea
          id="nt"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Low-clearance vehicle, gate access, parked underground, etc."
        />
        {(situation === "accident" || urgency === "emergency") && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-400/40 bg-amber-500/10 p-3 text-xs">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <span>
              If anyone is hurt or there's a road hazard, please call emergency services first.
            </span>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Open requests are routed via the 365 Dispatch network. You'll see responses on your
            dashboard.
          </p>
          <Button type="submit" size="lg" disabled={submitting}>
            <PhoneCall className="mr-2 h-4 w-4" />
            {submitting ? "Submitting…" : "Submit tow request"}
          </Button>
        </div>
      </section>
    </form>
  );
}

function TriToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: TriState;
  onChange: (v: TriState) => void;
}) {
  const opts: { v: TriState; label: string }[] = [
    { v: "yes", label: "Yes" },
    { v: "no", label: "No" },
    { v: "unknown", label: "?" },
  ];
  return (
    <div>
      <div className="mb-1 text-xs font-medium">{label}</div>
      <div className="flex overflow-hidden rounded-md border border-border">
        {opts.map((o) => (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            className={cn(
              "flex-1 px-2 py-1 text-xs transition",
              value === o.v
                ? "bg-primary text-primary-foreground"
                : "bg-background hover:bg-muted",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
