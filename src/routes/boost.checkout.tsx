import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { ArrowLeft } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { GCashDirectNote } from "@/components/checkout/gcash-direct-note";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createBoostCheckout } from "@/lib/boosts.functions";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/boost/checkout")({
  validateSearch: (search: Record<string, unknown>): { listingId?: string; slug?: string } => ({
    listingId: typeof search.listingId === "string" ? search.listingId : undefined,
    slug: typeof search.slug === "string" ? search.slug : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Boost your listing — 365 MotorSales" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BoostCheckoutPage,
});

function BoostCheckoutPage() {
  const { listingId, slug } = Route.useSearch();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  if (!listingId || !slug) {
    return (
      <SiteLayout>
        <PaymentTestModeBanner />
        <section className="container mx-auto max-w-xl px-4 py-16 text-center">
          <h1 className="font-display text-2xl font-bold">Missing boost details</h1>
          <p className="mt-2 text-muted-foreground">
            Pick a boost from one of your listings to continue.
          </p>
          <Button asChild className="mt-6">
            <Link to="/dashboard">Back to my listings</Link>
          </Button>
        </section>
      </SiteLayout>
    );
  }

  const fetchClientSecret = async (): Promise<string> => {
    const secret = await createBoostCheckout({
      data: {
        boostSlug: slug,
        listingId,
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
          <Link to="/dashboard">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to my listings
          </Link>
        </Button>
        <h1 className="font-display text-2xl font-bold">Complete your boost</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Secure payment via Stripe. Your boost activates as soon as payment clears.
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
