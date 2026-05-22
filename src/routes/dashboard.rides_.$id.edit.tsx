import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RidePhotoUploader } from "@/components/rides/ride-photo-uploader";
import { ServiceLogPhotoUploader } from "@/components/rides/service-log-photo-uploader";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { linkRideToListing, publishRide } from "@/lib/rides.functions";

export const Route = createFileRoute("/dashboard/rides_/$id/edit")({
  component: EditRidePage,
});

const MOD_CATEGORIES = ["engine","drivetrain","suspension","wheels_tires","brakes","exterior","interior","audio_electronics","lighting","tuning","other"] as const;

function EditRidePage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const publish = useServerFn(publishRide);
  const linkListing = useServerFn(linkRideToListing);

  const [ride, setRide] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [mods, setMods] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [owners, setOwners] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data: r } = await (supabase as any).from("rides").select("*").eq("id", id).maybeSingle();
    if (!r || r.user_id !== user.id) { navigate({ to: "/dashboard/rides" }); return; }
    setRide(r);
    const [{ data: p }, { data: m }, { data: l }, { data: o }, { data: ls }] = await Promise.all([
      (supabase as any).from("ride_photos").select("*").eq("ride_id", id).order("sort_order"),
      (supabase as any).from("ride_mods").select("*").eq("ride_id", id).order("category").order("sort_order"),
      (supabase as any).from("ride_service_log").select("*").eq("ride_id", id).order("service_date", { ascending: false }),
      (supabase as any).from("ride_ownership").select("*").eq("ride_id", id).order("sort_order"),
      supabase.from("listings").select("id,title,status").eq("user_id", user.id).in("status", ["draft","active","pending_sale"]),
    ]);
    setPhotos(p ?? []); setMods(m ?? []); setLogs(l ?? []); setOwners(o ?? []); setListings(ls ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id, user?.id]);

  if (loading || !ride) return <p className="text-muted-foreground">Loading…</p>;

  const saveDetails = async () => {
    const { error } = await (supabase as any).from("rides").update({
      name: ride.name, year: ride.year, make: ride.make, model: ride.model, trim: ride.trim,
      color: ride.color, engine: ride.engine, transmission: ride.transmission, drivetrain: ride.drivetrain,
      mileage_km: ride.mileage_km, description: ride.description, region: ride.region, city: ride.city,
      vehicle_type: ride.vehicle_type,
    }).eq("id", id);
    if (error) toast.error(error.message); else toast.success("Saved");
  };

  const addMod = async () => {
    const { data } = await (supabase as any).from("ride_mods").insert({
      ride_id: id, category: "other", part_name: "New part", sort_order: mods.length,
    }).select("*").single();
    if (data) setMods([...mods, data]);
  };
  const saveMod = async (m: any) => {
    const { error } = await (supabase as any).from("ride_mods").update({
      category: m.category, part_name: m.part_name, brand: m.brand, cost_php: m.cost_php, installed_on: m.installed_on, notes: m.notes,
    }).eq("id", m.id);
    if (error) toast.error(error.message);
  };
  const delMod = async (mid: string) => { await (supabase as any).from("ride_mods").delete().eq("id", mid); setMods(mods.filter((x) => x.id !== mid)); };

  const addLog = async () => {
    const { data } = await (supabase as any).from("ride_service_log").insert({
      ride_id: id, service_date: new Date().toISOString().slice(0,10), service_type: "Service",
    }).select("*").single();
    if (data) setLogs([data, ...logs]);
  };
  const saveLog = async (s: any) => {
    const { error } = await (supabase as any).from("ride_service_log").update({
      service_date: s.service_date, service_type: s.service_type, mileage_km: s.mileage_km, cost_php: s.cost_php, notes: s.notes, photo_url: s.photo_url,
    }).eq("id", s.id);
    if (error) toast.error(error.message);
  };
  const delLog = async (lid: string) => { await (supabase as any).from("ride_service_log").delete().eq("id", lid); setLogs(logs.filter((x) => x.id !== lid)); };

  const addOwner = async () => {
    const { data } = await (supabase as any).from("ride_ownership").insert({
      ride_id: id, owner_name: "Owner", sort_order: owners.length,
    }).select("*").single();
    if (data) setOwners([...owners, data]);
  };
  const saveOwner = async (o: any) => {
    const { error } = await (supabase as any).from("ride_ownership").update({
      owner_name: o.owner_name, acquired_on: o.acquired_on, sold_on: o.sold_on, notes: o.notes,
    }).eq("id", o.id);
    if (error) toast.error(error.message);
  };
  const delOwner = async (oid: string) => { await (supabase as any).from("ride_ownership").delete().eq("id", oid); setOwners(owners.filter((x) => x.id !== oid)); };

  const togglePublish = async () => {
    const isPub = ride.status === "published";
    try { await publish({ data: { id, publish: !isPub } }); toast.success(isPub ? "Unpublished" : "Published"); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  const updateListingLink = async (lid: string) => {
    try { await linkListing({ data: { ride_id: id, listing_id: lid || null } }); toast.success("Saved"); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm"><Link to="/dashboard/rides"><ArrowLeft className="mr-1 h-4 w-4" />Back</Link></Button>
        <div className="flex gap-2">
          <Button onClick={togglePublish} variant={ride.status === "published" ? "outline" : "default"}>
            {ride.status === "published" ? "Unpublish" : "Publish"}
          </Button>
          {ride.status === "published" && (
            <Button asChild variant="outline"><Link to="/rides/$slug" params={{ slug: ride.slug }}>View public</Link></Button>
          )}
        </div>
      </div>

      <h1 className="font-display text-2xl font-bold">{ride.name}</h1>

      <Tabs defaultValue="details">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="photos">Photos ({photos.length})</TabsTrigger>
          <TabsTrigger value="mods">Mods ({mods.length})</TabsTrigger>
          <TabsTrigger value="service">Service ({logs.length})</TabsTrigger>
          <TabsTrigger value="ownership">Ownership ({owners.length})</TabsTrigger>
          <TabsTrigger value="listing">Sale</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-3 pt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["name", "Nickname"], ["year", "Year"], ["make", "Make"], ["model", "Model"],
              ["trim", "Trim"], ["color", "Color"], ["engine", "Engine"],
              ["transmission", "Transmission"], ["drivetrain", "Drivetrain"],
              ["mileage_km", "Mileage (km)"], ["region", "Region"], ["city", "City"],
            ].map(([k, label]) => (
              <div key={k} className="space-y-1">
                <Label>{label}</Label>
                <Input
                  value={ride[k] ?? ""}
                  type={k === "year" || k === "mileage_km" ? "number" : "text"}
                  onChange={(e) => {
                    const v = e.target.value;
                    setRide({ ...ride, [k]: (k === "year" || k === "mileage_km") ? (v ? Number(v) : null) : v });
                  }}
                />
              </div>
            ))}
          </div>
          <div className="space-y-1">
            <Label>The story</Label>
            <Textarea rows={6} value={ride.description ?? ""} onChange={(e) => setRide({ ...ride, description: e.target.value })} />
          </div>
          <Button onClick={saveDetails}><Save className="mr-1 h-4 w-4" />Save details</Button>
        </TabsContent>

        <TabsContent value="photos" className="pt-4">
          <RidePhotoUploader rideId={id} userId={user!.id} photos={photos} coverUrl={ride.cover_photo_url} onChange={load} />
        </TabsContent>

        <TabsContent value="mods" className="space-y-3 pt-4">
          <Button onClick={addMod} variant="outline" size="sm"><Plus className="mr-1 h-4 w-4" />Add mod</Button>
          {mods.map((m, i) => (
            <div key={m.id} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-6">
              <select className="rounded-md border border-input bg-background px-2 py-1 text-sm sm:col-span-2"
                value={m.category}
                onChange={(e) => { const v = { ...m, category: e.target.value }; setMods(mods.map((x, j) => j === i ? v : x)); saveMod(v); }}>
                {MOD_CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
              </select>
              <Input placeholder="Part" value={m.part_name ?? ""} onChange={(e) => setMods(mods.map((x, j) => j === i ? { ...x, part_name: e.target.value } : x))} onBlur={() => saveMod(m)} className="sm:col-span-2" />
              <Input placeholder="Brand" value={m.brand ?? ""} onChange={(e) => setMods(mods.map((x, j) => j === i ? { ...x, brand: e.target.value } : x))} onBlur={() => saveMod(m)} />
              <Input type="number" placeholder="Cost ₱" value={m.cost_php ?? ""} onChange={(e) => setMods(mods.map((x, j) => j === i ? { ...x, cost_php: e.target.value ? Number(e.target.value) : null } : x))} onBlur={() => saveMod(m)} />
              <Input type="date" value={m.installed_on ?? ""} onChange={(e) => setMods(mods.map((x, j) => j === i ? { ...x, installed_on: e.target.value || null } : x))} onBlur={() => saveMod(m)} />
              <Input placeholder="Notes" value={m.notes ?? ""} onChange={(e) => setMods(mods.map((x, j) => j === i ? { ...x, notes: e.target.value } : x))} onBlur={() => saveMod(m)} className="sm:col-span-4" />
              <Button variant="ghost" size="icon" onClick={() => delMod(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="service" className="space-y-3 pt-4">
          <Button onClick={addLog} variant="outline" size="sm"><Plus className="mr-1 h-4 w-4" />Add entry</Button>
          {logs.map((s, i) => (
            <div key={s.id} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-6">
              <Input type="date" value={s.service_date} onChange={(e) => setLogs(logs.map((x, j) => j === i ? { ...x, service_date: e.target.value } : x))} onBlur={() => saveLog(s)} />
              <Input placeholder="Service type" value={s.service_type ?? ""} onChange={(e) => setLogs(logs.map((x, j) => j === i ? { ...x, service_type: e.target.value } : x))} onBlur={() => saveLog(s)} className="sm:col-span-2" />
              <Input type="number" placeholder="Mileage km" value={s.mileage_km ?? ""} onChange={(e) => setLogs(logs.map((x, j) => j === i ? { ...x, mileage_km: e.target.value ? Number(e.target.value) : null } : x))} onBlur={() => saveLog(s)} />
              <Input type="number" placeholder="Cost ₱" value={s.cost_php ?? ""} onChange={(e) => setLogs(logs.map((x, j) => j === i ? { ...x, cost_php: e.target.value ? Number(e.target.value) : null } : x))} onBlur={() => saveLog(s)} />
              <Button variant="ghost" size="icon" onClick={() => delLog(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              <Textarea placeholder="Notes" rows={2} value={s.notes ?? ""} onChange={(e) => setLogs(logs.map((x, j) => j === i ? { ...x, notes: e.target.value } : x))} onBlur={() => saveLog(s)} className="sm:col-span-6" />
            </div>
          ))}
        </TabsContent>

        <TabsContent value="ownership" className="space-y-3 pt-4">
          <Button onClick={addOwner} variant="outline" size="sm"><Plus className="mr-1 h-4 w-4" />Add owner</Button>
          {owners.map((o, i) => (
            <div key={o.id} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-5">
              <Input placeholder="Owner name" value={o.owner_name ?? ""} onChange={(e) => setOwners(owners.map((x, j) => j === i ? { ...x, owner_name: e.target.value } : x))} onBlur={() => saveOwner(o)} className="sm:col-span-2" />
              <Input type="date" value={o.acquired_on ?? ""} onChange={(e) => setOwners(owners.map((x, j) => j === i ? { ...x, acquired_on: e.target.value || null } : x))} onBlur={() => saveOwner(o)} />
              <Input type="date" value={o.sold_on ?? ""} onChange={(e) => setOwners(owners.map((x, j) => j === i ? { ...x, sold_on: e.target.value || null } : x))} onBlur={() => saveOwner(o)} />
              <Button variant="ghost" size="icon" onClick={() => delOwner(o.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              <Input placeholder="Notes" value={o.notes ?? ""} onChange={(e) => setOwners(owners.map((x, j) => j === i ? { ...x, notes: e.target.value } : x))} onBlur={() => saveOwner(o)} className="sm:col-span-5" />
            </div>
          ))}
        </TabsContent>

        <TabsContent value="listing" className="space-y-3 pt-4">
          <p className="text-sm text-muted-foreground">Connect this ride to one of your active marketplace listings, or unlink it.</p>
          <select
            className="w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={ride.linked_listing_id ?? ""}
            onChange={(e) => updateListingLink(e.target.value)}
          >
            <option value="">— Not for sale —</option>
            {listings.map((l) => <option key={l.id} value={l.id}>{l.title} ({l.status})</option>)}
          </select>
          {listings.length === 0 && (
            <p className="text-sm text-muted-foreground">
              You have no active listings.{" "}
              <Link to="/sell" className="text-primary underline">Create one</Link> first.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
