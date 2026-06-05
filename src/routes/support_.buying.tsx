import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { AnnotatedScreenshot } from "@/components/support/annotated-screenshot";
import { SupportStep, SupportSteps } from "@/components/support/support-step";
import { SupportArticleLayout } from "@/components/support/support-article-layout";
import browseShot from "@/assets/support/browse.png";

const TITLE = "Buying a vehicle";
const DESC = "How to search, filter, and contact sellers safely on 365 MotorSales Philippines.";

export const Route = createFileRoute("/support_/buying")({
  component: BuyingSupport,
  head: () => ({
    meta: [
      { title: `${TITLE} — Help & Support | 365 MotorSales` },
      { name: "description", content: DESC },
      { property: "og:title", content: `${TITLE} — 365 MotorSales Help` },
      { property: "og:description", content: DESC },
      { property: "og:url", content: "https://www.365motorsales.com/support/buying" },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: "https://www.365motorsales.com/support/buying" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: "How to buy a vehicle on 365 MotorSales",
          step: [
            {
              "@type": "HowToStep",
              name: "Choose a category",
              text: "Pick Cars, Motorcycles, Boats, Airplanes, Equipment or Towing from the top nav.",
            },
            {
              "@type": "HowToStep",
              name: "Apply filters",
              text: "Narrow results by make, model, year, engine, price and location.",
            },
            {
              "@type": "HowToStep",
              name: "Contact the seller",
              text: "Use on-platform messaging, inspect in person, and pay with traceable methods.",
            },
          ],
        }),
      },
    ],
  }),
});

function BuyingSupport() {
  return (
    <SupportArticleLayout title={TITLE} description={DESC}>
      <section className="space-y-10">
        <div>
          <h2 className="text-xl font-semibold sm:text-2xl">Search and filter listings</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a category from the top nav, then narrow results with filters on the left.
          </p>
          <AnnotatedScreenshot
            src={browseShot}
            alt="Browse cars page with category tabs and filter panel"
            annotations={[
              { n: 1, x: 25, y: 39, label: "Category tabs", side: "bottom" },
              { n: 2, x: 14, y: 70, label: "Filter by make, model & year", side: "right" },
            ]}
          />
          <SupportSteps>
            <SupportStep n={1} title="Choose a category">
              Click <strong>Cars</strong>, <strong>Motorcycles</strong>, <strong>Boats</strong>,{" "}
              <strong>Airplanes</strong>, <strong>Equipment</strong> or <strong>Towing</strong> from
              the top nav.
            </SupportStep>
            <SupportStep n={2} title="Apply filters">
              Use the Filters panel to narrow by make, model, year, engine, price and location.
            </SupportStep>
            <SupportStep n={3} title="Save a search">
              Logged in? Click the bookmark icon to get notified when matching listings appear.
            </SupportStep>
          </SupportSteps>
        </div>

        <div>
          <h2 className="text-xl font-semibold sm:text-2xl">Contact a seller safely</h2>
          <SupportSteps>
            <SupportStep n={1} title="Use on-platform messaging first">
              Keep early conversations on 365 MotorSales — this protects both buyer and seller.
            </SupportStep>
            <SupportStep n={2} title="Inspect in person">
              Always view the vehicle in daylight at a public, well-lit location. Bring a friend or
              mechanic.
            </SupportStep>
            <SupportStep n={3} title="Verify the paperwork">
              Check that the OR/CR, chassis number and engine number match. Never pay a deposit
              before seeing the vehicle.
            </SupportStep>
            <SupportStep n={4} title="Use traceable payments">
              Bank transfer, GCash or Maya. Avoid large cash transactions.
            </SupportStep>
          </SupportSteps>
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p>
              See our{" "}
              <Link to="/guidelines" className="font-semibold text-primary underline">
                Community Guidelines
              </Link>{" "}
              for the full safety checklist.
            </p>
          </div>
        </div>
      </section>
    </SupportArticleLayout>
  );
}
