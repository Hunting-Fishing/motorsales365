import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { useAuth } from "@/hooks/use-auth";

const VALID_PRICES = new Set([
  "dispatch_starter_monthly",
  "dispatch_pro_monthly",
  "dispatch_fleet_monthly",
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

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

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
      </section>
    </SiteLayout>
  );
}
