import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { GCashDirectNote } from "@/components/checkout/gcash-direct-note";
import { ClubDiscountNote } from "@/components/clubs/club-discount-note";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createPassportPremiumCheckout } from "@/lib/passport-premium.functions";
import { useAuth } from "@/hooks/use-auth";
import { useClubDiscountStatus } from "@/hooks/use-club-discount";

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
  const { data: clubStatus, refetch: refetchClub } = useClubDiscountStatus();
  const [clubError, setClubError] = useState<string | null>(null);

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
    try {
      const secret = await createPassportPremiumCheckout({
        data: {
          productSlug: slug,
          vehicleId,
          returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
          environment: getStripeEnvironment(),
          expectClubDiscount: !!clubStatus?.eligible,
        },
      });
      if (!secret) throw new Error("No client secret returned");
      setClubError(null);
      return secret;
    } catch (e: any) {
      const msg = e?.message ?? "Checkout failed";
      if (msg.toLowerCase().includes("club-member discount")) {
        setClubError(msg);
        void refetchClub();
      }
      toast.error(msg);
      throw e;
    }
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
        <div className="mt-4"><ClubDiscountNote /></div>
        {clubError && (
          <div className="mt-4 flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="font-medium">Club discount no longer available</div>
              <div className="mt-1">{clubError}</div>
            </div>
          </div>
        )}
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
