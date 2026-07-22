import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import {
  createShopManagerCheckoutSession,
  type ShopManagerInterval,
  type ShopManagerTier,
} from "@/lib/shop-manager-checkout.functions";
import { useAuth } from "@/hooks/use-auth";

const TIERS: readonly ShopManagerTier[] = ["starter", "pro", "enterprise"];
const INTERVALS: readonly ShopManagerInterval[] = ["month", "year"];

export const Route = createFileRoute("/shop-manager/checkout")({
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    businessId?: string;
    tier?: ShopManagerTier;
    interval?: ShopManagerInterval;
    countryCode?: string;
  } => ({
    businessId: typeof search.businessId === "string" ? search.businessId : undefined,
    tier:
      typeof search.tier === "string" && (TIERS as readonly string[]).includes(search.tier)
        ? (search.tier as ShopManagerTier)
        : undefined,
    interval:
      typeof search.interval === "string" &&
      (INTERVALS as readonly string[]).includes(search.interval)
        ? (search.interval as ShopManagerInterval)
        : undefined,
    countryCode: typeof search.countryCode === "string" ? search.countryCode : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Shop Manager checkout — 365 Motor Sales" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ShopManagerCheckoutPage,
});

function ShopManagerCheckoutPage() {
  const { businessId, tier, interval, countryCode } = Route.useSearch();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  if (!businessId || !tier || !interval) {
    return (
      <SiteLayout>
        <PaymentTestModeBanner />
        <section className="container mx-auto max-w-xl px-4 py-16 text-center">
          <h1 className="font-display text-2xl font-bold">Missing checkout details</h1>
          <p className="mt-2 text-muted-foreground">
            Please choose a plan from the Shop Manager pricing page.
          </p>
          <Button asChild className="mt-6">
            <Link to="/shop-manager/pricing">Back to pricing</Link>
          </Button>
        </section>
      </SiteLayout>
    );
  }

  const fetchClientSecret = async (): Promise<string> => {
    try {
      const result = await createShopManagerCheckoutSession({
        data: {
          businessId,
          tier,
          interval,
          countryCode,
          returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
          environment: getStripeEnvironment(),
        },
      });
      if ("error" in result) throw new Error(result.error);
      if (!result.clientSecret) throw new Error("No client secret returned");
      return result.clientSecret;
    } catch (e: any) {
      toast.error(e?.message ?? "Checkout failed");
      throw e;
    }
  };

  const tierLabel = tier[0].toUpperCase() + tier.slice(1);

  return (
    <SiteLayout>
      <PaymentTestModeBanner />
      <section className="container mx-auto max-w-3xl px-4 py-8">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/shop-manager/pricing">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to pricing
          </Link>
        </Button>
        <h1 className="font-display text-2xl font-bold">
          Subscribe to Shop Manager — {tierLabel}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Billed {interval === "year" ? "yearly (save ~17%)" : "monthly"}. Secure payment via Stripe.
          Your tier activates automatically once payment clears.
        </p>
        <div id="checkout" className="mt-6 min-h-[600px]">
          <EmbeddedCheckoutProvider
            key={`${businessId}-${tier}-${interval}`}
            stripe={getStripe()}
            options={{ fetchClientSecret }}
          >
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      </section>
    </SiteLayout>
  );
}
