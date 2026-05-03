import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Truck, Clock, MapPin, CheckCircle2, XCircle, Inbox, Gavel, Settings2, PackageCheck, PackageOpen, Receipt } from "lucide-react";
import { formatPHP } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/dashboard/tow")({
  head: () => ({
    meta: [
      { title: "Tow requests — Provider dashboard" },
      { name: "description", content: "Bid on open tow jobs, manage direct requests, and set your standard rates." },
    ],
  }),
  component: TowProviderDashboard,
});

type TowRequest = {
  id: string;
  requester_id: string;
  provider_id: string | null;
  listing_id: string | null;
  vehicle_summary: string;
  status: string;
  pickup_region: string | null;
  pickup_province: string | null;
  pickup_city: string | null;
  pickup_address: string | null;
  dropoff_region: string | null;
  dropoff_city: string | null;
  dropoff_address: string | null;
  needed_at: string | null;
  notes: string | null;
  created_at: string;
  picked_up_at: string | null;
  dropped_off_at: string | null;
  completed_at: string | null;
  eta_minutes: number | null;
  final_price_php: number | null;
  completion_notes: string | null;
};

type TowBid = {
  id: string;
  request_id: string;
  provider_id: string;
  price_php: number;
  eta_minutes: number | null;
  note: string | null;
  status: string;
  created_at: string;
};

type ProviderRates = {
  user_id: string;
  flat_base_php: number | null;
  per_km_php: number | null;
  min_php: number | null;
  available_24_7: boolean;
  notes: string | null;
};

