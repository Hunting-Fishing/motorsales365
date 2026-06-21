import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { ArrowLeft, Smartphone, CreditCard } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { GCashDirectNote } from "@/components/checkout/gcash-direct-note";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createListingPaymentCheckout } from "@/lib/listing-payment.functions";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/listing/checkout")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { listingId?: string; boost?: string; method?: string } => ({
    listingId: typeof search.listingId === "string" ? search.listingId : undefined,
    boost: typeof search.boost === "string" ? search.boost : undefined,
    method: typeof search.method === "string" ? search.method : undefined,
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
  const { listingId, boost, method } = Route.useSearch();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [rail, setRail] = useState<"all" | "gcash">(method === "gcash" ? "gcash" : "all");

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
        ...(rail === "gcash" && { paymentMethod: "gcash" as const }),
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

        <div
          className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2"
          role="radiogroup"
          aria-label="Choose a payment method"
        >
          <button
            type="button"
            role="radio"
            aria-checked={rail === "all"}
            onClick={() => setRail("all")}
            className={`flex items-start gap-3 rounded-lg border p-4 text-left transition ${
              rail === "all"
                ? "border-primary bg-primary/5 ring-2 ring-primary/40"
                : "border-border hover:bg-accent/40"
            }`}
          >
            <CreditCard className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <div className="font-semibold">Card &amp; wallets</div>
              <div className="text-xs text-muted-foreground">
                Visa, Mastercard, Maya, GrabPay, GCash — pick at checkout.
              </div>
            </div>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={rail === "gcash"}
            onClick={() => setRail("gcash")}
            className={`flex items-start gap-3 rounded-lg border p-4 text-left transition ${
              rail === "gcash"
                ? "border-primary bg-primary/5 ring-2 ring-primary/40"
                : "border-border hover:bg-accent/40"
            }`}
          >
            <Smartphone className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <div className="font-semibold">Pay with GCash</div>
              <div className="text-xs text-muted-foreground">
                Skip the picker — opens straight into the GCash flow.
              </div>
            </div>
          </button>
        </div>

        <div id="checkout" className="mt-6 min-h-[600px]">
          {/* Re-key on rail change so EmbeddedCheckoutProvider remounts with the
              right client secret (it doesn't allow swapping mid-flight). */}
          <EmbeddedCheckoutProvider
            key={rail}
            stripe={getStripe()}
            options={{ fetchClientSecret }}
          >
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
        <GCashDirectNote />
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Changed your mind?{" "}
          <Link
            to="/sell"
            search={{ payment: "cancelled" as const, listingId }}
            className="underline"
          >
            Cancel and finish later
          </Link>
          . Your listing stays saved as pending until paid.
        </p>
      </section>
    </SiteLayout>
  );
}
