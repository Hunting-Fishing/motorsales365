import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";

export const Route = createFileRoute("/refund-policy")({
  head: () => ({
    meta: [
      { title: "Refund Policy — 365 MotorSales Philippines" },
      {
        name: "description",
        content:
          "When listing fees, boosts, and subscriptions are refundable on 365 MotorSales Philippines.",
      },
    ],
  }),
  component: RefundPage,
});

function RefundPage() {
  return (
    <SiteLayout>
      <article className="container mx-auto max-w-3xl px-4 py-16 prose prose-sm dark:prose-invert">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Refund Policy</h1>

        <h2 className="mt-6 text-xl font-semibold">Listing fees and boosts</h2>
        <p className="mt-2 text-muted-foreground">
          Listing fees and boost upgrades are <strong>non-refundable</strong> once the listing is
          published, since the placement and exposure are delivered immediately.
        </p>

        <h2 className="mt-6 text-xl font-semibold">Exceptions</h2>
        <ul className="mt-2 list-disc pl-6 text-muted-foreground">
          <li>
            If your listing is removed by us due to a platform error (not a policy violation), the
            unused portion of any boost will be credited back to your account.
          </li>
          <li>
            Duplicate charges caused by a payment processor error will be refunded in full within
            7–10 business days.
          </li>
        </ul>

        <h2 className="mt-6 text-xl font-semibold">Subscriptions</h2>
        <p className="mt-2 text-muted-foreground">
          Monthly and annual plans renew automatically. You may cancel anytime from your dashboard.
          Cancellation stops future charges but does not refund the current billing period.
        </p>

        <h2 className="mt-6 text-xl font-semibold">365 Learn course purchases</h2>
        <p className="mt-2 text-muted-foreground">
          One-time course purchases are refundable within <strong>7 days of purchase</strong>{" "}
          provided you have completed less than <strong>20%</strong> of the course lessons and have
          not been issued a certificate. After either threshold is crossed, the purchase is
          non-refundable since the educational content has been substantially delivered. Courses
          unlocked via a subscription are not separately refundable — cancel the subscription
          instead.
        </p>

        <h2 className="mt-6 text-xl font-semibold">Partner Training schools</h2>
        <p className="mt-2 text-muted-foreground">
          Payments made directly to a sponsored Partner Training school are <strong>not</strong>{" "}
          processed by 365 MotorSales and are governed solely by that school's own refund policy. We
          cannot refund or mediate fees paid to third parties.
        </p>

        <h2 className="mt-6 text-xl font-semibold">
          Inspection &amp; transaction-safety services
        </h2>
        <p className="mt-2 text-muted-foreground">
          Pre-paid 365 fees for OR/CR document review, seller ID verification, vehicle history
          reports, and transaction-assistance coordination are refundable in full if the work has
          not started, and pro-rated based on completed milestones once it has. Fees for
          pre-purchase mechanic inspections performed by independent partners are governed by that
          partner's own refund terms — 365 will help mediate but cannot guarantee a third-party
          refund. Mechanic-booking commissions are non-refundable once the inspection has been
          completed.
        </p>

        <h2 className="mt-6 text-xl font-semibold">Vehicle Passport Premium</h2>
        <p className="mt-2 text-muted-foreground">
          Passport Premium (₱299 / 12 months per vehicle) is delivered immediately — the badge,
          PDF history report, branded share card, and extended record storage activate as soon as
          payment clears — and is <strong>non-refundable</strong> after activation. If the upgrade
          fails to activate due to a platform error, we will either restore it or refund in full.
          Purchasing again on the same vehicle extends the existing premium window rather than
          stacking two terms.
        </p>

        <p className="mt-6 text-xs text-muted-foreground">
          Last updated: June 9, 2026 (added Vehicle Passport Premium section)
        </p>


        <h2 className="mt-6 text-xl font-semibold">How to request</h2>
        <p className="mt-2 text-muted-foreground">
          Email{" "}
          <a className="text-primary underline" href="mailto:billing@365motorsales.com">
            billing@365motorsales.com
          </a>{" "}
          with your account email, the transaction date, and a brief explanation. We respond within
          3 business days.
        </p>
      </article>
    </SiteLayout>
  );
}