function TowProviderDashboard() {
  const { user } = useAuth();
  const [isProvider, setIsProvider] = useState<boolean | null>(null);
  const [requests, setRequests] = useState<TowRequest[]>([]);
  const [bids, setBids] = useState<TowBid[]>([]);
  const [providerNames, setProviderNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [declineTarget, setDeclineTarget] = useState<TowRequest | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [declining, setDeclining] = useState(false);

  // Bid dialog state
  const [bidTarget, setBidTarget] = useState<TowRequest | null>(null);
  const [bidPrice, setBidPrice] = useState("");
  const [bidEta, setBidEta] = useState("");
  const [bidNote, setBidNote] = useState("");
  const [bidSubmitting, setBidSubmitting] = useState(false);

  // Pickup / dropoff / confirm-completion dialog state
  const [pickupTarget, setPickupTarget] = useState<TowRequest | null>(null);
  const [pickupEta, setPickupEta] = useState("");
  const [dropoffTarget, setDropoffTarget] = useState<TowRequest | null>(null);
  const [dropoffPrice, setDropoffPrice] = useState("");
  const [dropoffNotes, setDropoffNotes] = useState("");
  const [confirmTarget, setConfirmTarget] = useState<TowRequest | null>(null);
  const [stageSubmitting, setStageSubmitting] = useState(false);

  // Provider rates
  const [rates, setRates] = useState<ProviderRates | null>(null);
  const [savingRates, setSavingRates] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: reqData }, { data: bidData }, { data: listings }, { data: rateData }] = await Promise.all([
      supabase.from("tow_requests").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("tow_bids").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("listings").select("id").eq("user_id", user.id).eq("category_slug", "towing").in("status", ["active", "pending_sale"]).limit(1),
      supabase.from("provider_tow_rates").select("*").eq("user_id", user.id).maybeSingle(),
    ]);
    setRequests((reqData as TowRequest[]) ?? []);
    setBids((bidData as TowBid[]) ?? []);
    setIsProvider((listings ?? []).length > 0);
    setRates(rateData as ProviderRates ?? null);
    setLoading(false);

    // Resolve provider display names for bids on my requests
    const myReqIds = new Set((reqData ?? []).filter((r: any) => r.requester_id === user.id).map((r: any) => r.id));
    const providerIds = Array.from(new Set((bidData ?? []).filter((b: any) => myReqIds.has(b.request_id)).map((b: any) => b.provider_id)));
    if (providerIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id,full_name,business_name").in("id", providerIds);
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p: any) => { map[p.id] = p.business_name || p.full_name || "Provider"; });
      setProviderNames(map);
    }
  };

  useEffect(() => { load(); }, [user]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("tow_dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "tow_requests" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "tow_bids" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const direct = useMemo(() => requests.filter(r => r.provider_id === user?.id), [requests, user]);
  const broadcast = useMemo(() => requests.filter(r => r.provider_id === null && r.status === "open"), [requests]);
  const mine = useMemo(() => requests.filter(r => r.requester_id === user?.id), [requests, user]);

  const myBidFor = (requestId: string) => bids.find(b => b.request_id === requestId && b.provider_id === user?.id);
  const bidsForRequest = (requestId: string) => bids.filter(b => b.request_id === requestId && b.status !== "withdrawn");

  // ==== Direct request actions ====
  const accept = async (r: TowRequest) => {
    if (!user) return;
    const { error } = await supabase.from("tow_requests").update({ provider_id: user.id, status: "accepted" }).eq("id", r.id);
    if (error) return toast.error(error.message);
    if (r.listing_id) {
      await supabase.from("messages").insert({
        listing_id: r.listing_id, sender_id: user.id, recipient_id: r.requester_id,
        body: `I've accepted your tow request for "${r.vehicle_summary}". I'll be in touch with timing and ETA.`,
      });
    }
    toast.success("Request accepted");
    load();
  };

  const decline = (r: TowRequest) => {
    if (!user) return;
    if (r.provider_id === user.id) {
      setDeclineReason(""); setDeclineTarget(r);
    } else {
      setRequests(prev => prev.filter(x => x.id !== r.id));
    }
  };

  const confirmDecline = async () => {
    if (!user || !declineTarget) return;
    const r = declineTarget;
    setDeclining(true);
    try {
      const { error } = await supabase.from("tow_requests").update({ status: "cancelled" }).eq("id", r.id);
      if (error) throw error;
      const reason = declineReason.trim();
      const body = reason
        ? `I'm unable to take your tow request for "${r.vehicle_summary}". Reason: ${reason}`
        : `I'm unable to take your tow request for "${r.vehicle_summary}".`;
      const msg: any = { sender_id: user.id, recipient_id: r.requester_id, body };
      if (r.listing_id) msg.listing_id = r.listing_id;
      const { error: msgErr } = await supabase.from("messages").insert(msg);
      if (msgErr) throw msgErr;
      toast.success("Request declined");
      setDeclineTarget(null); setDeclineReason("");
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to decline");
    } finally {
      setDeclining(false);
    }
  };

  // (legacy direct-complete removed — use pickup → dropoff → customer confirm flow)


  const acceptedBidPriceFor = (r: TowRequest): number | null => {
    const accepted = bids.find(b => b.request_id === r.id && b.status === "accepted");
    return accepted ? Number(accepted.price_php) : null;
  };

  const openPickup = (r: TowRequest) => {
    setPickupEta(r.eta_minutes != null ? String(r.eta_minutes) : "");
    setPickupTarget(r);
  };

  const submitPickup = async () => {
    if (!pickupTarget) return;
    const etaNum = pickupEta ? Number(pickupEta) : null;
    if (etaNum != null && (!Number.isFinite(etaNum) || etaNum < 0)) { toast.error("Enter a valid ETA"); return; }
    setStageSubmitting(true);
    try {
      const { error } = await supabase.from("tow_requests")
        .update({ status: "picked_up", eta_minutes: etaNum })
        .eq("id", pickupTarget.id);
      if (error) throw error;
      toast.success("Marked picked up — customer notified");
      setPickupTarget(null);
      load();
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
    finally { setStageSubmitting(false); }
  };

  const updateEta = async (r: TowRequest, eta: number | null) => {
    const { error } = await supabase.from("tow_requests").update({ eta_minutes: eta }).eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("ETA updated");
    load();
  };

  const openDropoff = (r: TowRequest) => {
    const fallback = acceptedBidPriceFor(r);
    setDropoffPrice(r.final_price_php != null ? String(r.final_price_php) : (fallback != null ? String(fallback) : ""));
    setDropoffNotes(r.completion_notes ?? "");
    setDropoffTarget(r);
  };

  const submitDropoff = async () => {
    if (!dropoffTarget) return;
    const price = Number(dropoffPrice);
    if (!Number.isFinite(price) || price < 0) { toast.error("Enter the final bill amount"); return; }
    setStageSubmitting(true);
    try {
      const { error } = await supabase.from("tow_requests")
        .update({ status: "dropped_off", final_price_php: price, completion_notes: dropoffNotes.trim() || null })
        .eq("id", dropoffTarget.id);
      if (error) throw error;
      toast.success("Marked dropped off — waiting for customer to confirm");
      setDropoffTarget(null);
      load();
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
    finally { setStageSubmitting(false); }
  };

  const confirmCompletion = async () => {
    if (!confirmTarget) return;
    setStageSubmitting(true);
    try {
      const { error } = await supabase.from("tow_requests")
        .update({ status: "completed" })
        .eq("id", confirmTarget.id);
      if (error) throw error;
      toast.success("Job completed — provider notified");
      setConfirmTarget(null);
      load();
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
    finally { setStageSubmitting(false); }
  };

  // ==== Bid flow ====
  const openBid = (r: TowRequest) => {
    const existing = myBidFor(r.id);
    if (existing) {
      setBidPrice(String(existing.price_php));
      setBidEta(existing.eta_minutes != null ? String(existing.eta_minutes) : "");
      setBidNote(existing.note ?? "");
    } else {
      // Pre-fill from standard rates if set
      setBidPrice(rates?.flat_base_php != null ? String(rates.flat_base_php) : "");
      setBidEta("");
      setBidNote(rates?.notes ?? "");
    }
    setBidTarget(r);
  };

  const submitBid = async () => {
    if (!user || !bidTarget) return;
    if (bidTarget.status !== "open") { toast.error("This request is no longer open"); return; }
    const price = Number(bidPrice);
    if (!Number.isFinite(price) || price < 0) { toast.error("Enter a valid price"); return; }
    const etaNum = bidEta ? Number(bidEta) : null;
    if (etaNum != null && (!Number.isFinite(etaNum) || etaNum < 0)) { toast.error("Enter a valid ETA"); return; }
    setBidSubmitting(true);
    try {
      const existing = myBidFor(bidTarget.id);
      if (existing && existing.status === "pending") {
        const { error } = await supabase.from("tow_bids")
          .update({ price_php: price, eta_minutes: etaNum, note: bidNote.trim() || null })
          .eq("id", existing.id)
          .eq("status", "pending");
        if (error) throw error;
        toast.success("Bid updated");
      } else if (existing) {
        // Existing row is withdrawn/declined — revive as a fresh pending bid
        const { error } = await supabase.from("tow_bids")
          .update({ price_php: price, eta_minutes: etaNum, note: bidNote.trim() || null, status: "pending" })
          .eq("id", existing.id);
        if (error) throw error;
        toast.success("Bid submitted");
      } else {
        const { error } = await supabase.from("tow_bids").insert({
          request_id: bidTarget.id,
          provider_id: user.id,
          price_php: price,
          eta_minutes: etaNum,
          note: bidNote.trim() || null,
          status: "pending",
        });
        if (error) throw error;
        toast.success("Bid submitted");
      }
      setBidTarget(null);
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to submit bid");
    } finally {
      setBidSubmitting(false);
    }
  };

  const withdrawBid = async (bidId: string) => {
    const { error } = await supabase.from("tow_bids")
      .update({ status: "withdrawn" })
      .eq("id", bidId)
      .eq("status", "pending");
    if (error) return toast.error(error.message);
    toast.success("Bid withdrawn");
    load();
  };

  const acceptBid = async (b: TowBid) => {
    const { error } = await supabase.from("tow_bids").update({ status: "accepted" }).eq("id", b.id);
    if (error) return toast.error(error.message);
    toast.success("Bid accepted — provider notified");
    load();
  };

  // ==== Standard rates ====
  const saveRates = async (next: Partial<ProviderRates>) => {
    if (!user) return;
    setSavingRates(true);
    try {
      const row = {
        user_id: user.id,
        flat_base_php: next.flat_base_php ?? rates?.flat_base_php ?? null,
        per_km_php: next.per_km_php ?? rates?.per_km_php ?? null,
        min_php: next.min_php ?? rates?.min_php ?? null,
        available_24_7: next.available_24_7 ?? rates?.available_24_7 ?? false,
        notes: next.notes ?? rates?.notes ?? null,
      };
      const { error } = await supabase.from("provider_tow_rates").upsert(row);
      if (error) throw error;
      toast.success("Rates saved");
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save rates");
    } finally {
      setSavingRates(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <header className="flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Truck className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold md:text-3xl">Tow requests</h1>
          <p className="text-sm text-muted-foreground">
            {isProvider
              ? "Bid on open jobs, manage direct requests, and set your standard rates."
              : "Post a towing listing to start receiving and bidding on open requests in your area."}
          </p>
        </div>
      </header>

      <Tabs defaultValue={isProvider ? "broadcast" : "mine"}>
        <TabsList>
          <TabsTrigger value="direct">Direct <Badge variant="secondary" className="ml-2">{direct.length}</Badge></TabsTrigger>
          <TabsTrigger value="broadcast">Open jobs <Badge variant="secondary" className="ml-2">{broadcast.length}</Badge></TabsTrigger>
          <TabsTrigger value="mine">Sent by me <Badge variant="secondary" className="ml-2">{mine.length}</Badge></TabsTrigger>
          {isProvider && <TabsTrigger value="rates"><Settings2 className="mr-1 h-3.5 w-3.5" />Rates</TabsTrigger>}
        </TabsList>

        <TabsContent value="direct" className="mt-4">
          <RequestList
            items={direct}
            empty="No direct requests yet. When customers tap “Request a tow from this provider” on your listing, jobs land here."
            renderExtra={(r) => <ProviderJobStage r={r} onUpdateEta={(eta) => updateEta(r, eta)} />}
            renderActions={(r) => (
              <div className="flex flex-wrap gap-2">
                {r.status === "open" && (
                  <>
                    <Button size="sm" onClick={() => accept(r)}>Accept</Button>
                    <Button size="sm" variant="outline" onClick={() => decline(r)}>Decline</Button>
                  </>
                )}
                {r.status === "accepted" && (
                  <Button size="sm" onClick={() => openPickup(r)}>
                    <PackageCheck className="mr-1 h-3.5 w-3.5" />Mark picked up
                  </Button>
                )}
                {r.status === "picked_up" && (
                  <Button size="sm" onClick={() => openDropoff(r)}>
                    <PackageOpen className="mr-1 h-3.5 w-3.5" />Mark dropped off
                  </Button>
                )}
              </div>
            )}
          />
        </TabsContent>

        <TabsContent value="broadcast" className="mt-4">
          {!isProvider ? (
            <EmptyCard text="Open broadcast jobs are visible only to active towing providers." />
          ) : (
            <RequestList
              items={broadcast}
              empty="No open broadcast jobs in your coverage region right now."
              renderExtra={(r) => {
                const my = myBidFor(r.id);
                if (!my) return null;
                return (
                  <div className="mt-2 rounded-md border border-border bg-muted/40 p-2 text-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        Your bid: <span className="font-semibold">₱{my.price_php}</span>
                        {my.eta_minutes != null && <> · ETA {my.eta_minutes}m</>}
                      </div>
                      <BidStatusBadge status={my.status} />
                    </div>
                    {my.note && <div className="mt-1 text-muted-foreground">{my.note}</div>}
                  </div>
                );
              }}
              renderActions={(r) => {
                const my = myBidFor(r.id);
                const requestOpen = r.status === "open";
                const canEdit = !my || my.status === "pending" || my.status === "withdrawn" || my.status === "declined";
                if (!requestOpen) {
                  return <div className="text-xs text-muted-foreground">Request closed</div>;
                }
                return (
                  <div className="flex flex-wrap gap-2">
                    {canEdit && (
                      <Button size="sm" onClick={() => openBid(r)}>
                        <Gavel className="mr-1 h-3.5 w-3.5" />
                        {my && my.status === "pending" ? "Update bid" : my ? "Re-bid" : "Place bid"}
                      </Button>
                    )}
                    {my && my.status === "pending" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost">Withdraw</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Withdraw your bid?</AlertDialogTitle>
                            <AlertDialogDescription>
                              The customer will no longer see this bid. You can place a new one while the request is still open.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep bid</AlertDialogCancel>
                            <AlertDialogAction onClick={() => withdrawBid(my.id)}>Withdraw</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                );
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="mine" className="mt-4">
          <RequestList
            items={mine}
            empty="You haven't requested any tows yet."
            renderExtra={(r) => {
              const list = bidsForRequest(r.id);
              const showBids = !r.provider_id && list.length > 0;
              return (
                <>
                  <CustomerJobStage r={r} />
                  {showBids && (
                    <div className="mt-3 space-y-2">
                      <div className="text-sm font-medium">{list.length} bid{list.length === 1 ? "" : "s"}</div>
                      <ul className="space-y-2">
                        {list.map((b) => (
                          <li key={b.id} className="rounded-md border border-border bg-muted/40 p-3">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">{providerNames[b.provider_id] ?? "Provider"}</span>
                                  <BidStatusBadge status={b.status} />
                                </div>
                                <div className="text-sm">
                                  <span className="font-semibold">₱{b.price_php}</span>
                                  {b.eta_minutes != null && <span className="text-muted-foreground"> · ETA {b.eta_minutes}m</span>}
                                </div>
                                {b.note && <div className="mt-1 text-sm text-muted-foreground">{b.note}</div>}
                              </div>
                              {r.status === "open" && b.status === "pending" && (
                                <Button size="sm" onClick={() => acceptBid(b)}>Accept bid</Button>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              );
            }}
            renderActions={(r) => (
              <div className="flex flex-wrap gap-2">
                {r.status === "dropped_off" && (
                  <Button size="sm" onClick={() => setConfirmTarget(r)}>
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" />Confirm completion
                  </Button>
                )}
                {(r.status === "open" || r.status === "accepted") && (
                  <Button size="sm" variant="outline" onClick={async () => {
                    await supabase.from("tow_requests").update({ status: "cancelled" }).eq("id", r.id);
                    load();
                  }}>Cancel</Button>
                )}
              </div>
            )}
          />
        </TabsContent>

        {isProvider && (
          <TabsContent value="rates" className="mt-4">
            <RatesForm rates={rates} saving={savingRates} onSave={saveRates} />
          </TabsContent>
        )}
      </Tabs>

      {/* Decline dialog */}
      <Dialog open={!!declineTarget} onOpenChange={(o) => { if (!o) { setDeclineTarget(null); setDeclineReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline tow request</DialogTitle>
            <DialogDescription>The requester will get a message letting them know. Adding a reason is optional but helpful.</DialogDescription>
          </DialogHeader>
          <Textarea rows={4} value={declineReason} onChange={(e) => setDeclineReason(e.target.value)}
            placeholder="e.g. Out of coverage area, vehicle too heavy for my flatbed, fully booked that day…" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineTarget(null)} disabled={declining}>Cancel</Button>
            <Button onClick={confirmDecline} disabled={declining}>{declining ? "Declining…" : "Decline & notify"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bid dialog */}
      <Dialog open={!!bidTarget} onOpenChange={(o) => { if (!o) setBidTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{myBidFor(bidTarget?.id ?? "") ? "Update your bid" : "Place a bid"}</DialogTitle>
            <DialogDescription>
              {bidTarget?.vehicle_summary} · {[bidTarget?.pickup_city, bidTarget?.pickup_region].filter(Boolean).join(", ")} → {[bidTarget?.dropoff_city, bidTarget?.dropoff_region].filter(Boolean).join(", ")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="bidPrice">Price (₱)</Label>
              <Input id="bidPrice" type="number" min={0} step="any" value={bidPrice} onChange={(e) => setBidPrice(e.target.value)} placeholder="e.g. 2500" />
            </div>
            <div>
              <Label htmlFor="bidEta">ETA (minutes, optional)</Label>
              <Input id="bidEta" type="number" min={0} value={bidEta} onChange={(e) => setBidEta(e.target.value)} placeholder="e.g. 45" />
            </div>
            <div>
              <Label htmlFor="bidNote">Note to customer (optional)</Label>
              <Textarea id="bidNote" rows={3} value={bidNote} onChange={(e) => setBidNote(e.target.value)}
                placeholder="What's included, equipment used, conditions…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBidTarget(null)} disabled={bidSubmitting}>Cancel</Button>
            <Button onClick={submitBid} disabled={bidSubmitting}>{bidSubmitting ? "Submitting…" : (myBidFor(bidTarget?.id ?? "")?.status === "pending" ? "Save changes" : "Submit bid")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pickup dialog */}
      <Dialog open={!!pickupTarget} onOpenChange={(o) => { if (!o) setPickupTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as picked up</DialogTitle>
            <DialogDescription>The customer will be notified that the vehicle is on the way.</DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="pickupEta">Drop-off ETA (minutes, optional)</Label>
            <Input id="pickupEta" type="number" min={0} value={pickupEta} onChange={(e) => setPickupEta(e.target.value)} placeholder="e.g. 30" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPickupTarget(null)} disabled={stageSubmitting}>Cancel</Button>
            <Button onClick={submitPickup} disabled={stageSubmitting}>{stageSubmitting ? "Saving…" : "Mark picked up"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dropoff dialog */}
      <Dialog open={!!dropoffTarget} onOpenChange={(o) => { if (!o) setDropoffTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as dropped off</DialogTitle>
            <DialogDescription>Record the final bill. The customer will get a notification to confirm completion.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="finalPrice">Final bill (₱)</Label>
              <Input id="finalPrice" type="number" min={0} step="any" value={dropoffPrice} onChange={(e) => setDropoffPrice(e.target.value)} placeholder="e.g. 2500" />
            </div>
            <div>
              <Label htmlFor="finalNotes">Notes (optional)</Label>
              <Textarea id="finalNotes" rows={3} value={dropoffNotes} onChange={(e) => setDropoffNotes(e.target.value)} placeholder="Extra distance, waiting time, etc." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDropoffTarget(null)} disabled={stageSubmitting}>Cancel</Button>
            <Button onClick={submitDropoff} disabled={stageSubmitting}>{stageSubmitting ? "Saving…" : "Mark dropped off"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer confirm completion */}
      <Dialog open={!!confirmTarget} onOpenChange={(o) => { if (!o) setConfirmTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm job completion</DialogTitle>
            <DialogDescription>
              {confirmTarget && (
                <>Final bill: <span className="font-semibold">{formatPHP(confirmTarget.final_price_php ?? 0)}</span>. Confirming will close the job and notify the provider.</>
              )}
            </DialogDescription>
          </DialogHeader>
          {confirmTarget?.completion_notes && (
            <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">{confirmTarget.completion_notes}</div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmTarget(null)} disabled={stageSubmitting}>Not yet</Button>
            <Button onClick={confirmCompletion} disabled={stageSubmitting}>{stageSubmitting ? "Confirming…" : "Confirm completion"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProviderJobStage({ r, onUpdateEta }: { r: TowRequest; onUpdateEta: (eta: number | null) => void }) {
  const [eta, setEta] = useState(r.eta_minutes != null ? String(r.eta_minutes) : "");
  if (r.status !== "picked_up" && r.status !== "dropped_off" && r.status !== "completed") return null;
  return (
    <div className="mt-3 space-y-2 rounded-md border border-border bg-muted/40 p-3 text-sm">
      {r.status === "picked_up" && (
        <>
          <div className="flex items-center gap-1 font-medium"><PackageCheck className="h-4 w-4" />Picked up {r.picked_up_at && <span className="text-muted-foreground">· {new Date(r.picked_up_at).toLocaleString()}</span>}</div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label htmlFor={`eta-${r.id}`} className="text-xs">Drop-off ETA (min)</Label>
              <Input id={`eta-${r.id}`} type="number" min={0} value={eta} onChange={(e) => setEta(e.target.value)} className="h-8" />
            </div>
            <Button size="sm" variant="outline" onClick={() => onUpdateEta(eta === "" ? null : Number(eta))}>Update ETA</Button>
          </div>
        </>
      )}
      {(r.status === "dropped_off" || r.status === "completed") && (
        <>
          <div className="flex items-center gap-1 font-medium"><PackageOpen className="h-4 w-4" />Dropped off {r.dropped_off_at && <span className="text-muted-foreground">· {new Date(r.dropped_off_at).toLocaleString()}</span>}</div>
          <div className="flex items-center gap-1"><Receipt className="h-4 w-4" />Final bill: <span className="font-semibold">{formatPHP(r.final_price_php ?? 0)}</span></div>
          {r.status === "dropped_off" && <div className="text-xs text-muted-foreground">Waiting for customer to confirm completion.</div>}
          {r.status === "completed" && <div className="text-xs text-muted-foreground">Customer confirmed {r.completed_at && new Date(r.completed_at).toLocaleString()}.</div>}
        </>
      )}
    </div>
  );
}

function CustomerJobStage({ r }: { r: TowRequest }) {
  if (!["accepted", "picked_up", "dropped_off", "completed"].includes(r.status)) return null;
  return (
    <div className="mt-3 space-y-1 rounded-md border border-border bg-muted/40 p-3 text-sm">
      {r.status === "accepted" && <div className="text-muted-foreground">Provider accepted. They'll let you know once your vehicle is picked up.</div>}
      {r.status === "picked_up" && (
        <>
          <div className="flex items-center gap-1 font-medium text-foreground"><PackageCheck className="h-4 w-4" />Vehicle picked up</div>
          {r.picked_up_at && <div className="text-xs text-muted-foreground">{new Date(r.picked_up_at).toLocaleString()}</div>}
          {r.eta_minutes != null && <div>Estimated drop-off in <span className="font-semibold">{r.eta_minutes} minutes</span>.</div>}
        </>
      )}
      {r.status === "dropped_off" && (
        <>
          <div className="flex items-center gap-1 font-medium text-foreground"><PackageOpen className="h-4 w-4" />Dropped off</div>
          {r.dropped_off_at && <div className="text-xs text-muted-foreground">{new Date(r.dropped_off_at).toLocaleString()}</div>}
          <div className="flex items-center gap-1"><Receipt className="h-4 w-4" />Final bill: <span className="font-semibold">{formatPHP(r.final_price_php ?? 0)}</span></div>
          {r.completion_notes && <div className="text-muted-foreground">{r.completion_notes}</div>}
        </>
      )}
      {r.status === "completed" && (
        <>
          <div className="flex items-center gap-1 font-medium text-foreground"><CheckCircle2 className="h-4 w-4" />Completed</div>
          <div className="flex items-center gap-1"><Receipt className="h-4 w-4" />Final bill: <span className="font-semibold">{formatPHP(r.final_price_php ?? 0)}</span></div>
          {r.completed_at && <div className="text-xs text-muted-foreground">{new Date(r.completed_at).toLocaleString()}</div>}
        </>
      )}
    </div>
  );
}

function RatesForm({ rates, saving, onSave }: {
  rates: ProviderRates | null;
  saving: boolean;
  onSave: (next: Partial<ProviderRates>) => void;
}) {
  const [base, setBase] = useState(rates?.flat_base_php != null ? String(rates.flat_base_php) : "");
  const [perKm, setPerKm] = useState(rates?.per_km_php != null ? String(rates.per_km_php) : "");
  const [min, setMin] = useState(rates?.min_php != null ? String(rates.min_php) : "");
  const [twentyFour, setTwentyFour] = useState(!!rates?.available_24_7);
  const [notes, setNotes] = useState(rates?.notes ?? "");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      flat_base_php: base === "" ? null : Number(base),
      per_km_php: perKm === "" ? null : Number(perKm),
      min_php: min === "" ? null : Number(min),
      available_24_7: twentyFour,
      notes: notes.trim() || null,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-border bg-card p-6">
      <div>
        <h2 className="font-display text-lg font-semibold">Standard rates</h2>
        <p className="text-sm text-muted-foreground">Used to pre-fill your bids and shown to customers as your typical pricing.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="base">Flat base (₱)</Label>
          <Input id="base" type="number" min={0} step="any" value={base} onChange={(e) => setBase(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="perkm">Per km (₱)</Label>
          <Input id="perkm" type="number" min={0} step="any" value={perKm} onChange={(e) => setPerKm(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="min">Minimum charge (₱)</Label>
          <Input id="min" type="number" min={0} step="any" value={min} onChange={(e) => setMin(e.target.value)} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Switch id="247" checked={twentyFour} onCheckedChange={setTwentyFour} />
        <Label htmlFor="247">Available 24/7</Label>
      </div>
      <div>
        <Label htmlFor="rateNotes">Notes</Label>
        <Textarea id="rateNotes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Flatbed available, surcharges for after-hours, accepts GCash…" />
      </div>
      <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save rates"}</Button>
    </form>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
      <Inbox className="h-5 w-5" /> {text}
    </div>
  );
}

function RequestList({
  items, empty, renderActions, renderExtra,
}: {
  items: TowRequest[];
  empty: string;
  renderActions: (r: TowRequest) => React.ReactNode;
  renderExtra?: (r: TowRequest) => React.ReactNode;
}) {
  if (items.length === 0) return <EmptyCard text={empty} />;
  return (
    <ul className="space-y-3">
      {items.map((r) => (
        <li key={r.id} className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="font-semibold">{r.vehicle_summary}</div>
                <StatusBadge status={r.status} />
              </div>
              <div className="mt-1 flex items-start gap-1 text-sm text-muted-foreground">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  {[r.pickup_address, r.pickup_city, r.pickup_region].filter(Boolean).join(", ") || "—"}
                  {" → "}
                  {[r.dropoff_address, r.dropoff_city, r.dropoff_region].filter(Boolean).join(", ") || "—"}
                </span>
              </div>
              {r.needed_at && (
                <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" /> Needed by {new Date(r.needed_at).toLocaleString()}
                </div>
              )}
              {r.notes && <p className="mt-2 text-sm text-muted-foreground">{r.notes}</p>}
              {renderExtra?.(r)}
            </div>
            {renderActions(r)}
          </div>
        </li>
      ))}
    </ul>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "accepted") return <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" />Accepted</Badge>;
  if (status === "picked_up") return <Badge className="gap-1"><PackageCheck className="h-3 w-3" />Picked up</Badge>;
  if (status === "dropped_off") return <Badge className="gap-1"><PackageOpen className="h-3 w-3" />Dropped off</Badge>;
  if (status === "completed") return <Badge variant="secondary" className="gap-1"><CheckCircle2 className="h-3 w-3" />Completed</Badge>;
  if (status === "cancelled") return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Cancelled</Badge>;
  return <Badge variant="outline">Open</Badge>;
}

function BidStatusBadge({ status }: { status: string }) {
  if (status === "accepted") return <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" />Won</Badge>;
  if (status === "declined") return <Badge variant="destructive">Not chosen</Badge>;
  return <Badge variant="outline">Pending</Badge>;
}
