import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";

export const Route = createFileRoute("/refund-policy")({
  head: () => ({
    meta: [
      { title: "Refund Policy — 365 MotorSales Philippines" },
      { name: "description", content: "When listing fees, boosts, and subscriptions are refundable on 365 MotorSales Philippines." },
    ],
  }),
  component: RefundPage,
});

function RefundPage() {
  return (
    <SiteLayout>
      <article className="container mx-auto max-w-3xl px-4 py-16 prose prose-sm dark:prose-invert">
        <h1 className="font-display text-4xl font-bold">Refund Policy</h1>

        <h2 className="mt-6 text-xl font-semibold">Listing fees and boosts</h2>
        <p className="mt-2 text-muted-foreground">Listing fees and boost upgrades are <strong>non-refundable</strong> once the listing is published, since the placement and exposure are delivered immediately.</p>

        <h2 className="mt-6 text-xl font-semibold">Exceptions</h2>
        <ul className="mt-2 list-disc pl-6 text-muted-foreground">
          <li>If your listing is removed by us due to a platform error (not a policy violation), the unused portion of any boost will be credited back to your account.</li>
          <li>Duplicate charges caused by a payment processor error will be refunded in full within 7–10 business days.</li>
        </ul>

        <h2 className="mt-6 text-xl font-semibold">Subscriptions</h2>
        <p className="mt-2 text-muted-foreground">Monthly and annual plans renew automatically. You may cancel anytime from your dashboard. Cancellation stops future charges but does not refund the current billing period.</p>

        <h2 className="mt-6 text-xl font-semibold">How to request</h2>
        <p className="mt-2 text-muted-foreground">Email <a className="text-primary underline" href="mailto:billing@365motorsales.ph">billing@365motorsales.ph</a> with your account email, the transaction date, and a brief explanation. We respond within 3 business days.</p>
      </article>
    </SiteLayout>
  );
}
