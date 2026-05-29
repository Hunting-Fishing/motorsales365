import { createFileRoute } from "@tanstack/react-router";
import { AnnotatedScreenshot } from "@/components/support/annotated-screenshot";
import { SupportStep, SupportSteps } from "@/components/support/support-step";
import { SupportArticleLayout } from "@/components/support/support-article-layout";
import homeShot from "@/assets/support/home.png";
import pricingShot from "@/assets/support/pricing.png";

const TITLE = "Selling & boosting";
const DESC = "Post a listing in minutes and boost it for more reach. Pricing, photo tips and step-by-step instructions.";

export const Route = createFileRoute("/support/selling")({
  component: SellingSupport,
  head: () => ({
    meta: [
      { title: `${TITLE} — Help & Support | 365 MotorSales` },
      { name: "description", content: DESC },
      { property: "og:title", content: `${TITLE} — 365 MotorSales Help` },
      { property: "og:description", content: DESC },
      { property: "og:url", content: "https://365motorsales.com/support/selling" },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: "https://365motorsales.com/support/selling" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: "How to post and boost a listing on 365 MotorSales",
          step: [
            { "@type": "HowToStep", name: "Click Post a listing", text: "Top-right of every page. Sign in if needed." },
            { "@type": "HowToStep", name: "Pick category and vehicle", text: "Choose make, model and year." },
            { "@type": "HowToStep", name: "Add great photos", text: "Up to 20 photos and 1 video." },
            { "@type": "HowToStep", name: "Set price and location", text: "Prices in PHP. Pick region and city." },
            { "@type": "HowToStep", name: "Publish", text: "Live for 60 days. Free." },
          ],
        }),
      },
    ],
  }),
});

function SellingSupport() {
  return (
    <SupportArticleLayout title={TITLE} description={DESC}>
      <section className="space-y-10">
        <div>
          <h2 className="text-xl font-semibold sm:text-2xl">Post a listing</h2>
          <AnnotatedScreenshot
            src={homeShot}
            alt="365 MotorSales home page showing the Post a listing button"
            annotations={[{ n: 1, x: 87, y: 39, label: "Click Post a listing", side: "left" }]}
          />
          <SupportSteps>
            <SupportStep n={1} title="Click Post a listing">
              Top-right of every page. You'll be asked to sign in if you haven't already.
            </SupportStep>
            <SupportStep n={2} title="Pick a category and vehicle">
              Choose the type (Car, Motorcycle, etc.) and select make, model and year.
            </SupportStep>
            <SupportStep n={3} title="Add great photos">
              Up to 20 photos and 1 video. Use daylight, clean the vehicle, and shoot from all 4 sides plus interior and engine.
            </SupportStep>
            <SupportStep n={4} title="Set your price and location">
              Prices are in ₱ PHP. Pick the region and city — buyers filter by location.
            </SupportStep>
            <SupportStep n={5} title="Publish">
              Your listing goes live for 60 days. Free.
            </SupportStep>
          </SupportSteps>
        </div>

        <div>
          <h2 className="text-xl font-semibold sm:text-2xl">Boost your listing</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Boosts move your listing higher in search and add featured placements.
          </p>
          <AnnotatedScreenshot
            src={pricingShot}
            alt="Pricing page with Search Boost, Province Boost and Homepage Spotlight tiers"
            annotations={[
              { n: 1, x: 30, y: 81, label: "₱99 — Search Boost", side: "right" },
              { n: 2, x: 55, y: 81, label: "₱199 — Province", side: "right" },
              { n: 3, x: 80, y: 81, label: "₱499 — Homepage", side: "left" },
            ]}
          />
          <SupportSteps>
            <SupportStep n={1} title="Open Dashboard → My listings">
              Find the listing you want to promote.
            </SupportStep>
            <SupportStep n={2} title="Click Boost">
              Pick the plan that matches your goal. Stripe handles payment securely.
            </SupportStep>
            <SupportStep n={3} title="Track results">
              Your dashboard shows views and click-throughs while the boost is active.
            </SupportStep>
          </SupportSteps>
        </div>

        <div>
          <h2 className="text-xl font-semibold sm:text-2xl">Photo tips that sell faster</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>• Shoot in daylight — avoid harsh midday sun and dark garages.</li>
            <li>• Clean the vehicle inside and out before shooting.</li>
            <li>• Capture all 4 sides, both rows of seats, dashboard, odometer, engine bay and tires.</li>
            <li>• Include OR/CR (cover the plate number) to signal a legitimate listing.</li>
            <li>• Avoid heavy filters — buyers want to see the true condition.</li>
          </ul>
        </div>
      </section>
    </SupportArticleLayout>
  );
}
