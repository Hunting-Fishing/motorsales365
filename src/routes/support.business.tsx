import { createFileRoute, Link } from "@tanstack/react-router";
import { AnnotatedScreenshot } from "@/components/support/annotated-screenshot";
import { SupportStep, SupportSteps } from "@/components/support/support-step";
import { SupportArticleLayout } from "@/components/support/support-article-layout";
import shopShot from "@/assets/support/shop.png";
import businessesShot from "@/assets/support/businesses.png";

const TITLE = "Business, shop & payments";
const DESC = "Set up a business page, manage affiliate shop links, and handle billing, receipts and refunds.";

export const Route = createFileRoute("/support/business")({
  component: BusinessSupport,
  head: () => ({
    meta: [
      { title: `${TITLE} — Help & Support | 365 MotorSales` },
      { name: "description", content: DESC },
      { property: "og:title", content: `${TITLE} — 365 MotorSales Help` },
      { property: "og:description", content: DESC },
      { property: "og:url", content: "https://365motorsales.com/support/business" },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: "https://365motorsales.com/support/business" }],
  }),
});

function BusinessSupport() {
  return (
    <SupportArticleLayout title={TITLE} description={DESC}>
      <section className="space-y-10">
        <div>
          <h2 className="text-xl font-semibold sm:text-2xl">Create a business page</h2>
          <AnnotatedScreenshot
            src={businessesShot}
            alt="Businesses directory with the List your business button highlighted"
            annotations={[
              { n: 1, x: 90, y: 56, label: "List your business", side: "left" },
              { n: 2, x: 25, y: 73, label: "Categories & filters", side: "right" },
            ]}
          />
          <SupportSteps>
            <SupportStep n={1} title="Click List your business">
              From the Businesses page (top-right). You'll need a logged-in account.
            </SupportStep>
            <SupportStep n={2} title="Fill in your details">
              Name, category (dealership, repair shop, parts, etc.), location, hours, photos and accepted payments.
            </SupportStep>
            <SupportStep n={3} title="Pick a plan">
              Free directory listing, or upgrade for leads, multiple staff seats and analytics.
            </SupportStep>
            <SupportStep n={4} title="Publish & manage leads">
              Inquiries land in Dashboard → Leads. Assign to staff and respond fast — buyers move quickly.
            </SupportStep>
          </SupportSteps>
        </div>

        <div>
          <h2 className="text-xl font-semibold sm:text-2xl">Shop products & affiliate links</h2>
          <AnnotatedScreenshot
            src={shopShot}
            alt="Shop page with vehicle fitment picker"
            annotations={[{ n: 1, x: 50, y: 88, label: "Find parts that fit your vehicle", side: "top" }]}
          />
          <SupportSteps>
            <SupportStep n={1} title="Pick your vehicle">
              Use the fitment picker so we only show parts compatible with your make and model.
            </SupportStep>
            <SupportStep n={2} title="Click through to buy">
              You'll be sent to Shopee, Lazada, AliExpress or the brand store. Pricing, shipping and returns are handled there.
            </SupportStep>
            <SupportStep n={3} title="How we earn">
              We may receive a small commission — your price doesn't change.{" "}
              <Link to="/affiliate-disclosure" className="font-semibold text-primary underline">
                Read the full disclosure
              </Link>
              .
            </SupportStep>
          </SupportSteps>
        </div>

        <div>
          <h2 className="text-xl font-semibold sm:text-2xl">Billing, receipts & refunds</h2>
          <SupportSteps>
            <SupportStep n={1} title="Find your receipts">
              Dashboard → Billing lists every charge with downloadable PDF receipts.
            </SupportStep>
            <SupportStep n={2} title="Update payment method">
              From Billing, click Manage to add or change card / e-wallet.
            </SupportStep>
            <SupportStep n={3} title="Request a refund">
              Within 24 hours of an unused boost, click <strong>Refund</strong> next to the charge. See the{" "}
              <Link to="/refund-policy" className="font-semibold text-primary underline">
                Refund Policy
              </Link>{" "}
              for full details.
            </SupportStep>
            <SupportStep n={4} title="Cancel a subscription">
              Business plans can be cancelled any time from Dashboard → Billing. Access continues until the end of the paid period.
            </SupportStep>
          </SupportSteps>
        </div>
      </section>
    </SupportArticleLayout>
  );
}
