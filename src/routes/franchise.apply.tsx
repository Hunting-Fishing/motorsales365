import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";
import { ApplyForm } from "@/components/franchise/apply-form";

const TITLE = "Apply — 365 Franchise & Partner Program";
const DESCRIPTION =
  "Apply to join the 365 network as an independent Partner or full Franchise. Get parts discounts, marketing lift, shared CRM, and Shop Manager tools.";
const URL = "https://www.365motorsales.com/franchise/apply";

export const Route = createFileRoute("/franchise/apply")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: URL },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  validateSearch: (s: Record<string, unknown>): { tier?: "partner" | "franchise" } => ({
    tier: (s.tier === "franchise" ? "franchise" : "partner") as "partner" | "franchise",
  }),
  component: ApplyPage,
});

function ApplyPage() {
  const { tier } = Route.useSearch();
  return (
    <SiteLayout>
      <section className="container mx-auto max-w-3xl px-4 py-12">
        <div className="mb-6">
          <Link to="/franchise" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to Franchise & Partner Program
          </Link>
          <h1 className="mt-2 font-display text-3xl font-bold">Join the 365 network</h1>
          <p className="mt-2 text-muted-foreground">
            Tell us about your shop. Most applications get a response within 5 business days.
          </p>
        </div>
        <ApplyForm defaultTier={tier} />
      </section>
    </SiteLayout>
  );
}
