import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Package, MapPin } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  listMyNetworkInquiries,
  type NetworkInquiryStatus,
} from "@/lib/network-stock.functions";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/parts/my-requests")({
  head: () => ({
    meta: [
      { title: "My part requests — 365 Motor Sales" },
      { name: "description", content: "Track the parts you requested from shops in the 365 network." },
    ],
  }),
  component: MyRequestsPage,
});

const STATUS_LABEL: Record<NetworkInquiryStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
  fulfilled: "Fulfilled",
  closed: "Closed",
};

const STATUS_VARIANT: Record<NetworkInquiryStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "default",
  accepted: "secondary",
  rejected: "destructive",
  fulfilled: "outline",
  closed: "outline",
};

function MyRequestsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const loadFn = useServerFn(listMyNetworkInquiries);

  const q = useQuery({
    queryKey: ["my-network-inquiries", user?.id],
    enabled: !!user?.id,
    queryFn: () => loadFn(),
  });

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`my-inq-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "network_part_inquiries",
          filter: `requester_user_id=eq.${user.id}`,
        },
        () => qc.invalidateQueries({ queryKey: ["my-network-inquiries", user.id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, qc]);

  const rows = q.data ?? [];

  return (
    <SiteLayout>
      <section className="container mx-auto max-w-4xl px-4 py-10">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">My part requests</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Live status from every 365 network shop you've contacted.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/parts/network">Search network stock</Link>
          </Button>
        </div>

        {q.isLoading ? (
          <Card className="p-6 text-sm text-muted-foreground">Loading…</Card>
        ) : rows.length === 0 ? (
          <Card className="p-8 text-center">
            <Package className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-semibold">No requests yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              When you request a part from a shop, it'll show up here with live status.
            </p>
            <Button asChild className="mt-4">
              <Link to="/parts/network">Browse network stock</Link>
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {rows.map((r: any) => {
              const status = (r.status ?? "pending") as NetworkInquiryStatus;
              const biz = r.businesses;
              return (
                <Card key={r.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">
                        {r.part_name}
                        {r.sku && (
                          <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                            SKU {r.sku}
                          </span>
                        )}
                      </p>
                      {biz && (
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          <Link to="/b/$slug" params={{ slug: biz.slug }} className="hover:underline">
                            {biz.name}
                          </Link>
                          {(biz.city || biz.province) && (
                            <span className="ml-2 inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {[biz.city, biz.province].filter(Boolean).join(", ")}
                            </span>
                          )}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        Qty {Number(r.quantity)} · Requested{" "}
                        {new Date(r.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={STATUS_VARIANT[status]} className="capitalize">
                      {STATUS_LABEL[status]}
                    </Badge>
                  </div>
                  {(r.fulfilled_price != null ||
                    r.fulfilled_quantity != null ||
                    r.fulfilled_eta ||
                    r.fulfilled_message) && (
                    <div className="mt-3 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
                      <p className="text-[10px] uppercase tracking-wide text-primary">
                        Fulfillment update
                      </p>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                        {r.fulfilled_price != null && (
                          <span>
                            <span className="text-muted-foreground">Price:</span>{" "}
                            <span className="font-semibold">
                              ₱{Number(r.fulfilled_price).toLocaleString()}
                            </span>
                          </span>
                        )}
                        {r.fulfilled_quantity != null && (
                          <span>
                            <span className="text-muted-foreground">Qty:</span>{" "}
                            <span className="font-semibold">
                              {Number(r.fulfilled_quantity)}
                            </span>
                          </span>
                        )}
                        {r.fulfilled_eta && (
                          <span>
                            <span className="text-muted-foreground">ETA:</span>{" "}
                            <span className="font-semibold">
                              {new Date(r.fulfilled_eta).toLocaleString()}
                            </span>
                          </span>
                        )}
                      </div>
                      {r.fulfilled_message && (
                        <p className="mt-2">{r.fulfilled_message}</p>
                      )}
                    </div>
                  )}
                  {r.response_note && (
                    <div className="mt-3 rounded-md border bg-muted/40 p-3 text-sm">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Shop reply
                      </p>
                      <p className="mt-1">{r.response_note}</p>
                    </div>
                  )}
                  {r.responded_at && (
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Updated {new Date(r.responded_at).toLocaleString()}
                    </p>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </SiteLayout>
  );
}
