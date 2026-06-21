import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { GCashDirectNote } from "@/components/checkout/gcash-direct-note";
import { useAuth } from "@/hooks/use-auth";
import { getMyDispatchStatus } from "@/lib/dispatch.functions";

const VALID_PRICES = new Set([
  "dispatch_solo_monthly",
  "dispatch_team_monthly",
  "dispatch_unlimited_monthly",
]);

export const Route = createFileRoute("/dispatch/checkout")({
  validateSearch: (search: Record<string, unknown>): { priceId?: string } => ({
    priceId: typeof search.priceId === "string" ? search.priceId : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Subscribe to 365 Dispatch" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DispatchCheckout,
});

function DispatchCheckout() {
  const { priceId } = Route.useSearch();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const statusFn = useServerFn(getMyDispatchStatus);
  const [checking, setChecking] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      const redirect = `/dispatch/checkout?priceId=${encodeURIComponent(priceId ?? "")}`;
      navigate({
        to: "/signup",
        search: { type: "service_provider", redirect } as any,
      });
      return;
    }
    if (!priceId || !VALID_PRICES.has(priceId)) {
      setChecking(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const s = await statusFn();
        if (cancelled) return;
        setHasProfile(Boolean(s.hasProfile));
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, user, priceId, navigate, statusFn]);

  if (loading || checking) {
    return (
      <SiteLayout>
        <div className="container mx-auto max-w-xl px-4 py-16 text-center text-sm text-muted-foreground">
          <Loader2 className="mx-auto h-5 w-5 animate-spin" />
          <p className="mt-2">Checking your Dispatch profile…</p>
        </div>
      </SiteLayout>
    );
  }

  if (!priceId || !VALID_PRICES.has(priceId)) {
    return (
      <SiteLayout>
        <section className="container mx-auto max-w-xl px-4 py-16 text-center">
          <h1 className="font-display text-2xl font-bold">Pick a Dispatch plan</h1>
          <Button asChild className="mt-6">
            <Link to="/dispatch" hash="plans">View plans</Link>
          </Button>
        </section>
      </SiteLayout>
    );
  }

  if (!hasProfile) {
    return (
      <SiteLayout>
        <section className="container mx-auto max-w-xl px-4 py-16 text-center">
          <h1 className="font-display text-2xl font-bold">Finish your provider profile first</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We need your company details before you can subscribe.
          </p>
          <Button asChild className="mt-6">
            <Link to="/dispatch/join" search={{ priceId }}>
              Continue sign-up
            </Link>
          </Button>
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <PaymentTestModeBanner />
      <section className="container mx-auto max-w-3xl px-4 py-8">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/dispatch" hash="plans">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to plans
          </Link>
        </Button>
        <h1 className="font-display text-2xl font-bold">Subscribe to 365 Dispatch</h1>
        <p className="text-sm text-muted-foreground">
          Monthly subscription, cancel anytime. Auto-enables dispatch in your provider settings.
        </p>
        <div className="mt-6">
          <StripeEmbeddedCheckout priceId={priceId} />
        </div>
        <GCashDirectNote />
      </section>
    </SiteLayout>
  );
}
