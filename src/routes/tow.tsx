import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Truck, Clock, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { LocationPicker } from "@/components/location-picker";

const searchSchema = z.object({
  listing: z.string().optional(),
  provider: z.string().optional(),
});

export const Route = createFileRoute("/tow")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Request a tow — 365 MotorSales Philippines" },
      {
        name: "description",
        content:
          "Arrange towing or trucking for a vehicle anywhere in the Philippines. Get matched with verified providers.",
      },
    ],
  }),
  component: TowPage,
});

type Loc = {
  region: string | null;
  province: string | null;
  city: string | null;
  barangay: string | null;
};
const emptyLoc: Loc = { region: null, province: null, city: null, barangay: null };

function TowPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();

  const [pickup, setPickup] = useState<Loc>(emptyLoc);
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoff, setDropoff] = useState<Loc>(emptyLoc);
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [vehicleSummary, setVehicleSummary] = useState("");
  const [neededAt, setNeededAt] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [providerName, setProviderName] = useState<string | null>(null);
  const [requests, setRequests] = useState<any[]>([]);

  // Prefill from listing if linked
  useEffect(() => {
    if (!search.listing) return;
    supabase
      .from("listings")
      .select("title,region,province,city,barangay")
      .eq("id", search.listing)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setVehicleSummary((s) => s || data.title);
        setPickup({
          region: data.region ?? null,
          province: data.province ?? null,
          city: data.city ?? null,
          barangay: data.barangay ?? null,
        });
      });
  }, [search.listing]);

  useEffect(() => {
    if (!search.provider) {
      setProviderName(null);
      return;
    }
    supabase
      .from("listings")
      .select("title,user_id")
      .eq("id", search.provider)
      .maybeSingle()
      .then(({ data }) => setProviderName(data?.title ?? null));
  }, [search.provider]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("tow_requests")
      .select("id,vehicle_summary,status,pickup_city,dropoff_city,needed_at,created_at")
      .eq("requester_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setRequests(data ?? []));
  }, [user, submitting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (!vehicleSummary.trim()) {
      toast.error("Describe the vehicle to be towed");
      return;
    }
    if (!pickup.region || !dropoff.region) {
      toast.error("Pickup and dropoff regions are required");
      return;
    }

    setSubmitting(true);
    try {
      // Resolve provider user_id from provider listing if specified
      let providerId: string | null = null;
      if (search.provider) {
        const { data } = await supabase
          .from("listings")
          .select("user_id")
          .eq("id", search.provider)
          .maybeSingle();
        providerId = data?.user_id ?? null;
      }

      const { error } = await supabase.from("tow_requests").insert({
        requester_id: user.id,
        provider_id: providerId,
        listing_id: search.listing ?? null,
        pickup_region: pickup.region,
        pickup_province: pickup.province,
        pickup_city: pickup.city,
        pickup_address: pickupAddress || null,
        dropoff_region: dropoff.region,
        dropoff_province: dropoff.province,
        dropoff_city: dropoff.city,
        dropoff_address: dropoffAddress || null,
        vehicle_summary: vehicleSummary,
        needed_at: neededAt ? new Date(neededAt).toISOString() : null,
        notes: notes || null,
      });
      if (error) throw error;

      // Notify the specific provider via messages so it shows in their inbox
      if (providerId && search.listing) {
        await supabase.from("messages").insert({
          listing_id: search.listing,
          sender_id: user.id,
          recipient_id: providerId,
          body: `Tow request: ${vehicleSummary}\nFrom ${[pickup.city, pickup.region].filter(Boolean).join(", ")} to ${[dropoff.city, dropoff.region].filter(Boolean).join(", ")}${neededAt ? `\nNeeded by ${neededAt}` : ""}${notes ? `\n\n${notes}` : ""}`,
        });
      }

      toast.success(
        providerId
          ? "Request sent — the provider will respond soon."
          : "Request posted to nearby tow providers.",
      );
      setPickupAddress("");
      setDropoffAddress("");
      setVehicleSummary("");
      setNeededAt("");
      setNotes("");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <SiteLayout>
        <div className="p-12 text-center">Loading…</div>
      </SiteLayout>
    );

  return (
    <SiteLayout>
      <div className="border-b border-border bg-secondary/40">
        <div className="container mx-auto px-4 py-10">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold md:text-4xl">Request a tow</h1>
              <p className="text-muted-foreground">
                Arrange towing or delivery for a vehicle anywhere in the Philippines.
              </p>
            </div>
          </div>
          {providerName && (
            <div className="mt-4 rounded-lg border border-border bg-card px-4 py-3 text-sm">
              Sending this request directly to <span className="font-semibold">{providerName}</span>
              .
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto grid gap-8 px-4 py-10 lg:grid-cols-[1fr_360px]">
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="space-y-4 rounded-xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-semibold">Vehicle to be towed</h2>
            <div>
              <Label htmlFor="vs">Description</Label>
              <Input
                id="vs"
                required
                value={vehicleSummary}
                onChange={(e) => setVehicleSummary(e.target.value)}
                placeholder="2018 Honda Civic, non-running"
              />
            </div>
            <div>
              <Label htmlFor="needed">Needed by (optional)</Label>
              <Input
                id="needed"
                type="datetime-local"
                value={neededAt}
                onChange={(e) => setNeededAt(e.target.value)}
              />
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-semibold">Pickup location</h2>
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
              <Label>Street / landmark (optional)</Label>
              <Input value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} />
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-semibold">Dropoff location</h2>
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
              <Label>Street / landmark (optional)</Label>
              <Input value={dropoffAddress} onChange={(e) => setDropoffAddress(e.target.value)} />
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-semibold">Notes</h2>
            <Textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything the driver should know — e.g. low-clearance vehicle, no keys, gate access…"
            />
          </section>

          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? "Submitting…" : search.provider ? "Send to provider" : "Post tow request"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Open requests are visible to verified tow providers, who can bid on the job. You'll see
            all bids on your dashboard and pick the one you like.
          </p>
          <p className="text-xs text-muted-foreground">
            Browsing for a tow provider?{" "}
            <Link
              to="/browse/$category"
              params={{ category: "towing" }}
              className="font-medium text-primary underline"
            >
              See towing & trucking listings
            </Link>
            .
          </p>
        </form>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <h3 className="font-display text-lg font-semibold">Your recent requests</h3>
          {requests.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
              You haven't requested any tows yet.
            </div>
          ) : (
            <ul className="space-y-3">
              {requests.map((r) => (
                <li key={r.id} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium">{r.vehicle_summary}</div>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {[r.pickup_city, "→", r.dropoff_city].filter(Boolean).join(" ")}
                  </div>
                  {r.needed_at && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" /> {new Date(r.needed_at).toLocaleString()}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </SiteLayout>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "accepted")
    return (
      <Badge className="gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Accepted
      </Badge>
    );
  if (status === "completed")
    return (
      <Badge variant="secondary" className="gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Completed
      </Badge>
    );
  if (status === "cancelled")
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" />
        Cancelled
      </Badge>
    );
  return <Badge variant="outline">Open</Badge>;
}
