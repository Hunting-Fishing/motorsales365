import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { getListingCheckoutStatus } from "@/lib/listing-payment.functions";
import { getStripeEnvironment } from "@/lib/stripe";

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

  // For listing payments we verify the actual session status with Stripe so
  // we can show a real failure message instead of always claiming success.
  const isListingFlow = next === "listing" && !!session_id;
  const statusQuery = useQuery({
    queryKey: ["listing-checkout-status", session_id],
    enabled: isListingFlow,
    queryFn: () =>
      getListingCheckoutStatus({
        data: { sessionId: session_id!, environment: getStripeEnvironment() },
      }),
    retry: false,
  });

  const paid =
    !isListingFlow ||
    (statusQuery.data?.paymentStatus === "paid" ||
      statusQuery.data?.paymentStatus === "no_payment_required");
  const failed =
    isListingFlow &&
    statusQuery.data &&
    statusQuery.data.paymentStatus !== "paid" &&
    statusQuery.data.paymentStatus !== "no_payment_required";

  // After a successful listing payment, if the seller also picked a boost,
  // route them straight into the boost checkout.
  useEffect(() => {
    if (paid && next === "listing" && listingId && nextBoost) {
      const t = setTimeout(() => {
        navigate({
          to: "/boost/checkout",
          search: { listingId, slug: nextBoost },
        });
      }, 1200);
      return () => clearTimeout(t);
    }
  }, [paid, next, listingId, nextBoost, navigate]);

  if (isListingFlow && statusQuery.isLoading) {
    return (
      <SiteLayout>
        <section className="container mx-auto max-w-xl px-4 py-16 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">Confirming your payment…</p>
        </section>
      </SiteLayout>
    );
  }

  if (failed) {
    const retryId = statusQuery.data?.listingId ?? listingId;
    return (
      <SiteLayout>
        <section className="container mx-auto max-w-xl px-4 py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="h-9 w-9" />
          </div>
          <h1 className="font-display text-3xl font-bold">Payment didn't complete</h1>
          <p className="mt-2 text-muted-foreground">
            {statusQuery.data?.status === "expired"
              ? "Your checkout session expired before the payment was confirmed."
              : "Your card was not charged. You can retry the payment — your listing is saved and still pending."}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {retryId ? (
              <Button asChild>
                <Link
                  to="/listing/checkout"
                  search={{ listingId: retryId, ...(nextBoost ? { boost: nextBoost } : {}) }}
                >
                  Retry payment
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link to="/dashboard">My listings</Link>
            </Button>
          </div>
        </section>
      </SiteLayout>
    );
  }

  const chainingToBoost = paid && next === "listing" && listingId && nextBoost;

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
