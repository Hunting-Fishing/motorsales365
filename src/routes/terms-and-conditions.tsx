import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";

const TITLE = "Terms & Conditions — 365 MotorSales Philippines";
const DESCRIPTION =
  "Full Terms & Conditions for 365 MotorSales Philippines: accounts, listings, business directory, pricing in ₱, fees, payments, refunds, and PH law.";
const URL = "https://365motorsales.com/terms-and-conditions";

export const Route = createFileRoute("/terms-and-conditions")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: URL },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: TermsAndConditionsPage,
});

function TermsAndConditionsPage() {
  const lastUpdated = "May 29, 2026";

  return (
    <SiteLayout>
      <article className="container mx-auto max-w-3xl px-4 py-16 prose prose-sm dark:prose-invert">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Terms & Conditions</h1>
        <p className="text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
        <p className="mt-2 text-muted-foreground">
          These Terms & Conditions ("Terms") govern your use of 365 MotorSales Philippines. For the
          shorter, plain-English version see our{" "}
          <Link className="text-primary underline" to="/terms">Terms of Service</Link>. By creating
          an account, posting a listing, claiming a business, or otherwise using the platform you
          agree to these Terms.
        </p>

        <h2 className="mt-8 text-xl font-semibold">1. Introduction & acceptance</h2>
        <p className="mt-2 text-muted-foreground">
          365 MotorSales Philippines ("we", "us", "the Platform") operates an online marketplace and
          business directory for vehicles, parts, fuel stations, and related services in the
          Philippines. By accessing the Platform you agree to these Terms, our{" "}
          <Link className="text-primary underline" to="/privacy">Privacy Policy</Link>, our{" "}
          <Link className="text-primary underline" to="/guidelines">Community Guidelines</Link>, and
          our <Link className="text-primary underline" to="/refund-policy">Refund Policy</Link>.
        </p>

        <h2 className="mt-6 text-xl font-semibold">2. Eligibility</h2>
        <p className="mt-2 text-muted-foreground">
          You must be at least 18 years old and a resident of, or a business registered in, the
          Republic of the Philippines to post listings or operate a business profile. By signing up
          you confirm the information you provide is accurate and that you have the legal right to
          sell the items or services you list.
        </p>

        <h2 className="mt-6 text-xl font-semibold">3. Accounts & security</h2>
        <ul className="mt-2 list-disc pl-6 text-muted-foreground">
          <li>You are responsible for keeping your password and access to your account secure.</li>
          <li>One person or registered business per account; no impersonation.</li>
          <li>We may verify your identity, business permits, or vehicle ownership at any time.</li>
          <li>You must notify us immediately of any unauthorised access.</li>
        </ul>

        <h2 className="mt-6 text-xl font-semibold">4. Listings (vehicles, parts, services)</h2>
        <ul className="mt-2 list-disc pl-6 text-muted-foreground">
          <li>List only items you legally own and can transfer.</li>
          <li>Use your own clear photos. No watermarked, AI-faked, or stolen images.</li>
          <li>Be honest about condition, mileage, accidents, repairs, and missing parts.</li>
          <li>Keep prices in Philippine Pesos (₱). No bait-and-switch pricing.</li>
          <li>Mark listings as "Sold" promptly when the deal closes.</li>
        </ul>

        <h2 className="mt-6 text-xl font-semibold">5. Business directory</h2>
        <p className="mt-2 text-muted-foreground">
          Verified business owners may operate a business profile (fuel station, parts shop,
          convenience / sari-sari store, service centre, etc.). Owners are responsible for keeping
          the following accurate:
        </p>
        <ul className="mt-2 list-disc pl-6 text-muted-foreground">
          <li>Business name, address, location pin, and contact details.</li>
          <li>Operating hours, including separate hours for convenience or sari-sari sections where
            different from the main fuel/service hours. The Platform may display
            "Open", "Closing soon", and "Opens soon" indicators derived from these hours.</li>
          <li>Services and products catalog (fuels, lubes, car wash, tire/air, LPG, EV charging,
            shop items, etc.) and any prices you choose to publish.</li>
          <li>Photos, amenities, and accepted payment methods.</li>
        </ul>
        <p className="mt-2 text-muted-foreground">
          Misrepresenting hours, services, or stock availability may result in suspension of the
          business profile.
        </p>

        <h2 className="mt-6 text-xl font-semibold">6. Pricing display & promo pricing</h2>
        <ul className="mt-2 list-disc pl-6 text-muted-foreground">
          <li>All prices on the Platform are in Philippine Pesos (₱) and inclusive of applicable
            taxes unless explicitly stated.</li>
          <li>Service and product prices may be published with units such as <em>₱/L</em>, <em>₱/kWh</em>,
            <em> ₱/item</em>, <em>per service</em>, or as a "From ₱" indicative price.</li>
          <li>Promo or sale prices must reflect the actual price you are willing to honour at the
            time of display. Owners are responsible for updating prices when they change.</li>
          <li>Indicative prices ("From ₱…") do not create a binding offer; the final price is
            confirmed at the point of sale by the business.</li>
        </ul>

        <h2 className="mt-6 text-xl font-semibold">7. Prohibited items & conduct</h2>
        <ul className="mt-2 list-disc pl-6 text-muted-foreground">
          <li>Stolen vehicles, parts, or documents (including tampered chassis, OR/CR, or plates).</li>
          <li>Vehicles or equipment without legal title or proper import documentation.</li>
          <li>Weapons, illegal drugs, or any item restricted under Philippine law.</li>
          <li>Counterfeit branded parts; misleading photos; fake reviews.</li>
          <li>Spam, harassment, scams, phishing, or impersonation of other sellers.</li>
          <li>Off-platform contact attempts intended to bypass safety features or fees.</li>
        </ul>

        <h2 className="mt-6 text-xl font-semibold">8. Fees, boosts & subscriptions</h2>
        <p className="mt-2 text-muted-foreground">
          Certain features (listing boosts, business plans, premium directory placement, advertising)
          require payment. Current pricing is shown on our{" "}
          <Link className="text-primary underline" to="/pricing">Pricing page</Link>. All fees are
          quoted in ₱. Subscriptions renew automatically until cancelled from your dashboard;
          cancellation stops future charges but does not refund the current billing period.
        </p>

        <h2 className="mt-6 text-xl font-semibold">9. Payments & test mode</h2>
        <p className="mt-2 text-muted-foreground">
          Payments are processed by third-party providers. When the Platform is operating in payment
          test mode, a visible banner is shown and no real charges are made. We never store full
          card numbers on our servers.
        </p>

        <h2 className="mt-6 text-xl font-semibold">10. Refunds</h2>
        <p className="mt-2 text-muted-foreground">
          Refund eligibility for listing fees, boosts, and subscriptions is governed by our{" "}
          <Link className="text-primary underline" to="/refund-policy">Refund Policy</Link>.
        </p>

        <h2 className="mt-6 text-xl font-semibold">11. Buyer–seller transactions</h2>
        <p className="mt-2 text-muted-foreground">
          365 MotorSales is a venue. We are not a party to any transaction between buyers and
          sellers and we do not hold funds, transfer titles, or guarantee the condition or legality
          of any item or service. Always inspect a vehicle in person, verify documents (OR/CR, deed
          of sale), and meet in safe locations before paying.
        </p>

        <h2 className="mt-6 text-xl font-semibold">12. User-generated content</h2>
        <p className="mt-2 text-muted-foreground">
          You retain ownership of the photos, text, and other content you upload. You grant us a
          worldwide, royalty-free licence to host, display, resize, and redistribute that content
          for the purpose of operating and promoting the Platform. You confirm you have the right
          to upload everything you post.
        </p>

        <h2 className="mt-6 text-xl font-semibold">13. Suspension & termination</h2>
        <p className="mt-2 text-muted-foreground">
          We may suspend or terminate accounts that violate these Terms, attempt fraud, or receive
          multiple verified reports. Boost or subscription fees on suspended accounts are forfeited.
        </p>

        <h2 className="mt-6 text-xl font-semibold">14. Privacy</h2>
        <p className="mt-2 text-muted-foreground">
          How we collect and use personal data is described in our{" "}
          <Link className="text-primary underline" to="/privacy">Privacy Policy</Link>. We comply
          with the Data Privacy Act of 2012 (RA 10173).
        </p>

        <h2 className="mt-6 text-xl font-semibold">15. Limitation of liability</h2>
        <p className="mt-2 text-muted-foreground">
          To the maximum extent permitted by law, 365 MotorSales Philippines is not liable for
          losses arising from buyer–seller disputes, product defects, inaccurate business listings,
          or third-party services such as towing or repair. Our total liability for any claim is
          limited to the fees you paid us in the 30 days preceding the claim.
        </p>

        <h2 className="mt-6 text-xl font-semibold">16. Governing law</h2>
        <p className="mt-2 text-muted-foreground">
          These Terms are governed by the laws of the Republic of the Philippines. Disputes shall be
          resolved in the courts of Metro Manila.
        </p>

        <h2 className="mt-6 text-xl font-semibold">17. Changes to these Terms</h2>
        <p className="mt-2 text-muted-foreground">
          We may update these Terms when the Platform's features change (for example, new pricing
          units, new business directory features, new payment methods, or updated refund rules).
          Material changes will be announced on the site and the "Last updated" date above will be
          bumped. Continued use of the Platform after changes are posted means you accept the
          updated Terms.
        </p>

        <h2 className="mt-6 text-xl font-semibold">18. Contact</h2>
        <p className="mt-2 text-muted-foreground">
          Questions about these Terms? Email{" "}
          <a className="text-primary underline" href="mailto:legal@365motorsales.ph">
            legal@365motorsales.ph
          </a>
          .
        </p>
      </article>
    </SiteLayout>
  );
}
