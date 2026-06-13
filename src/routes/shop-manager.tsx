import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Wrench, ClipboardList, Users2, Boxes, ShieldCheck } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { ShopManagerPlanCard } from "@/components/shop-manager/plan-card";
import { OpenShopManagerButton } from "@/components/shop-manager/open-shop-manager-button";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useShopManagerAccess } from "@/hooks/use-shop-manager-access";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";

const TITLE = "Shop Manager — 365 Motor Sales";
const DESCRIPTION =
  "Run your automotive shop: work orders, customer + vehicle history, inventory, inspections, invoicing, and reminders. Built for Philippine shops, integrated with your 365 Motor Sales listings.";

export const Route = createFileRoute("/shop-manager")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "product" },
    ],
    links: [{ rel: "canonical", href: "https://www.365motorsales.com/shop-manager" }],
  }),
  component: ShopManagerPage,
});

function ShopManagerPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const access = useShopManagerAccess();
  const { openCheckout, checkoutElement, closeCheckout, isOpen } = useStripeCheckout();
  const [pendingPlan, setPendingPlan] = useState<"solo" | "pro" | null>(null);

  // After a successful checkout the user returns here with ?checkout=success.
  // Refresh entitlement so the CTA flips to "Open Shop Manager".
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") access.refetch();
  }, [access]);

  const selectPlan = (priceId: "shop_manager_solo_monthly" | "shop_manager_pro_monthly") => {
    if (!user) {
      navigate({ to: "/login", search: { redirect: "/shop-manager" } as any });
      return;
    }
    setPendingPlan(priceId === "shop_manager_solo_monthly" ? "solo" : "pro");
    openCheckout({
      priceId,
      quantity: 1,
      customerEmail: user.email,
      userId: user.id,
      returnUrl: `${window.location.origin}/shop-manager?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    });
  };

  const isActive = access.data?.active ?? false;
  const currentTier = access.data?.tier;

  return (
    <SiteLayout>
      <main className="container mx-auto max-w-6xl px-4 py-12">
        {/* Hero */}
        <section className="grid gap-8 md:grid-cols-[2fr,1fr] md:items-center">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-primary">
              Shop Manager · powered by All Business 365
            </p>
            <h1 className="font-display text-4xl font-bold sm:text-5xl">
              Run your shop. Win every job.
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Work orders, customer + vehicle history, inventory, inspections, repair plans,
              invoicing, and reminders — in one place, built for Philippine automotive shops.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {isActive ? (
                <OpenShopManagerButton size="lg" />
              ) : (
                <Button size="lg" onClick={() => selectPlan("shop_manager_solo_monthly")}>
                  Start Solo — ₱799/mo
                </Button>
              )}
              <Button asChild size="lg" variant="outline">
                <a href="#plans">See plans</a>
              </Button>
            </div>
            {isActive && (
              <p className="mt-3 text-sm text-muted-foreground">
                You're on the <strong className="capitalize">{currentTier}</strong> plan.
                Renewal:{" "}
                {access.data?.currentPeriodEnd
                  ? new Date(access.data.currentPeriodEnd).toLocaleDateString()
                  : "—"}
                .
              </p>
            )}
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Connected to 365 Motor Sales
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex gap-2">
                <Wrench className="h-4 w-4 text-primary" />
                Turn parts-wanted matches into work orders.
              </li>
              <li className="flex gap-2">
                <Users2 className="h-4 w-4 text-primary" />
                Pull customer + vehicle history from buyer profiles.
              </li>
              <li className="flex gap-2">
                <Boxes className="h-4 w-4 text-primary" />
                Quote on listings without retyping the VIN.
              </li>
              <li className="flex gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Single sign-on — your 365 account works here too.
              </li>
            </ul>
          </div>
        </section>

        {/* Feature strip */}
        <section className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: ClipboardList,
              title: "Work orders",
              text: "Create, assign, photo-document, and close jobs from your phone.",
            },
            {
              icon: Users2,
              title: "Customers + vehicles",
              text: "Full service history, mileage log, recurring reminders.",
            },
            {
              icon: Boxes,
              title: "Inventory + parts",
              text: "Stock, low-stock alerts, supplier orders, barcode scan.",
            },
            {
              icon: ShieldCheck,
              title: "Inspections",
              text: "DVIR, PMS, pre/post inspection forms with signatures.",
            },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-xl border border-border bg-card p-5">
              <Icon className="h-6 w-6 text-primary" />
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </section>

        {/* Plans */}
        <section id="plans" className="mt-16">
          <h2 className="font-display text-3xl font-bold">Pick a plan</h2>
          <p className="mt-2 text-muted-foreground">
            Monthly, no contract. Cancel anytime from your dashboard.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <ShopManagerPlanCard
              name="Shop Manager Solo"
              priceLabel="₱799"
              cadence="month"
              blurb="One tech, unlimited work orders."
              features={[
                "1 technician seat",
                "Unlimited work orders",
                "Customer + vehicle history",
                "Invoicing + receipts",
                "Mobile-friendly",
              ]}
              ctaLabel={
                isActive && currentTier === "solo" ? "Current plan" : "Choose Solo"
              }
              disabled={isActive && currentTier === "solo"}
              onSelect={() => selectPlan("shop_manager_solo_monthly")}
            />
            <ShopManagerPlanCard
              name="Shop Manager Pro"
              priceLabel="₱1,999"
              cadence="month"
              blurb="Growing shop with a team."
              features={[
                "Up to 10 technician seats",
                "Inventory + parts tracking",
                "Repair plans + quotes",
                "Photo VINs / inspections",
                "Email + SMS reminders",
                "Priority support",
              ]}
              highlighted
              ctaLabel={
                isActive && currentTier === "pro" ? "Current plan" : "Choose Pro"
              }
              disabled={isActive && currentTier === "pro"}
              onSelect={() => selectPlan("shop_manager_pro_monthly")}
            />
          </div>
        </section>

        {/* Footnote / Legal */}
        <section className="mt-16 rounded-xl border border-dashed border-border bg-muted/40 p-6 text-sm text-muted-foreground">
          <p>
            Shop Manager is delivered by our partner platform <strong>All Business 365</strong>.
            When you subscribe, your account email and display name are forwarded so we can create
            your workspace and sign you in automatically. See our{" "}
            <Link to="/privacy" className="text-primary underline">
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link to="/terms" className="text-primary underline">
              Terms
            </Link>
            .
          </p>
        </section>

        {/* Embedded checkout */}
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 p-4 backdrop-blur">
            <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card p-4 shadow-xl">
              <button
                onClick={() => {
                  setPendingPlan(null);
                  closeCheckout();
                }}
                className="absolute right-3 top-3 text-sm text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
              <h3 className="mb-2 text-lg font-semibold">
                Subscribe to Shop Manager {pendingPlan === "pro" ? "Pro" : "Solo"}
              </h3>
              {checkoutElement}
            </div>
          </div>
        )}
      </main>
    </SiteLayout>
  );
}
