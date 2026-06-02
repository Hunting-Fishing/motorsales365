import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { ArrowLeft } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createListingPaymentCheckout } from "@/lib/listing-payment.functions";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/listing/checkout")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { listingId?: string; boost?: string } => ({
    listingId: typeof search.listingId === "string" ? search.listingId : undefined,
    boost: typeof search.boost === "string" ? search.boost : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Pay for your listing — 365 MotorSales" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ListingCheckoutPage,
});

function ListingCheckoutPage() {
  const { listingId, boost } = Route.useSearch();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  if (!listingId) {
    return (
      <SiteLayout>
        <PaymentTestModeBanner />
        <section className="container mx-auto max-w-xl px-4 py-16 text-center">
          <h1 className="font-display text-2xl font-bold">Missing listing</h1>
          <p className="mt-2 text-muted-foreground">
            Pick a pending listing from your dashboard to pay for it.
          </p>
          <Button asChild className="mt-6">
            <Link to="/dashboard">Back to my listings</Link>
          </Button>
        </section>
      </SiteLayout>
    );
  }

  const fetchClientSecret = async (): Promise<string> => {
    // Chain a boost purchase after a successful listing payment by forwarding
    // both the session id and the chosen boost slug to /checkout/return.
    const returnUrl = new URL("/checkout/return", window.location.origin);
    returnUrl.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");
    returnUrl.searchParams.set("next", "listing");
    returnUrl.searchParams.set("listingId", listingId);
    if (boost) {
      returnUrl.searchParams.set("nextBoost", boost);
    }
    const secret = await createListingPaymentCheckout({
      data: {
        listingId,
        // returnUrl must keep the literal {CHECKOUT_SESSION_ID} placeholder so
        // Stripe can substitute it server-side. decodeURIComponent restores
        // the braces that URL serialization escapes.
        returnUrl: decodeURIComponent(returnUrl.toString()),
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
        <h1 className="font-display text-2xl font-bold">Pay to publish your listing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Secure payment via Stripe. Your listing goes live as soon as payment clears.
          {boost ? " A boost will be offered right after." : ""}
        </p>
        <div id="checkout" className="mt-6 min-h-[600px]">
          <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      </section>
    </SiteLayout>
  );
}
