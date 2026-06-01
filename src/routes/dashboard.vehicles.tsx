import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Car, Plus, ShieldCheck, Globe, Lock, Wrench, ExternalLink, Trash2, QrCode } from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import {
  listMyVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  addServiceRecord,
  getMyVehicle,
  deleteServiceRecord,
} from "@/lib/vehicles.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatPHP } from "@/lib/format";
import { PassportShareSection } from "@/components/passport-share-section";
import { SingleFileUploader } from "@/components/single-file-uploader";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/dashboard/vehicles")({
  component: VehiclesPage,
});

const SERVICE_TYPE_LABELS: Record<string, string> = {
  oil_change: "Oil change",
  tire_change: "Tires",
  brake_service: "Brakes",
  battery: "Battery",
  tune_up: "Tune-up",
  transmission: "Transmission",
  inspection: "Inspection",
  registration: "Registration",
  insurance: "Insurance",
  accident_repair: "Accident repair",
  other: "Other",
};

function VehiclesPage() {
  const fetchAll = useServerFn(listMyVehicles);
  const { data: vehicles, refetch, isLoading } = useQuery({
    queryKey: ["my-vehicles"],
    queryFn: () => fetchAll(),
  });
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">My vehicles</h1>
          <p className="text-sm text-muted-foreground">Track service history and publish a public passport that follows the car.</p>
        </div>
        <VehicleDialog onSaved={() => refetch()}>
          <Button><Plus className="mr-2 h-4 w-4" /> Add vehicle</Button>
        </VehicleDialog>
      </div>

      {isLoading && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && (!vehicles || vehicles.length === 0) && (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <Car className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-medium">No vehicles yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Add your first car to start its digital service record.</p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {(vehicles ?? []).map((v: any) => (
          <button
            key={v.id}
            onClick={() => setOpenId(v.id)}
            className="rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Car className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {v.nickname || `${v.year ? v.year + " " : ""}${v.make} ${v.model}`}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {v.make} {v.model} {v.year ? `· ${v.year}` : ""} {v.plate_number ? `· ${v.plate_number}` : ""}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  {v.is_public ? (
                    <Badge variant="secondary" className="gap-1 text-[10px]"><Globe className="h-3 w-3" /> Public passport</Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 text-[10px]"><Lock className="h-3 w-3" /> Private</Badge>
                  )}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {openId && (
        <VehicleDetailDialog
          vehicleId={openId}
          onClose={() => setOpenId(null)}
          onChanged={() => refetch()}
        />
      )}
    </div>
  );
}

