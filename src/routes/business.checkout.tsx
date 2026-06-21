import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { ArrowLeft } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { GCashDirectNote } from "@/components/checkout/gcash-direct-note";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createBusinessSubscriptionCheckout } from "@/lib/business-subscriptions.functions";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/business/checkout")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { businessId?: string; planSlug?: string } => ({
    businessId: typeof search.businessId === "string" ? search.businessId : undefined,
    planSlug: typeof search.planSlug === "string" ? search.planSlug : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Upgrade your business — 365 MotorSales" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BusinessCheckoutPage,
});

function BusinessCheckoutPage() {
  const { businessId, planSlug } = Route.useSearch();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  if (!businessId || !planSlug) {
    return (
      <SiteLayout>
        <PaymentTestModeBanner />
        <section className="container mx-auto max-w-xl px-4 py-16 text-center">
          <h1 className="font-display text-2xl font-bold">Missing checkout details</h1>
          <p className="mt-2 text-muted-foreground">
            Pick a plan from one of your businesses to continue.
          </p>
          <Button asChild className="mt-6">
            <Link to="/dashboard/businesses">Back to my businesses</Link>
          </Button>
        </section>
      </SiteLayout>
    );
  }

  const fetchClientSecret = async (): Promise<string> => {
    const secret = await createBusinessSubscriptionCheckout({
      data: {
        businessId,
        planSlug,
        returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
        environment: getStripeEnvironment(),
      },
    });
    if (!secret) throw new Error("No client secret returned");
    return secret;
  };

  return (
    <SiteLayout>
      <PaymentTestModeBanner />
      <section className="container mx-auto max-w-3xl px-4 py-8">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/dashboard/businesses">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to my businesses
          </Link>
        </Button>
        <h1 className="font-display text-2xl font-bold">Complete your upgrade</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Secure payment via Stripe. Your business tier activates as soon as payment clears.
        </p>
        <div id="checkout" className="mt-6 min-h-[600px]">
          <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
        <GCashDirectNote />
      </section>
    </SiteLayout>
  );
}
