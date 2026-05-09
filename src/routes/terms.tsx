import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — 365 MotorSales Philippines" },
      { name: "description", content: "Rules for using 365 MotorSales Philippines: who can list, what's prohibited, fees, and dispute handling." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <SiteLayout>
      <article className="container mx-auto max-w-3xl px-4 py-16 prose prose-sm dark:prose-invert">
        <h1 className="font-display text-4xl font-bold">Terms of Service</h1>
        <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}</p>

        <h2 className="mt-8 text-xl font-semibold">1. Who we are</h2>
        <p className="mt-2 text-muted-foreground">365 MotorSales Philippines ("we", "us", "the Platform") operates an online marketplace where private sellers and businesses in the Philippines can list and discover vehicles, parts, and related services.</p>

        <h2 className="mt-6 text-xl font-semibold">2. Eligibility</h2>
        <p className="mt-2 text-muted-foreground">You must be at least 18 years old and a resident or registered business in the Philippines to post listings. By creating an account you confirm that the information you provide is accurate and that you have the legal right to sell the items or services you list.</p>

        <h2 className="mt-6 text-xl font-semibold">3. Your listings</h2>
        <p className="mt-2 text-muted-foreground">You are solely responsible for the accuracy of your listings, including title, photos, condition, ownership, and price. We may remove any listing that violates these Terms or applicable Philippine law.</p>

        <h2 className="mt-6 text-xl font-semibold">4. Prohibited items and conduct</h2>
        <ul className="mt-2 list-disc pl-6 text-muted-foreground">
          <li>Stolen vehicles, parts, or documents (including tampered chassis, OR/CR, or plates).</li>
          <li>Vehicles or equipment without legal title or proper import documentation.</li>
          <li>Weapons, illegal drugs, or any item restricted under Philippine law.</li>
          <li>Misleading photos, fake brands, or counterfeit parts.</li>
          <li>Spam, harassment, scams, or impersonation of other sellers.</li>
          <li>Off-platform contact attempts intended to bypass safety features or fees.</li>
        </ul>

        <h2 className="mt-6 text-xl font-semibold">5. Fees and payments</h2>
        <p className="mt-2 text-muted-foreground">Some features (boosts, business plans, premium placements) require payment. Pricing is shown on our <a className="text-primary underline" href="/pricing">Pricing page</a>. All fees are in Philippine Pesos (₱) and are non-refundable except as described in our Refund Policy.</p>

        <h2 className="mt-6 text-xl font-semibold">6. Buyer–seller transactions</h2>
        <p className="mt-2 text-muted-foreground">365 MotorSales is a venue. We are not a party to any transaction between buyers and sellers. We do not hold funds, transfer titles, or guarantee the condition or legality of any item. Always inspect a vehicle in person, verify documents (OR/CR, deed of sale), and meet in safe locations before paying.</p>

        <h2 className="mt-6 text-xl font-semibold">7. Account suspension</h2>
        <p className="mt-2 text-muted-foreground">We may suspend or terminate accounts that violate these Terms, attempt fraud, or receive multiple verified reports. Boost or subscription fees on suspended accounts are forfeited.</p>

        <h2 className="mt-6 text-xl font-semibold">8. Limitation of liability</h2>
        <p className="mt-2 text-muted-foreground">To the maximum extent permitted by law, 365 MotorSales Philippines is not liable for losses arising from buyer–seller disputes, product defects, or third-party services such as towing or repair. Our total liability for any claim is limited to the fees you paid us in the 30 days preceding the claim.</p>

        <h2 className="mt-6 text-xl font-semibold">9. Governing law</h2>
        <p className="mt-2 text-muted-foreground">These Terms are governed by the laws of the Republic of the Philippines. Disputes shall be resolved in the courts of Metro Manila.</p>

        <h2 className="mt-6 text-xl font-semibold">10. Changes</h2>
        <p className="mt-2 text-muted-foreground">We may update these Terms from time to time. Continued use of the Platform after changes are posted means you accept the updated Terms.</p>

        <p className="mt-8 text-sm text-muted-foreground">Questions? Email <a className="text-primary underline" href="mailto:legal@365motorsales.ph">legal@365motorsales.ph</a>.</p>
      </article>
    </SiteLayout>
  );
}
