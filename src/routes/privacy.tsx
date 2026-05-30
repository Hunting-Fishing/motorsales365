import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";

const TITLE = "Privacy Policy — 365 MotorSales Philippines";
const DESCRIPTION =
  "How 365 MotorSales Philippines collects, uses, shares, and protects your personal data under the Data Privacy Act of 2012 (RA 10173).";
const URL = "https://365motorsales.com/privacy";

export const Route = createFileRoute("/privacy")({
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
  component: PrivacyPage,
});

function PrivacyPage() {
  const lastUpdated = "May 30, 2026";

  return (
    <SiteLayout>
      <article className="container mx-auto max-w-3xl px-4 py-16 prose prose-sm dark:prose-invert">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">Last updated: {lastUpdated}</p>

        <p className="mt-4 text-muted-foreground">
          365 MotorSales Philippines ("we", "us", "the Platform") respects your privacy and complies
          with the Philippines' <strong>Data Privacy Act of 2012 (RA 10173)</strong> and its
          Implementing Rules and Regulations. This policy explains what we collect, why, who we
          share it with, and the rights you have. It works together with our{" "}
          <Link className="text-primary underline" to="/terms">Terms &amp; Conditions</Link>.
        </p>



        <h2 className="mt-8 text-xl font-semibold">1. Who we are (Data Controller)</h2>
        <p className="mt-2 text-muted-foreground">
          365 MotorSales Philippines is the Personal Information Controller for data collected
          through the Platform. Our Data Protection Officer (DPO) can be reached at{" "}
          <a className="text-primary underline" href="mailto:dpo@365motorsales.ph">
            dpo@365motorsales.ph
          </a>
          .
        </p>

        <h2 className="mt-6 text-xl font-semibold">2. Information we collect</h2>
        <ul className="mt-2 list-disc pl-6 text-muted-foreground">
          <li>
            <strong>Account data:</strong> name, email, phone number, password (hashed),
            authentication provider (e.g. Google).
          </li>
          <li>
            <strong>Profile data:</strong> avatar, display name, business name, location, optional
            government ID and business permits submitted for verification.
          </li>
          <li>
            <strong>Listing data:</strong> photos, descriptions, prices in ₱, vehicle details (make,
            model, year, plate area), parts/services details, contact preferences.
          </li>
          <li>
            <strong>Business directory data:</strong> business address, location pin, operating
            hours (including separate convenience/sari-sari hours), services &amp; products catalog,
            and any prices you publish.
          </li>
          <li>
            <strong>Transactions:</strong> billing details, transaction IDs, plan/boost purchases,
            payment status. Card numbers are handled by our payment processors — we do not store
            full card numbers.
          </li>
          <li>
            <strong>Messages &amp; leads:</strong> in-platform messages, inquiries, and lead replies
            between buyers, sellers, and businesses.
          </li>
          <li>
            <strong>Device &amp; usage data:</strong> pages viewed, searches, clicks, device type,
            browser, IP address, approximate location, referral source.
          </li>
          <li>
            <strong>Location (optional):</strong> precise location when you opt in for "near me"
            search, map features, or pinning a business.
          </li>
          <li>
            <strong>Cookies &amp; similar tech:</strong> see Section 6.
          </li>
        </ul>

        <h2 className="mt-6 text-xl font-semibold">3. How we use your data</h2>
        <ul className="mt-2 list-disc pl-6 text-muted-foreground">
          <li>Operate the marketplace and business directory and display listings to other users.</li>
          <li>Verify identity, business ownership, and reduce fraud or impersonation.</li>
          <li>Show accurate operating-hour indicators ("Open", "Closing soon", "Opens soon").</li>
          <li>Process payments for listings, boosts, subscriptions, and advertising.</li>
          <li>Send transactional emails (account, listing status, messages, receipts).</li>
          <li>Send optional marketing emails — you can unsubscribe at any time.</li>
          <li>Improve search, rankings, recommendations, and platform performance.</li>
          <li>Comply with legal obligations and respond to lawful requests from authorities.</li>
        </ul>

        <h2 className="mt-6 text-xl font-semibold">4. Legal bases for processing</h2>
        <ul className="mt-2 list-disc pl-6 text-muted-foreground">
          <li><strong>Contract:</strong> to provide the services you signed up for.</li>
          <li><strong>Consent:</strong> for optional features such as precise location, analytics
            cookies, and marketing emails.</li>
          <li><strong>Legal obligation:</strong> tax records, anti-fraud, lawful disclosures.</li>
          <li><strong>Legitimate interest:</strong> securing the platform, preventing abuse, and
            improving the product.</li>
        </ul>

        <h2 className="mt-6 text-xl font-semibold">5. Sharing &amp; processors</h2>
        <p className="mt-2 text-muted-foreground">
          We share data only with processors bound by confidentiality and data-processing
          agreements, including:
        </p>
        <ul className="mt-2 list-disc pl-6 text-muted-foreground">
          <li><strong>Cloud hosting &amp; database:</strong> our managed backend provider.</li>
          <li><strong>Payments:</strong> Stripe and other licensed processors for cards, GCash,
            Maya, and bank transfer.</li>
          <li><strong>Email:</strong> transactional and notification emails are sent through our
            managed email infrastructure on the verified subdomain <code>notify.365motorsales.com</code>.</li>
          <li><strong>Maps &amp; geocoding:</strong> map tiles via <strong>OpenStreetMap</strong> (Leaflet)
            and address geocoding via <strong>OSM Nominatim</strong>. <strong>Google Places</strong>
            is used only by admins to import public business listings into our directory.</li>
          <li><strong>Analytics:</strong> <strong>Google Analytics 4</strong> (with IP anonymization),
            loaded only after you accept optional cookies via the cookie banner.</li>
          <li><strong>Customer support tools:</strong> to handle your tickets and inquiries.</li>
        </ul>
        <p className="mt-2 text-muted-foreground">
          We do not sell your personal data. We may disclose data when required by Philippine law,
          a valid subpoena, or to protect rights and safety.
        </p>

        <h2 className="mt-6 text-xl font-semibold">6. Cookies &amp; similar technologies</h2>
        <ul className="mt-2 list-disc pl-6 text-muted-foreground">
          <li><strong>Essential cookies:</strong> login, session, security, CSRF.</li>
          <li><strong>Preference cookies:</strong> language, currency, theme.</li>
          <li><strong>Analytics cookies (optional):</strong> aggregate usage stats.</li>
          <li><strong>Advertising cookies (optional):</strong> only if you opt in.</li>
        </ul>
        <p className="mt-2 text-muted-foreground">
          You can decline non-essential cookies through the banner shown on first visit and change
          your choice anytime from your browser settings.
        </p>

        <h2 className="mt-6 text-xl font-semibold">7. Public information</h2>
        <p className="mt-2 text-muted-foreground">
          Some data is public by design: your listing details, business profile, business hours,
          published services and prices, public reviews, and your seller display name. Do not
          include sensitive personal information in public fields.
        </p>

        <h2 className="mt-6 text-xl font-semibold">8. International transfers</h2>
        <p className="mt-2 text-muted-foreground">
          Some processors may store or process data outside the Philippines. When this happens we
          rely on contractual safeguards and provider security certifications consistent with the
          NPC's guidance on cross-border transfers.
        </p>

        <h2 className="mt-6 text-xl font-semibold">9. Retention</h2>
        <p className="mt-2 text-muted-foreground">
          We keep account and listing data while your account is active. After deletion we retain
          limited data (transaction records, dispute history, fraud signals) for up to 5 years to
          comply with tax, accounting, and legal requirements. Backups roll off on a fixed cycle.
        </p>

        <h2 className="mt-6 text-xl font-semibold">10. Security</h2>
        <p className="mt-2 text-muted-foreground">
          We protect your data with HTTPS, encrypted storage at rest, role-based access control,
          row-level security on our database, audit logging, and routine security reviews. Sign-in
          is available via email/password or <strong>Google</strong>, with leaked-password
          protection (HIBP) on new and changed passwords and optional
          <strong> two-factor authentication (TOTP)</strong> for every account. Two-factor
          authentication is <strong>required</strong> for administrator accounts. No system is
          100% secure — please use a strong, unique password and enable 2FA where available.
        </p>

        <h2 className="mt-6 text-xl font-semibold">11. Children</h2>
        <p className="mt-2 text-muted-foreground">
          The Platform is not directed to children under 18. We do not knowingly collect personal
          data from minors. If you believe a minor has created an account, contact our DPO and we
          will remove it.
        </p>

        <h2 className="mt-6 text-xl font-semibold">12. Your rights under RA 10173</h2>
        <ul className="mt-2 list-disc pl-6 text-muted-foreground">
          <li>Right to be informed about how your data is processed.</li>
          <li>Right to access, correct, or update your data.</li>
          <li>Right to object to or withdraw consent for certain processing.</li>
          <li>Right to data portability (export your account data).</li>
          <li>Right to erasure or blocking, subject to legal retention.</li>
          <li>Right to damages for violations.</li>
          <li>
            Right to file a complaint with the{" "}
            <a
              className="text-primary underline"
              href="https://privacy.gov.ph"
              target="_blank"
              rel="noreferrer noopener"
            >
              National Privacy Commission (NPC)
            </a>
            .
          </li>
        </ul>

        <h2 className="mt-6 text-xl font-semibold">13. Contact</h2>
        <p className="mt-2 text-muted-foreground">
          For privacy questions or to exercise your rights, contact our Data Protection Officer at{" "}
          <a className="text-primary underline" href="mailto:dpo@365motorsales.ph">
            dpo@365motorsales.ph
          </a>
          . We respond within 15 business days.
        </p>

        <h2 className="mt-6 text-xl font-semibold">14. Changes to this policy</h2>
        <p className="mt-2 text-muted-foreground">
          We may update this policy when the Platform changes — for example new processors, new
          analytics tools, new data fields (such as business hours or pricing catalogs), or updated
          payment methods. Material changes will be announced on the site and the "Last updated"
          date above will be bumped. Continued use of the Platform after changes are posted means
          you accept the updated policy.
        </p>
      </article>
    </SiteLayout>
  );
}
