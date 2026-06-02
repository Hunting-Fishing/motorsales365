import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { confirm } from "@/components/ui/confirm-dialog";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Upload, X, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LocationPicker } from "@/components/location-picker";
import { getUserPlanLimits, FREE_PLAN_LIMITS, type PlanLimits } from "@/lib/plan-limits";
import { PhoneInput } from "@/components/phone-input";
import { parseE164, buildE164 } from "@/data/country-codes";

export const Route = createFileRoute("/listing/$id/edit")({
  component: EditListingPage,
});

function EditListingPage() {
  const { id } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [listing, setListing] = useState<any>(null);
  const [media, setMedia] = useState<any[]>([]);
  const [planLimits, setPlanLimits] = useState<PlanLimits>(FREE_PLAN_LIMITS);

  useEffect(() => {
    if (user?.id) getUserPlanLimits(user.id).then(setPlanLimits);
  }, [user?.id]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [region, setRegion] = useState<string | null>(null);
  const [province, setProvince] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [barangay, setBarangay] = useState<string | null>(null);
  const [condition, setCondition] = useState("Used");
  const [phoneIso, setPhoneIso] = useState("PH");
  const [phoneNational, setPhoneNational] = useState("");
  const [allowMessages, setAllowMessages] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data: l } = await supabase.from("listings").select("*").eq("id", id).maybeSingle();
    if (!l) {
      setLoading(false);
      return;
    }
    if (l.user_id !== user.id) {
      toast.error("You don't own this listing");
      navigate({ to: "/dashboard" });
      return;
    }
    setListing(l);
    setTitle(l.title ?? "");
    setDescription(l.description ?? "");
    setPrice(String(l.price_php ?? ""));
    setRegion(l.region ?? null);
    setProvince(l.province ?? null);
    setCity(l.city ?? null);
    setBarangay(l.barangay ?? null);
    setCondition(l.condition ?? "Used");
    { const p = parseE164(l.contact_phone ?? null); setPhoneIso(p.iso); setPhoneNational(p.national); }
    setAllowMessages(l.allow_messages);

    const { data: m } = await supabase
      .from("listing_media")
      .select("id,url,type,storage_path,sort_order")
      .eq("listing_id", id)
      .order("sort_order");
    setMedia(m ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (user) load();
  }, [user, id]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("listings")
      .update({
        title,
        description,
        price_php: Number(price),
        region,
        province,
        city,
        barangay,
        condition,
        contact_phone: buildE164(phoneIso, phoneNational) ?? null,
        allow_messages: allowMessages,
      })
      .eq("id", id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Listing updated");
    navigate({ to: "/listing/$id", params: { id } });
  };

  const addPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !listing) return;
    const planMax = planLimits.maxPhotosPerListing;
    const maxPhotos = listing.plan === "upgraded" ? Math.max(20, planMax) : Math.max(5, planMax);
    const currentCount = media.filter((m) => m.type === "photo").length;
    const files = Array.from(e.target.files ?? []).slice(0, maxPhotos - currentCount);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const path = `${user.id}/${id}/${Date.now()}-${i}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("listing-photos").upload(path, file);
      if (upErr) {
        toast.error(upErr.message);
        continue;
      }
      const { data: pub } = supabase.storage.from("listing-photos").getPublicUrl(path);
      await supabase.from("listing_media").insert({
        listing_id: id,
        type: "photo",
        url: pub.publicUrl,
        storage_path: path,
        sort_order: currentCount + i,
      });
    }
    toast.success("Photos added");
    load();
  };

  const removeMedia = async (m: any) => {
    if (!(await confirm({ title: "Remove this media?", destructive: true }))) return;
    if (m.storage_path) {
      const bucket = m.type === "video" ? "listing-videos" : "listing-photos";
      await supabase.storage.from(bucket).remove([m.storage_path]);
    }
    await supabase.from("listing_media").delete().eq("id", m.id);
    load();
  };

  if (loading || authLoading)
    return (
      <SiteLayout>
        <div className="p-12 text-center">Loading…</div>
      </SiteLayout>
    );
  if (!listing)
    return (
      <SiteLayout>
        <div className="p-12 text-center">Listing not found.</div>
      </SiteLayout>
    );

  const photos = media.filter((m) => m.type === "photo");
  const videos = media.filter((m) => m.type === "video");
  const maxPhotos = listing.plan === "upgraded" ? Math.max(20, planLimits.maxPhotosPerListing) : Math.max(5, planLimits.maxPhotosPerListing);

  return (
    <SiteLayout>
      <div className="container mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-display text-3xl font-bold">Edit listing</h1>
        <p className="text-muted-foreground">Update details for "{listing.title}".</p>

        <form onSubmit={save} className="mt-8 space-y-6">
          <section className="space-y-4 rounded-xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-semibold">Basics</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div>
                <Label>Price (₱)</Label>
                <Input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} required />
              </div>
              <div>
                <Label>Condition</Label>
                <Select value={condition} onValueChange={setCondition}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Brand new">Brand new</SelectItem>
                    <SelectItem value="Used">Used</SelectItem>
                    <SelectItem value="For parts">For parts</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Description</Label>
                <Textarea rows={5} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-semibold">Location & contact</h2>
            <LocationPicker
              value={{ region, province, city, barangay }}
              onChange={(v) => {
                setRegion(v.region ?? null);
                setProvince(v.province ?? null);
                setCity(v.city ?? null);
                setBarangay(v.barangay ?? null);
              }}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Contact phone</Label>
                <PhoneInput iso={phoneIso} national={phoneNational} onChange={({ iso, national }) => { setPhoneIso(iso); setPhoneNational(national); }} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  id="allow-msg"
                  type="checkbox"
                  checked={allowMessages}
                  onChange={(e) => setAllowMessages(e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                <Label htmlFor="allow-msg" className="cursor-pointer">Allow buyer messages</Label>
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-semibold">
              Photos ({photos.length}/{maxPhotos})
            </h2>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {photos.map((m) => (
                <div key={m.id} className="relative aspect-square overflow-hidden rounded-md bg-secondary">
                  <img src={m.url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeMedia(m)}
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {photos.length < maxPhotos && (
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-border text-muted-foreground hover:bg-secondary/50">
                  <Upload className="h-5 w-5" />
                  <span className="mt-1 text-xs">Add</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={addPhotos} />
                </label>
              )}
            </div>
            {videos.length > 0 && (
              <div>
                <Label>Videos</Label>
                <div className="mt-2 space-y-2">
                  {videos.map((m) => (
                    <div key={m.id} className="flex items-center justify-between rounded-md border border-border p-2">
                      <video src={m.url} controls className="h-16 w-28 rounded bg-black object-cover" />
                      <Button type="button" variant="outline" size="sm" onClick={() => removeMedia(m)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <div className="flex justify-end gap-2">
            <Button asChild type="button" variant="outline">
              <Link to="/dashboard">Cancel</Link>
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </div>
    </SiteLayout>
  );
}