function VehicleDialog({
  vehicle,
  children,
  onSaved,
}: {
  vehicle?: any;
  children: React.ReactNode;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const [form, setForm] = useState({
    make: vehicle?.make ?? "",
    model: vehicle?.model ?? "",
    year: vehicle?.year ?? "",
    color: vehicle?.color ?? "",
    vin: vehicle?.vin ?? "",
    plateNumber: vehicle?.plate_number ?? "",
    nickname: vehicle?.nickname ?? "",
    coverUrl: vehicle?.cover_url ?? "",
    isPublic: vehicle?.is_public ?? false,
  });
  const [saving, setSaving] = useState(false);
  const createFn = useServerFn(createVehicle);
  const updateFn = useServerFn(updateVehicle);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        make: form.make.trim(),
        model: form.model.trim(),
        year: form.year ? Number(form.year) : null,
        color: form.color.trim() || null,
        vin: form.vin.trim() || null,
        plateNumber: form.plateNumber.trim() || null,
        nickname: form.nickname.trim() || null,
        coverUrl: form.coverUrl.trim() || null,
        isPublic: form.isPublic,
      };
      if (vehicle) {
        await updateFn({ data: { id: vehicle.id, ...payload } });
        toast.success("Vehicle updated");
      } else {
        await createFn({ data: payload });
        toast.success("Vehicle added");
      }
      onSaved();
      setOpen(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{vehicle ? "Edit vehicle" : "Add vehicle"}</DialogTitle>
          <DialogDescription>Track maintenance, share a passport with future buyers.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="v-make">Make</Label>
              <Input id="v-make" required maxLength={60} value={form.make} onChange={(e) => setForm((f) => ({ ...f, make: e.target.value }))} placeholder="Toyota" />
            </div>
            <div>
              <Label htmlFor="v-model">Model</Label>
              <Input id="v-model" required maxLength={80} value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} placeholder="Hilux" />
            </div>
            <div>
              <Label htmlFor="v-year">Year</Label>
              <Input id="v-year" type="number" min={1900} max={2100} value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="v-color">Color</Label>
              <Input id="v-color" maxLength={40} value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="v-plate">Plate number</Label>
              <Input id="v-plate" maxLength={20} value={form.plateNumber} onChange={(e) => setForm((f) => ({ ...f, plateNumber: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="v-vin">VIN / Chassis</Label>
              <Input id="v-vin" maxLength={20} value={form.vin} onChange={(e) => setForm((f) => ({ ...f, vin: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label htmlFor="v-nick">Nickname (optional)</Label>
            <Input id="v-nick" maxLength={60} value={form.nickname} onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))} placeholder='e.g. "Red Hilux"' />
          </div>
          {user && (
            <div>
              <Label>Cover photo</Label>
              <SingleFileUploader
                userId={user.id}
                bucket="vehicle-media"
                prefix="covers"
                value={form.coverUrl || null}
                onChange={(url) => setForm((f) => ({ ...f, coverUrl: url ?? "" }))}
                accept="image/*"
                label="Upload cover photo"
              />
            </div>
          )}
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div className="text-sm">
              <p className="font-medium">Public passport</p>
              <p className="text-xs text-muted-foreground">Buyers can view make, model, and service history via a shareable link.</p>
            </div>
            <Switch checked={form.isPublic} onCheckedChange={(v) => setForm((f) => ({ ...f, isPublic: v }))} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : (vehicle ? "Save" : "Add vehicle")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function VehicleDetailDialog({
  vehicleId,
  onClose,
  onChanged,
}: {
  vehicleId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const fetchOne = useServerFn(getMyVehicle);
  const addRec = useServerFn(addServiceRecord);
  const delRec = useServerFn(deleteServiceRecord);
  const delVeh = useServerFn(deleteVehicle);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["vehicle", vehicleId],
    queryFn: () => fetchOne({ data: { id: vehicleId } }),
  });

  const [showAdd, setShowAdd] = useState(false);
  const [rec, setRec] = useState({
    performedAt: new Date().toISOString().slice(0, 10),
    serviceType: "oil_change",
    title: "",
    shopName: "",
    mileageKm: "",
    costPhp: "",
    notes: "",
    receiptUrl: "",
  });
  const [saving, setSaving] = useState(false);

  async function submitRec(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await addRec({
        data: {
          vehicleId,
          performedAt: rec.performedAt,
          serviceType: rec.serviceType as any,
          title: rec.title.trim(),
          shopName: rec.shopName.trim() || null,
          mileageKm: rec.mileageKm ? Number(rec.mileageKm) : null,
          costPhp: rec.costPhp ? Number(rec.costPhp) : null,
          notes: rec.notes.trim() || null,
          receiptUrl: rec.receiptUrl.trim() || null,
        },
      });
      toast.success("Service record added");
      setRec({ ...rec, title: "", shopName: "", mileageKm: "", costPhp: "", notes: "", receiptUrl: "" });
      setShowAdd(false);
      refetch();
    } catch (err: any) {
      toast.error(err?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteRec(id: string) {
    if (!confirm("Delete this service record?")) return;
    try { await delRec({ data: { id } }); refetch(); } catch (e: any) { toast.error(e?.message); }
  }

  async function onDeleteVehicle() {
    if (!confirm("Delete this vehicle and all its records?")) return;
    try {
      await delVeh({ data: { id: vehicleId } });
      onChanged();
      onClose();
      toast.success("Vehicle deleted");
    } catch (e: any) { toast.error(e?.message); }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        {isLoading || !data ? (
          <div className="p-8 text-center text-muted-foreground">Loading…</div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>
                {data.vehicle.nickname || `${data.vehicle.year ? data.vehicle.year + " " : ""}${data.vehicle.make} ${data.vehicle.model}`}
              </DialogTitle>
              <DialogDescription>
                {data.vehicle.make} {data.vehicle.model} {data.vehicle.year ? `· ${data.vehicle.year}` : ""}
                {data.vehicle.plate_number ? ` · ${data.vehicle.plate_number}` : ""}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-wrap items-center gap-2">
              <VehicleDialog vehicle={data.vehicle} onSaved={() => { refetch(); onChanged(); }}>
                <Button size="sm" variant="outline">Edit details</Button>
              </VehicleDialog>
              {data.vehicle.is_public && data.vehicle.passport_slug && (
                <>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/passport/$slug" params={{ slug: data.vehicle.passport_slug }}>
                      <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> View public passport
                    </Link>
                  </Button>
                  <PassportShareSection
                    url={`https://365motorsales.com/passport/${data.vehicle.passport_slug}`}
                    vehicleName={data.vehicle.nickname || `${data.vehicle.year ? data.vehicle.year + " " : ""}${data.vehicle.make} ${data.vehicle.model}`}
                  />
                </>
              )}
              <Button size="sm" variant="ghost" className="text-destructive" onClick={onDeleteVehicle}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
              </Button>
            </div>

            <div className="mt-2 rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold">Service history ({data.records.length})</h3>
                <Button size="sm" onClick={() => setShowAdd((v) => !v)}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> {showAdd ? "Cancel" : "Add record"}
                </Button>
              </div>

              {showAdd && (
                <form onSubmit={submitRec} className="mt-3 space-y-3 rounded-md border border-border/60 bg-muted/30 p-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="r-date">Date</Label>
                      <Input id="r-date" type="date" required value={rec.performedAt} onChange={(e) => setRec({ ...rec, performedAt: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="r-type">Service type</Label>
                      <Select value={rec.serviceType} onValueChange={(v) => setRec({ ...rec, serviceType: v })}>
                        <SelectTrigger id="r-type"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(SERVICE_TYPE_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="r-title">Summary</Label>
                    <Input id="r-title" required maxLength={200} value={rec.title} onChange={(e) => setRec({ ...rec, title: e.target.value })} placeholder="e.g. Full synthetic oil + filter" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <Label htmlFor="r-shop">Shop</Label>
                      <Input id="r-shop" maxLength={120} value={rec.shopName} onChange={(e) => setRec({ ...rec, shopName: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="r-km">Mileage (km)</Label>
                      <Input id="r-km" type="number" min={0} value={rec.mileageKm} onChange={(e) => setRec({ ...rec, mileageKm: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="r-cost">Cost (PHP)</Label>
                      <Input id="r-cost" type="number" min={0} step="0.01" value={rec.costPhp} onChange={(e) => setRec({ ...rec, costPhp: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="r-notes">Notes</Label>
                    <Textarea id="r-notes" rows={2} maxLength={2000} value={rec.notes} onChange={(e) => setRec({ ...rec, notes: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="r-rec">Receipt URL (optional)</Label>
                    <Input id="r-rec" type="url" maxLength={2000} value={rec.receiptUrl} onChange={(e) => setRec({ ...rec, receiptUrl: e.target.value })} placeholder="https://…" />
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save record"}</Button>
                  </div>
                </form>
              )}

              <div className="mt-3 space-y-2">
                {data.records.length === 0 && (
                  <p className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                    No service records yet.
                  </p>
                )}
                {data.records.map((r: any) => (
                  <div key={r.id} className="flex items-start gap-3 rounded-md border border-border bg-background p-3">
                    <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium">{r.title}</p>
                        <Badge variant="secondary" className="text-[10px]">{SERVICE_TYPE_LABELS[r.service_type] ?? r.service_type}</Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDate(r.performed_at)}
                        {r.mileage_km ? ` · ${r.mileage_km.toLocaleString()} km` : ""}
                        {r.shop_name ? ` · ${r.shop_name}` : ""}
                        {r.cost_php ? ` · ${formatPHP(r.cost_php)}` : ""}
                      </p>
                      {r.notes && <p className="mt-1 text-xs">{r.notes}</p>}
                      {r.receipt_url && (
                        <a href={r.receipt_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                          View receipt <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <button onClick={() => onDeleteRec(r.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
