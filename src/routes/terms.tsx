import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";

const TITLE = "Terms & Conditions — 365 MotorSales Philippines";
const DESCRIPTION =
  "Terms & Conditions for 365 MotorSales Philippines: accounts, listings, business directory, pricing, fees, payments, refunds, and Philippine law (RA 11967, RA 8792, RA 7394, RA 10173, RA 10175).";
const URL = "https://www.365motorsales.com/terms";
const SUPPORT_EMAIL = "legal@365motorsales.com";

export const Route = createFileRoute("/terms")({
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
  component: TermsPage,
});

function TermsPage() {
  const lastUpdated = "June 5, 2026 (rev. sponsored category slots, on-site advertising, business directory tiers & featured tow provider spotlights)";

  return (
    <SiteLayout>
      <article className="container mx-auto max-w-3xl px-4 py-16 prose prose-sm dark:prose-invert">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Terms &amp; Conditions</h1>
        <p className="text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
        <p className="mt-2 text-muted-foreground">
          These Terms &amp; Conditions ("<strong>Terms</strong>") form a binding agreement between
          you and 365 MotorSales Philippines ("<strong>365 MotorSales</strong>", "
          <strong>we</strong>", "<strong>us</strong>", or the "<strong>Platform</strong>") under the
          laws of the Republic of the Philippines, including the{" "}
          <em>Electronic Commerce Act of 2000</em> (RA 8792) and the{" "}
          <em>Internet Transactions Act of 2023</em> (RA 11967). By creating an account, posting a
          listing, claiming a business profile, browsing the site, or otherwise using the Platform,
          you confirm that you have read, understood, and accepted these Terms together with our{" "}
          <Link className="text-primary underline" to="/privacy">
            Privacy Policy
          </Link>
          ,{" "}
          <Link className="text-primary underline" to="/guidelines">
            Community Guidelines
          </Link>
          , and{" "}
          <Link className="text-primary underline" to="/refund-policy">
            Refund Policy
          </Link>
          . Your click, tap, or continued use constitutes a valid electronic signature under Section
          8 of RA 8792.
        </p>

        <h2 className="mt-8 text-xl font-semibold">1. The service we provide</h2>
        <p className="mt-2 text-muted-foreground">
          365 MotorSales operates an online marketplace and business directory that allows private
          individuals and registered businesses in the Philippines to list, discover, and enquire
          about vehicles, parts, equipment, fuel stations, and related services. We are an{" "}
          <em>e-marketplace operator</em> within the meaning of RA 11967. We are not a seller,
          buyer, broker, financier, transport carrier, mechanic, or insurer, and we do not take
          title to or possession of any item listed on the Platform.
        </p>
        <p className="mt-2 text-muted-foreground">
          Business mini-sites may offer online <strong>appointment bookings</strong>. When a
          customer books a service, 365 MotorSales transmits the booking details (customer name,
          contact, time, notes) to the business. The business is solely responsible for honouring,
          rescheduling, or cancelling the appointment, for any deposit or payment policy it
          advertises, and for complying with the Consumer Act (RA 7394). We are not a party to the
          booking contract.
        </p>

        <h2 className="mt-6 text-xl font-semibold">2. Eligibility</h2>
        <ul className="mt-2 list-disc pl-6 text-muted-foreground">
          <li>
            You must be at least eighteen (18) years old and have the legal capacity to enter into
            binding contracts under Philippine law.
          </li>
          <li>
            Business accounts must be operated by a sole proprietorship, partnership, corporation,
            or cooperative duly registered with the Department of Trade and Industry (DTI), the
            Securities and Exchange Commission (SEC), or the Cooperative Development Authority
            (CDA), and the relevant local government unit, and must be in good standing with the
            Bureau of Internal Revenue (BIR).
          </li>
          <li>
            You confirm that the information you provide on registration and in your listings is
            true, accurate, and complete, and that you have the legal right to offer the items or
            services you list.
          </li>
        </ul>

        <h2 className="mt-6 text-xl font-semibold">3. Accounts &amp; security</h2>
        <ul className="mt-2 list-disc pl-6 text-muted-foreground">
          <li>
            You are responsible for safeguarding your login credentials and for all activity under
            your account.
          </li>
          <li>
            One natural person or one registered business per account; multi-accounting or
            impersonation is prohibited.
          </li>
          <li>
            We may, in good faith, request government-issued identification, business registration
            documents, or proof of vehicle ownership to verify accounts in accordance with RA 11967
            and our anti-fraud obligations.
          </li>
          <li>
            You must notify us immediately at{" "}
            <a className="text-primary underline" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>{" "}
            of any unauthorised access, suspected breach, or compromise of your account.
          </li>
        </ul>

        <h2 className="mt-6 text-xl font-semibold">
          4. Listings of vehicles, parts &amp; services
        </h2>
        <ul className="mt-2 list-disc pl-6 text-muted-foreground">
          <li>List only items that you legally own and have the right to transfer.</li>
          <li>
            For motor vehicles, you must hold a valid Certificate of Registration (CR) and Official
            Receipt (OR) issued by the Land Transportation Office (LTO), and the chassis and engine
            numbers must match the registration documents in accordance with RA 4136 (Land
            Transportation and Traffic Code) and related LTO issuances.
          </li>
          <li>
            Imported vehicles, equipment, or parts must comply with Bureau of Customs (BOC)
            documentation and any applicable import restrictions (including EO 156, EO 877-A, and
            related issuances on used motor vehicles).
          </li>
          <li>
            Photos must be your own and accurately depict the actual item. Watermarked, stolen,
            stock, or materially altered images are prohibited.
          </li>
          <li>
            Listings must honestly describe condition, mileage, accident or flood history, prior
            repairs, missing parts, and any encumbrances (chattel mortgage, lien, or pending
            transfer).
          </li>
          <li>Mark listings as "Sold" or remove them promptly once the transaction closes.</li>
        </ul>

        <h2 className="mt-6 text-xl font-semibold">
          5. Business directory &amp; merchant obligations
        </h2>
        <p className="mt-2 text-muted-foreground">
          Verified business owners may operate a business profile (fuel station, parts shop,
          convenience or sari-sari store, service centre, towing operator, dealership, etc.).
          Pursuant to RA 11967 and its Implementing Rules and Regulations, business owners agree to
          keep the following true and current:
        </p>
        <ul className="mt-2 list-disc pl-6 text-muted-foreground">
          <li>
            Registered business name, trade name, principal address, map pin, and contact details.
          </li>
          <li>
            Operating hours, including separate hours for convenience or sari-sari sections where
            different from the main fuel or service hours. The Platform displays "Open", "Closing
            soon", and "Opens soon" indicators derived from these hours.
          </li>
          <li>
            Catalog of services and products (fuels, lubricants, car wash, tire and air, inflation,
            LPG, EV charging, retail items, etc.) and any prices the owner chooses to publish.
          </li>
          <li>
            Photos, photo galleries (organised into albums), embedded videos (YouTube, Vimeo, or
            Facebook video URLs), amenities, accepted payment methods, additional contact channels
            (phone, WhatsApp, Viber, Telegram, Instagram, TikTok, email, Facebook, X, LinkedIn), and
            any required permits (e.g. DOE for retail fuel outlets, FDA for regulated goods).
          </li>
          <li>
            Owners are responsible for the rights to all media they upload, and must not post
            content that infringes copyright, contains personal data of third parties without
            consent, or violates Platform community guidelines.
          </li>
        </ul>
        <p className="mt-2 text-muted-foreground">
          Materially misrepresenting hours, services, stock, or prices may result in suspension or
          removal of the business profile and, where required, referral to the DTI E-Commerce Bureau
          or other competent authority.
        </p>

        <h2 className="mt-6 text-xl font-semibold">
          6. Pricing display, currency &amp; promo pricing
        </h2>
        <ul className="mt-2 list-disc pl-6 text-muted-foreground">
          <li>
            The official currency for all listings on the Platform is the{" "}
            <strong>Philippine Peso (₱)</strong>. All prices are deemed inclusive of value-added tax
            (VAT) and other applicable taxes unless the listing expressly states otherwise, in
            compliance with RA 7394 (Consumer Act of the Philippines) and RA 10963 (TRAIN Law).
          </li>
          <li>
            Signed-in users may select a preferred display currency in their profile. Converted
            amounts shown alongside ₱ are <em>indicative only</em>; the listed ₱ price is the
            authoritative price, and exchange-rate variations are not grounds for a price
            adjustment.
          </li>
          <li>
            Service and product prices may be published with units such as <em>₱/L</em>,{" "}
            <em>₱/kWh</em>, <em>₱/item</em>, <em>per service</em>, or as a "From ₱…" indicative
            price.
          </li>
          <li>
            Promotional or sale prices must reflect the actual price the seller is willing to honour
            at the time of display, in line with the price-tag and deceptive-sales-acts provisions
            of RA 7394.
          </li>
          <li>
            Indicative prices ("From ₱…") do not constitute a binding offer; the final price is
            confirmed by the business at the point of sale.
          </li>
        </ul>

        <h2 className="mt-6 text-xl font-semibold">7. Prohibited items &amp; conduct</h2>
        <p className="mt-2 text-muted-foreground">
          You may not list, advertise, or use the Platform to facilitate the sale, lease, or
          exchange of any of the following:
        </p>
        <ul className="mt-2 list-disc pl-6 text-muted-foreground">
          <li>
            Stolen vehicles, parts, or documents, including tampered chassis or engine numbers,
            falsified OR/CR, or forged plates (RA 6539 — Anti-Carnapping Act, as amended by RA
            10883).
          </li>
          <li>Vehicles or equipment without legal title or proper import documentation.</li>
          <li>
            Firearms, ammunition, explosives, illegal drugs, or any item restricted or prohibited
            under Philippine law (including RA 9165, RA 10591, and BOC regulations).
          </li>
          <li>
            Counterfeit branded parts, accessories, or merchandise, in violation of RA 8293
            (Intellectual Property Code of the Philippines).
          </li>
          <li>
            Misleading photos, fabricated reviews, undisclosed material defects, or any other act
            constituting a deceptive, unfair, or unconscionable sales practice under RA 7394.
          </li>
          <li>
            Spam, harassment, threats, scams, phishing, identity theft, or impersonation, which may
            constitute offences under RA 10175 (Cybercrime Prevention Act) and RA 8484 (Access
            Devices Regulation Act).
          </li>
          <li>
            Attempts to take communications or payment off-Platform with the purpose of bypassing
            safety features, fees, or our dispute-resolution mechanism.
          </li>
        </ul>

        <h2 className="mt-6 text-xl font-semibold">8. Fees, boosts, subscriptions &amp; advertising</h2>
        <p className="mt-2 text-muted-foreground">
          Posting and browsing listings is generally free. Certain optional features — including
          listing boosts, business plans, premium directory placement, and on-site advertising
          (ad carousels and <strong>exclusive Sponsored Category Slots</strong>, where a single
          advertiser pays to appear as the featured sponsor at the top of a browse category for
          a defined period) — require payment. Sponsored content is always clearly labeled as
          "Sponsor", "Sponsored", or "Ad" and never displaces organic listings or search results.
          Current pricing is published on our{" "}
          <Link className="text-primary underline" to="/pricing">
            Pricing page
          </Link>{" "}
          and is quoted in ₱ inclusive of VAT where applicable. Subscriptions and sponsorship
          terms renew automatically until you cancel from your dashboard; cancellation stops
          future renewals but does not entitle you to a refund of the current billing period
          except as provided in our{" "}
          <Link className="text-primary underline" to="/refund-policy">
            Refund Policy
          </Link>{" "}
          or as required by RA 7394.
        </p>

        <h2 className="mt-6 text-xl font-semibold">9. Payments, tax &amp; payment test mode</h2>
        <p className="mt-2 text-muted-foreground">
          Card and e-wallet payments for subscriptions, boosts, and business plans are processed by{" "}
          <strong>Stripe</strong> in live mode. Where supported by the buyer's location, Stripe
          calculates, collects, and remits applicable sales tax / VAT (including PH VAT) on our
          behalf and handles fraud screening, dispute (chargeback) processing, and transactional
          receipts directly. For buyers outside Stripe's supported tax jurisdictions, tax is
          calculated at checkout and remitted by us where required. When the Platform is operating
          in <strong>payment test mode</strong>, a visible banner is displayed and no real charges
          are made. We do not store full primary account numbers (PANs) on our servers; sensitive
          payment data is handled by PCI-DSS-compliant processors regulated by the Bangko Sentral ng
          Pilipinas (BSP) and operating in accordance with RA 11765 (Financial Products and Services
          Consumer Protection Act) and RA 9160 (Anti-Money Laundering Act, as amended).
        </p>

        <h2 className="mt-6 text-xl font-semibold">10. Refunds &amp; chargebacks</h2>
        <p className="mt-2 text-muted-foreground">
          Refund eligibility for listing fees, boosts, subscriptions, and advertising is governed by
          our{" "}
          <Link className="text-primary underline" to="/refund-policy">
            Refund Policy
          </Link>
          . Nothing in our Refund Policy limits or excludes any non-waivable consumer right granted
          to you under RA 7394 (Consumer Act) or RA 11765. Chargebacks initiated without first using
          our internal dispute-resolution channel may result in suspension of your account pending
          investigation.
        </p>

        <h2 className="mt-6 text-xl font-semibold">11. Buyer–seller transactions</h2>
        <p className="mt-2 text-muted-foreground">
          365 MotorSales provides the venue and tools; the actual contract of sale is concluded
          directly between the buyer and the seller and is governed by the Civil Code of the
          Philippines and, where the seller is a merchant, by RA 7394. We do not hold funds,
          transfer titles, inspect vehicles, or guarantee the condition, legality, roadworthiness,
          or fitness for purpose of any item or service. Buyers are strongly encouraged to:
        </p>
        <ul className="mt-2 list-disc pl-6 text-muted-foreground">
          <li>
            Physically inspect the vehicle and verify its chassis, engine, OR, and CR with the LTO.
          </li>
          <li>
            Execute a notarised Deed of Sale and complete the LTO transfer within the periods
            prescribed by LTO regulations to avoid penalties.
          </li>
          <li>Meet in safe, public locations and avoid carrying large amounts of cash.</li>
          <li>
            Use traceable payment methods (bank transfer, InstaPay/PESONet, or escrow) where
            possible.
          </li>
        </ul>

        <h2 className="mt-6 text-xl font-semibold">
          12. User-generated content &amp; intellectual property
        </h2>
        <p className="mt-2 text-muted-foreground">
          You retain ownership of the photos, text, reviews, and other content you upload ("
          <strong>User Content</strong>"). You grant 365 MotorSales a non-exclusive, worldwide,
          royalty-free, sublicensable licence to host, store, reproduce, resize, adapt, display, and
          distribute your User Content for the purpose of operating, securing, and promoting the
          Platform. You warrant that you own or have all necessary rights to your User Content and
          that it does not infringe any third party's rights under RA 8293 or any other law.
        </p>
        <p className="mt-2 text-muted-foreground">
          365 MotorSales respects intellectual-property rights. Rights holders who believe content
          on the Platform infringes their rights may submit a notice to{" "}
          <a className="text-primary underline" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>{" "}
          identifying the infringing material and the right asserted; we will act on validated
          notices in accordance with RA 8293 and RA 11967.
        </p>

        <h2 className="mt-6 text-xl font-semibold">13. Suspension &amp; termination</h2>
        <p className="mt-2 text-muted-foreground">
          We may, with or without prior notice as the circumstances warrant, suspend, restrict, or
          terminate your account or any listing if we reasonably believe you have violated these
          Terms, applicable Philippine law, or the rights of another user, or if required by a
          lawful order from a competent authority. Boost, subscription, or advertising fees paid in
          respect of suspended or terminated accounts are forfeited except where the suspension was
          attributable solely to our error.
        </p>

        <h2 className="mt-6 text-xl font-semibold">14. Dispute resolution</h2>
        <p className="mt-2 text-muted-foreground">
          In line with RA 11967, we maintain an internal dispute-resolution mechanism. Before
          commencing any formal proceedings, please raise your complaint with our support team at{" "}
          <a className="text-primary underline" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>{" "}
          or via the in-app help centre. We will acknowledge your complaint within five (5) business
          days and aim to resolve it within fifteen (15) business days.
        </p>
        <p className="mt-2 text-muted-foreground">
          If your complaint is not resolved to your satisfaction, you may escalate it to the DTI
          E-Commerce Bureau, the Department of Trade and Industry Consumer Protection Group, the
          National Privacy Commission (for data-privacy matters), or the BSP Consumer Assistance
          Mechanism (for payment-related matters), as appropriate.
        </p>

        <h2 className="mt-6 text-xl font-semibold">15a. 365 Learn (education portal)</h2>
        <p className="mt-2 text-muted-foreground">
          Through{" "}
          <Link className="text-primary underline" to="/learn">
            365 Learn
          </Link>{" "}
          we offer video courses, quizzes and certificates of completion. Courses may be purchased
          individually (one-time payment) or unlocked as part of an active subscription plan (where
          indicated on the course page). Course access is granted to your account only and is
          non-transferable. Certificates are issued automatically upon passing the final quiz and
          are publicly verifiable at <code>/c/&lt;code&gt;</code>; they are a record of
          participation, not an industry-recognised qualification, and do not constitute
          professional certification, accreditation or any licence to practise a regulated trade.
          Refunds for course purchases follow our{" "}
          <Link className="text-primary underline" to="/refund-policy">
            Refund Policy
          </Link>
          .
        </p>
        <p className="mt-2 text-muted-foreground">
          Our{" "}
          <Link className="text-primary underline" to="/partner-training">
            Partner Training
          </Link>{" "}
          page lists external training schools as <strong>paid sponsored placements</strong>. 365
          MotorSales does not certify, accredit, endorse or guarantee any partner school, their
          curriculum, instructors, facilities, fees or outcomes. You are solely responsible for
          verifying accreditation, qualifications and any contractual terms with the partner before
          enrolling or paying any sum directly to a partner. Any agreement you enter with a partner
          school is strictly between you and that school.
        </p>

        <h2 className="mt-6 text-xl font-semibold">15. Privacy &amp; data protection</h2>
        <p className="mt-2 text-muted-foreground">
          Our processing of personal data is described in our{" "}
          <Link className="text-primary underline" to="/privacy">
            Privacy Policy
          </Link>
          . We process personal data in accordance with RA 10173 (Data Privacy Act of 2012), its
          Implementing Rules and Regulations, and applicable issuances of the National Privacy
          Commission.
        </p>

        <h2 className="mt-6 text-xl font-semibold">
          16. Disclaimers &amp; limitation of liability
        </h2>
        <p className="mt-2 text-muted-foreground">
          The Platform is provided on an "<em>as is</em>" and "<em>as available</em>" basis. To the
          maximum extent permitted by Philippine law, 365 MotorSales disclaims all implied
          warranties of merchantability, fitness for a particular purpose, and non-infringement,
          except as expressly provided in these Terms.
        </p>
        <p className="mt-2 text-muted-foreground">
          To the maximum extent permitted by law, 365 MotorSales shall not be liable for indirect,
          incidental, special, consequential, or exemplary damages, or for losses arising from
          buyer–seller disputes, product defects, inaccurate listings, or third-party services such
          as towing, financing, repair, or insurance. Our aggregate liability for any claim arising
          out of or relating to the Platform shall not exceed the total fees you paid us in the
          twelve (12) months preceding the event giving rise to the claim. Nothing in this section
          limits liability for fraud, wilful misconduct, gross negligence, or any other liability
          that cannot be limited or excluded under Philippine law (including non-waivable rights
          under RA 7394 and RA 11765).
        </p>

        <h2 className="mt-6 text-xl font-semibold">17. Force majeure</h2>
        <p className="mt-2 text-muted-foreground">
          Neither party is liable for any failure or delay in performing its obligations caused by
          events beyond its reasonable control, including acts of God, typhoons, earthquakes,
          floods, fire, pandemic, civil unrest, government action, telecommunications or power
          failures, or third-party service outages.
        </p>

        <h2 className="mt-6 text-xl font-semibold">
          18A. Export brokerage, learning, referrals &amp; organisation accounts
        </h2>
        <ul className="mt-2 list-disc pl-6 text-muted-foreground">
          <li>
            <strong>Export brokerage.</strong> Where 365 MotorSales facilitates introductions to
            overseas buyers or logistics partners, we act solely as a listing and introduction
            venue; we are not the shipper, exporter of record, or customs broker. You are
            responsible for compliance with Philippine export rules and the destination
            country's import, tax, and sanctions requirements.
          </li>
          <li>
            <strong>Learning &amp; partner training.</strong> Courses, certifications, and partner
            training are provided "as is" for educational purposes only and do not constitute
            professional, legal, or mechanical advice. Completion does not create employment or
            agency with 365 MotorSales.
          </li>
          <li>
            <strong>Referrals.</strong> Referral credits and payouts are governed by the in-app
            referral terms shown at enrolment. We may adjust, claw back, or void credits obtained
            through fraud, self-referral, or abusive patterns, consistent with Section 9.
          </li>
          <li>
            <strong>Organisation accounts.</strong> Where multiple users access a single
            organisation account, the account owner is responsible for all activity under that
            account, for inviting/removing members, and for ensuring members comply with these
            Terms. Roles within an organisation do not extend privileges beyond what these Terms
            and our published policies allow.
          </li>
        </ul>

        <h2 className="mt-6 text-xl font-semibold">18. Governing law &amp; venue</h2>
        <p className="mt-2 text-muted-foreground">
          These Terms are governed by and construed in accordance with the laws of the Republic of
          the Philippines, without regard to its conflict-of-laws principles. Subject to Section 14
          (Dispute Resolution), the parties submit to the exclusive jurisdiction of the proper
          courts of the City of Makati, Metro Manila, Philippines, for any dispute arising out of or
          relating to these Terms or the Platform.
        </p>

        <h2 className="mt-6 text-xl font-semibold">19. Changes to these Terms</h2>
        <p className="mt-2 text-muted-foreground">
          We may update these Terms when the Platform's features, fees, or applicable law change
          (for example, new pricing units, new business-directory features, new payment methods, or
          updated regulatory requirements). Material changes will be announced on the site and the
          "Last updated" date above will be bumped. Continued use of the Platform after the
          effective date of any update constitutes acceptance of the revised Terms.
        </p>

        <h2 className="mt-6 text-xl font-semibold">20. General provisions</h2>
        <ul className="mt-2 list-disc pl-6 text-muted-foreground">
          <li>
            <strong>Entire agreement.</strong> These Terms, together with the Privacy Policy,
            Community Guidelines, and Refund Policy, constitute the entire agreement between you and
            365 MotorSales regarding the Platform.
          </li>
          <li>
            <strong>Severability.</strong> If any provision is found unenforceable, the remaining
            provisions remain in full force and effect.
          </li>
          <li>
            <strong>No waiver.</strong> Our failure to enforce any right or provision is not a
            waiver of that right or provision.
          </li>
          <li>
            <strong>Assignment.</strong> You may not assign these Terms without our prior written
            consent. We may assign these Terms to an affiliate or in connection with a merger,
            acquisition, or sale of assets.
          </li>
          <li>
            <strong>Electronic notices.</strong> You consent to receive notices from us
            electronically (in-app or by email), which shall satisfy any legal requirement that such
            notice be in writing under RA 8792.
          </li>
        </ul>

        <h2 className="mt-6 text-xl font-semibold">21. Contact</h2>
        <p className="mt-2 text-muted-foreground">
          Questions, complaints, or notices under these Terms should be sent to{" "}
          <a className="text-primary underline" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </article>
    </SiteLayout>
  );
}
