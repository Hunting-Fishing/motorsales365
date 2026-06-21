import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";
import gcashLogo from "@/assets/payments/gcash.webp.asset.json";
import stripeLogo from "@/assets/payments/stripe.jpg.asset.json";

export const Route = createFileRoute("/payments")({
  head: () => ({
    meta: [
      { title: "Payments — 365 MotorSales Philippines" },
      {
        name: "description",
        content:
          "Pay listing fees, boosts, and subscriptions with GCash or Stripe.",
      },
    ],
  }),
  component: PaymentsPage,
});

function PaymentsPage() {
  return (
    <SiteLayout>
      <section className="container mx-auto px-4 py-12">
        <h1 className="font-display text-2xl font-bold text-center mb-8">
          Payments
        </h1>

        <div className="grid gap-8 sm:grid-cols-2 max-w-lg mx-auto">
          {/* GCash */}
          <div className="flex flex-col items-center text-center">
            <div className="w-full overflow-hidden rounded-xl">
              <img
                src={gcashLogo.url}
                alt="GCash logo"
                className="block aspect-[16/9] w-full object-cover"
                loading="lazy"
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Direct to our wallet · 09696063830
            </p>
          </div>

          {/* Stripe */}
          <div className="flex flex-col items-center text-center">
            <div className="w-full overflow-hidden rounded-xl">
              <img
                src={stripeLogo.url}
                alt="Stripe logo"
                className="block aspect-[16/9] w-full object-cover"
                loading="lazy"
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Cards · 3D Secure
            </p>
          </div>
        </div>

        <div className="mt-12 text-center">
          <Link
            to="/pricing"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            See pricing
          </Link>
        </div>
      </section>
    </SiteLayout>
  );
}
