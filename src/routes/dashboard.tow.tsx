import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Truck, Clock, MapPin, CheckCircle2, XCircle, Inbox } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/dashboard/tow")({
  head: () => ({
    meta: [
      { title: "Tow requests — Provider dashboard" },
      { name: "description", content: "Manage incoming tow requests, accept jobs, and mark them complete." },
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
};

function TowProviderDashboard() {
  const { user } = useAuth();
  const [isProvider, setIsProvider] = useState<boolean | null>(null);
  const [requests, setRequests] = useState<TowRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    // RLS already restricts results to: me as requester, me as provider, or open broadcasts when I'm a provider
    const { data, error } = await supabase
      .from("tow_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) toast.error(error.message);
    setRequests((data as TowRequest[]) ?? []);

    const { data: listings } = await supabase
      .from("listings")
      .select("id")
      .eq("user_id", user.id)
      .eq("category_slug", "towing")
      .in("status", ["active", "pending_sale"])
      .limit(1);
    setIsProvider((listings ?? []).length > 0);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  // Realtime: refresh on any tow_requests change
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("tow_requests_dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "tow_requests" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const direct = useMemo(() => requests.filter(r => r.provider_id === user?.id), [requests, user]);
  const broadcast = useMemo(() => requests.filter(r => r.provider_id === null && r.status === "open"), [requests]);
  const mine = useMemo(() => requests.filter(r => r.requester_id === user?.id), [requests, user]);

  const accept = async (r: TowRequest) => {
    if (!user) return;
    const { error } = await supabase
      .from("tow_requests")
      .update({ provider_id: user.id, status: "accepted" })
      .eq("id", r.id);
    if (error) return toast.error(error.message);
    // Notify the requester
    if (r.listing_id) {
      await supabase.from("messages").insert({
        listing_id: r.listing_id,
        sender_id: user.id,
        recipient_id: r.requester_id,
        body: `I've accepted your tow request for "${r.vehicle_summary}". I'll be in touch with timing and ETA.`,
      });
    }
    toast.success("Request accepted");
    load();
  };

  const decline = async (r: TowRequest) => {
    if (!user) return;
    // For direct requests, mark cancelled. For broadcasts, just hide locally (we can't delete others' requests).
    if (r.provider_id === user.id) {
      const { error } = await supabase.from("tow_requests").update({ status: "cancelled" }).eq("id", r.id);
      if (error) return toast.error(error.message);
      toast.success("Request declined");
      load();
    } else {
      setRequests(prev => prev.filter(x => x.id !== r.id));
    }
  };

  const complete = async (r: TowRequest) => {
    const { error } = await supabase.from("tow_requests").update({ status: "completed" }).eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Marked completed");
    load();
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
              ? "Accept, decline, and complete jobs from customers."
              : "Post a towing listing to start receiving open broadcast requests in your area."}
          </p>
        </div>
      </header>

      <Tabs defaultValue={isProvider ? "direct" : "mine"}>
        <TabsList>
          <TabsTrigger value="direct">
            Direct <Badge variant="secondary" className="ml-2">{direct.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="broadcast">
            Open jobs <Badge variant="secondary" className="ml-2">{broadcast.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="mine">
            Sent by me <Badge variant="secondary" className="ml-2">{mine.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="direct" className="mt-4">
          <RequestList
            items={direct}
            empty="No direct requests yet. When customers tap “Request a tow from this provider” on your listing, jobs land here."
            renderActions={(r) => (
              <div className="flex flex-wrap gap-2">
                {r.status === "open" && (
                  <>
                    <Button size="sm" onClick={() => accept(r)}>Accept</Button>
                    <Button size="sm" variant="outline" onClick={() => decline(r)}>Decline</Button>
                  </>
                )}
                {r.status === "accepted" && (
                  <Button size="sm" onClick={() => complete(r)}>Mark completed</Button>
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
              renderActions={(r) => (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => accept(r)}>Claim job</Button>
                  <Button size="sm" variant="ghost" onClick={() => decline(r)}>Hide</Button>
                </div>
              )}
            />
          )}
        </TabsContent>

        <TabsContent value="mine" className="mt-4">
          <RequestList
            items={mine}
            empty="You haven't requested any tows yet."
            renderActions={(r) => (
              r.status === "open" || r.status === "accepted" ? (
                <Button size="sm" variant="outline" onClick={async () => {
                  await supabase.from("tow_requests").update({ status: "cancelled" }).eq("id", r.id);
                  load();
                }}>Cancel</Button>
              ) : null
            )}
          />
        </TabsContent>
      </Tabs>
    </div>
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
  items, empty, renderActions,
}: {
  items: TowRequest[];
  empty: string;
  renderActions: (r: TowRequest) => React.ReactNode;
}) {
  if (items.length === 0) return <EmptyCard text={empty} />;
  return (
    <ul className="space-y-3">
      {items.map((r) => (
        <li key={r.id} className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
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
  if (status === "completed") return <Badge variant="secondary" className="gap-1"><CheckCircle2 className="h-3 w-3" />Completed</Badge>;
  if (status === "cancelled") return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Cancelled</Badge>;
  return <Badge variant="outline">Open</Badge>;
}
