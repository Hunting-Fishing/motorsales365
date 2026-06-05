import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";

export const Route = createFileRoute("/affiliate-disclosure")({
  component: AffiliateDisclosure,
  head: () => ({
    meta: [
      { title: "Affiliate disclosure | 365 MotorSales" },
      {
        name: "description",
        content:
          "How 365 MotorSales earns commissions from shop links, and what that means for the prices and recommendations you see.",
      },
    ],
    links: [{ rel: "canonical", href: "https://www.365motorsales.com/affiliate-disclosure" }],
  }),
});

function AffiliateDisclosure() {
  return (
    <SiteLayout>
      <article className="container mx-auto max-w-3xl px-4 py-12 prose prose-neutral dark:prose-invert">
        <h1>Affiliate disclosure</h1>
        <p className="lead">
          365 MotorSales participates in affiliate programs with marketplaces like Shopee, Lazada,
          AliExpress and select brand stores. This page explains what that means for you.
        </p>

        <h2>How it works</h2>
        <p>
          When you click an outbound product link in our Shop, we may add a tracking tag that tells
          the marketplace the visit came from us. If you go on to buy something, we earn a small
          commission from the seller — the price you pay does not change.
        </p>

        <h2>How it affects what you see</h2>
        <ul>
          <li>
            We curate products based on relevance to Filipino drivers, riders, and DIY mechanics —
            not on commission rate alone.
          </li>
          <li>
            "Featured" and "Deal" placements may be highlighted for visibility but are still subject
            to the same editorial standards.
          </li>
          <li>
            You always buy directly from the marketplace seller; we never handle payment, shipping,
            or returns.
          </li>
        </ul>

        <h2>Your data</h2>
        <p>
          We record outbound click events (product, time, optional campaign tag) to understand
          what's useful to the community. We do not sell this data, and individual click attribution
          to a single named user is only visible to our shop managers for accounting.
        </p>

        <h2>Questions</h2>
        <p>
          If you have questions about a specific recommendation or want to flag a broken/misleading
          listing, contact us — we want the shop to be genuinely useful.
        </p>
      </article>
    </SiteLayout>
  );
}
