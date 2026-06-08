import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Rocket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { formatPHP, formatDate } from "@/lib/format";

export const Route = createFileRoute("/dashboard/boosts")({
  component: BoostHistoryPage,
  head: () => ({
    meta: [
      { title: "Boost history — 365 Motor Sales" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

type BoostRow = {
  id: string;
  listing_id: string;
  product_slug: string;
  starts_at: string;
  ends_at: string;
  created_at: string;
  payment_id: string | null;
  listings: { id: string; title: string; status: string; expires_at: string | null } | null;
  payments: { id: string; amount_php: number | null; status: string; paid_at: string | null } | null;
  boost_products: { label: string; duration_days: number } | null;
};

function BoostHistoryPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<BoostRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("listing_boosts")
        .select(
          "id, listing_id, product_slug, starts_at, ends_at, created_at, payment_id, listings(id,title,status,expires_at), payments(id,amount_php,status,paid_at), boost_products(label,duration_days)",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);
      setRows((data ?? []) as BoostRow[]);
      setLoading(false);
    })();
  }, [user]);

  return (
    <div>
      <header className="mb-6 flex items-center gap-3">
        <Rocket className="h-6 w-6 text-primary" />
        <div>
          <h1 className="font-display text-2xl font-bold">Boost history</h1>
          <p className="text-sm text-muted-foreground">
            Every boost charge, its active window, and whether your listing was pinned and renewed.
          </p>
        </div>
      </header>

      {loading ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
          You haven't boosted any listings yet.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const now = Date.now();
            const ends = new Date(r.ends_at).getTime();
            const starts = new Date(r.starts_at).getTime();
            const paid = r.payments?.status === "paid";
            const pinnedActive = paid && starts <= now && now < ends;
            const pinnedExpired = paid && now >= ends;
            const listingActive = r.listings?.status === "active";
            const renewedUntil = r.listings?.expires_at
              ? new Date(r.listings.expires_at).getTime()
              : null;
            const renewalOk =
              !!renewedUntil && renewedUntil >= ends - 1000 * 60 * 60 * 24; // expiry covers boost window
            return (
              <div
                key={r.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {r.listings ? (
                      <Link
                        to="/listing/$id"
                        params={{ id: r.listings.id }}
                        className="font-medium hover:text-primary"
                      >
                        {r.listings.title}
                      </Link>
                    ) : (
                      <span className="font-medium text-muted-foreground">Listing removed</span>
                    )}
                    <Badge variant="outline">
                      {r.boost_products?.label ?? r.product_slug}
                    </Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Charged {formatDate(r.created_at)} ·{" "}
                    {formatPHP(Number(r.payments?.amount_php ?? 0))} ·{" "}
                    {formatDate(r.starts_at)} → {formatDate(r.ends_at)}
                  </div>
                  {renewedUntil && (
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      Listing expiry now: {formatDate(r.listings!.expires_at!)}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={paid ? "default" : "secondary"}>
                    {paid ? "Paid" : r.payments?.status ?? "pending"}
                  </Badge>
                  {pinnedActive && <Badge className="bg-emerald-600">Pinned · active</Badge>}
                  {pinnedExpired && <Badge variant="outline">Pin expired</Badge>}
                  {!paid && <Badge variant="destructive">Not pinned</Badge>}
                  {paid &&
                    (renewalOk && listingActive ? (
                      <Badge className="bg-emerald-600">Renewed</Badge>
                    ) : (
                      <Badge variant="outline">Renewal pending</Badge>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-6 text-xs text-muted-foreground">
        Need a receipt? Visit{" "}
        <Link to="/payments" className="underline">
          Payments
        </Link>
        .
      </p>
    </div>
  );
}
