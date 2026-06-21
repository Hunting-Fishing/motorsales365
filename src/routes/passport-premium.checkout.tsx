import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { ArrowLeft } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { GCashDirectNote } from "@/components/checkout/gcash-direct-note";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createPassportPremiumCheckout } from "@/lib/passport-premium.functions";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/passport-premium/checkout")({
  validateSearch: (search: Record<string, unknown>): { vehicleId?: string; slug?: string } => ({
    vehicleId: typeof search.vehicleId === "string" ? search.vehicleId : undefined,
    slug: typeof search.slug === "string" ? search.slug : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Upgrade to Passport Premium — 365 MotorSales" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PassportPremiumCheckoutPage,
});

function PassportPremiumCheckoutPage() {
  const { vehicleId, slug } = Route.useSearch();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  if (!vehicleId || !slug) {
    return (
      <SiteLayout>
        <PaymentTestModeBanner />
        <section className="container mx-auto max-w-xl px-4 py-16 text-center">
          <h1 className="font-display text-2xl font-bold">Missing premium details</h1>
          <p className="mt-2 text-muted-foreground">
            Pick a vehicle from your garage to upgrade.
          </p>
          <Button asChild className="mt-6">
            <Link to="/dashboard/vehicles">Back to my garage</Link>
          </Button>
        </section>
      </SiteLayout>
    );
  }

  const fetchClientSecret = async (): Promise<string> => {
    const secret = await createPassportPremiumCheckout({
      data: {
        productSlug: slug,
        vehicleId,
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
          <Link to="/dashboard/vehicles">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to my garage
          </Link>
        </Button>
        <h1 className="font-display text-2xl font-bold">Upgrade to Passport Premium</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Secure payment via Stripe. Premium unlocks the moment payment clears.
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
