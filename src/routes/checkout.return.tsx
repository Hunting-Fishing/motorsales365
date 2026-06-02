import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/checkout/return")({
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    session_id?: string;
    next?: string;
    listingId?: string;
    nextBoost?: string;
  } => ({
    session_id: typeof search.session_id === "string" ? search.session_id : undefined,
    next: typeof search.next === "string" ? search.next : undefined,
    listingId: typeof search.listingId === "string" ? search.listingId : undefined,
    nextBoost: typeof search.nextBoost === "string" ? search.nextBoost : undefined,
  }),
  head: () => ({
    meta: [{ title: "Payment complete — 365 MotorSales" }, { name: "robots", content: "noindex" }],
  }),
  component: CheckoutReturn,
});

function CheckoutReturn() {
  const { session_id, next, listingId, nextBoost } = Route.useSearch();
  const navigate = useNavigate();

  // After a listing payment, if the seller also picked a boost, route them
  // straight into the boost checkout once the listing is confirmed.
  useEffect(() => {
    if (next === "listing" && listingId && nextBoost) {
      const t = setTimeout(() => {
        navigate({
          to: "/boost/checkout",
          search: { listingId, slug: nextBoost },
        });
      }, 1200);
      return () => clearTimeout(t);
    }
  }, [next, listingId, nextBoost, navigate]);

  const chainingToBoost = next === "listing" && listingId && nextBoost;

  return (
    <SiteLayout>
      <section className="container mx-auto max-w-xl px-4 py-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="h-9 w-9" />
        </div>
        <h1 className="font-display text-3xl font-bold">Payment received</h1>
        <p className="mt-2 text-muted-foreground">
          {chainingToBoost
            ? "Listing payment confirmed. Sending you to boost checkout…"
            : session_id
              ? "Your listing will activate within a few seconds."
              : "We couldn’t find a session reference, but if you completed the form your payment is on its way."}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {chainingToBoost ? (
            <Button asChild>
              <Link
                to="/boost/checkout"
                search={{ listingId: listingId!, slug: nextBoost! }}
              >
                Continue to boost
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild>
                <Link to="/dashboard">My listings</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/dashboard/billing">View billing</Link>
              </Button>
            </>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
