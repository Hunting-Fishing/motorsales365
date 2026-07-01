import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";

const TITLE = "365 Partner Program Terms — Independent Partner Agreement";
const DESCRIPTION =
  "Independent partner terms for the 365 Motor Sales Partner Program. Commission-only, no employment relationship, no downline, PH governing law.";

export const Route = createFileRoute("/partner-program/terms")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <SiteLayout>
      <article className="container mx-auto max-w-3xl px-4 py-12 prose prose-slate dark:prose-invert">
        <p className="text-sm text-muted-foreground">Last updated: July 1, 2026</p>
        <h1>365 Partner Program Terms</h1>
        <p>
          These terms govern your participation as an independent partner ("Partner") in the 365
          Motor Sales Partner Program ("Program"). By applying and by using any Partner materials,
          you agree to these terms.
        </p>

        <h2>1. Independent contractor status</h2>
        <p>
          Partner is an <strong>independent contractor and independent affiliate</strong> of 365
          Motor Sales. Nothing in this agreement creates an employment, agency, partnership,
          franchise, joint-venture, or representative relationship. Partner is not authorized to
          sign contracts, accept payment, collect personal data, or make binding statements on
          behalf of 365 Motor Sales.
        </p>

        <h2>2. Compensation is commission-only</h2>
        <p>
          Partner is paid only when a qualified referral results in a paid conversion (for example
          a paid seller subscription, paid boost, verified business signup, advertiser or sponsor
          purchase, or shop purchase). There is no wage, hourly rate, daily rate, attendance pay,
          minimum guarantee, quota bonus, or paid shift. Commission rates are shown in the Partner
          dashboard and may change with notice.
        </p>

        <h2>3. No control over daily work</h2>
        <p>
          Partner controls when, where, and how they promote 365 Motor Sales. There are no required
          hours, no required location, no required uniform, no required scripts, no mandatory
          meetings, no mandatory reports, and no exclusive territory. Partner may promote other
          brands and businesses.
        </p>

        <h2>4. Brand-safety rules (what we do restrict)</h2>
        <p>Partner agrees not to:</p>
        <ul>
          <li>Claim to be 365 Motor Sales staff, an agent, employee, or authorized representative.</li>
          <li>Collect cash or payments from customers. All payments flow through official 365 checkout.</li>
          <li>Make guaranteed-income, "passive income", MLM-style, or investment-opportunity claims.</li>
          <li>Recruit a downline — the Program does not pay commissions for recruiting other partners.</li>
          <li>Post false, misleading, spammy, or illegal promotions.</li>
          <li>Handle customer IDs, phone numbers, documents, or payment information on the customer's behalf.</li>
        </ul>

        <h2>5. Optional promotional materials</h2>
        <p>
          365 Motor Sales may provide optional promotional materials such as shirts, stickers, QR
          cards, decals, or digital graphics. These materials are provided only to help identify
          the promotion and do not create employment, agency, franchise, or representative
          authority. Partner is not required to wear or use them.
        </p>

        <h2>6. Required disclosure</h2>
        <p>
          When posting content where Partner may earn a commission, Partner must disclose the
          relationship clearly — for example: "I may earn a commission if you sign up through my
          365 Motor Sales link." Include tags such as
          {" "}<code>#365MotorSalesPartner #Affiliate #PaidPartner #CommissionLink</code> where
          appropriate. This applies to Philippine, U.S., Canadian, and global audiences.
        </p>

        <h2>7. Data privacy</h2>
        <p>
          Every referral flows through a 365 Motor Sales landing page where our privacy notice
          appears. Partner does not collect or store customer personal data. The Partner dashboard
          shows only aggregated metrics and commission line items — no buyer PII. Partner will
          comply with the Philippine Data Privacy Act and all applicable privacy laws.
        </p>

        <h2>8. Marketplace compliance</h2>
        <p>
          Partner agrees to comply with the Philippine Internet Transactions Act and consumer laws:
          clear disclosure of referral relationships, no promotion of prohibited or unsafe goods,
          and prompt removal of misleading promotions after notice.
        </p>

        <h2>9. Refund and chargeback clawback</h2>
        <p>
          Commissions are provisional until the refund/chargeback window closes. If a referred
          purchase is refunded, reversed, or found fraudulent, the related commission is reversed.
        </p>

        <h2>10. Taxes</h2>
        <p>
          Partner is responsible for all taxes on commissions received, including income tax and
          any applicable VAT or business registration. 365 Motor Sales does not withhold taxes for
          independent partners.
        </p>

        <h2>11. Termination</h2>
        <p>
          Either party may terminate participation at any time, with or without cause. 365 Motor
          Sales may immediately suspend or terminate a Partner for violations of these terms,
          fraud, or brand-safety issues. Unpaid, fully cleared commissions earned before
          termination remain payable.
        </p>

        <h2>12. Governing law</h2>
        <p>
          These terms are governed by the laws of the Republic of the Philippines. Disputes will
          be resolved in the courts of the Partner's registered address or Metro Manila.
        </p>

        <h2>13. Changes</h2>
        <p>
          We may update these terms; the "Last updated" date reflects the current version.
          Continued participation after changes means acceptance.
        </p>

        <hr />
        <p className="text-sm">
          Related: <Link to="/terms">Site Terms</Link> · <Link to="/privacy">Privacy Policy</Link>
          {" "}· <Link to="/partner-program">Partner Program overview</Link>
        </p>
      </article>
    </SiteLayout>
  );
}
