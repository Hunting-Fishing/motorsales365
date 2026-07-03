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
import { createBoostCheckout } from "@/lib/boosts.functions";
import { useAuth } from "@/hooks/use-auth";
import { useClubDiscountStatus } from "@/hooks/use-club-discount";

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
  const { data: clubStatus, refetch: refetchClub } = useClubDiscountStatus();
  const [clubError, setClubError] = useState<string | null>(null);

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
    try {
      const secret = await createBoostCheckout({
        data: {
          boostSlug: slug,
          listingId,
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
          <Link to="/dashboard">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to my listings
          </Link>
        </Button>
        <h1 className="font-display text-2xl font-bold">Complete your boost</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Secure payment via Stripe. Your boost activates as soon as payment clears.
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
