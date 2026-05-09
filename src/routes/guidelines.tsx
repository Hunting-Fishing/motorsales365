import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";

export const Route = createFileRoute("/guidelines")({
  head: () => ({
    meta: [
      { title: "Community Guidelines — 365 MotorSales Philippines" },
      { name: "description", content: "What's allowed, what's not, and how to stay safe when buying or selling on 365 MotorSales Philippines." },
    ],
  }),
  component: GuidelinesPage,
});

function GuidelinesPage() {
  return (
    <SiteLayout>
      <article className="container mx-auto max-w-3xl px-4 py-16 prose prose-sm dark:prose-invert">
        <h1 className="font-display text-4xl font-bold">Community Guidelines</h1>
        <p className="mt-4 text-muted-foreground">These rules keep the marketplace safe for everyone. Breaking them can result in listing removal, account suspension, or referral to authorities.</p>

        <h2 className="mt-8 text-xl font-semibold">For sellers</h2>
        <ul className="mt-2 list-disc pl-6 text-muted-foreground">
          <li>List only items you legally own and can transfer.</li>
          <li>Use your own clear photos. No watermarked or stolen images.</li>
          <li>Be honest about condition, mileage, accidents, and missing parts.</li>
          <li>Keep prices in PHP. No bait-and-switch pricing.</li>
          <li>Respond to buyer messages within a reasonable time.</li>
          <li>Mark listings as "Sold" when the deal closes.</li>
        </ul>

        <h2 className="mt-6 text-xl font-semibold">For buyers</h2>
        <ul className="mt-2 list-disc pl-6 text-muted-foreground">
          <li>Always inspect the vehicle in person before paying.</li>
          <li>Verify the OR/CR, chassis number, and engine number match.</li>
          <li>Meet in a public, well-lit place. Bring a friend.</li>
          <li>Use traceable payments (bank transfer, GCash, Maya). Avoid cash for large amounts.</li>
          <li>Never pay a "reservation fee" before seeing the vehicle.</li>
          <li>Report suspicious listings using the flag icon.</li>
        </ul>

        <h2 className="mt-6 text-xl font-semibold">Prohibited</h2>
        <ul className="mt-2 list-disc pl-6 text-muted-foreground">
          <li>Stolen vehicles, parts, or documents.</li>
          <li>Vehicles without legal title or proper import papers.</li>
          <li>Counterfeit branded parts.</li>
          <li>Weapons, drugs, or any item restricted by Philippine law.</li>
          <li>Spam, scams, phishing, or off-platform payment requests.</li>
        </ul>

        <h2 className="mt-6 text-xl font-semibold">Reporting</h2>
        <p className="mt-2 text-muted-foreground">Use the <strong>Report</strong> button on any listing or seller profile. Our team reviews reports within 48 hours. Urgent safety issues can be emailed to <a className="text-primary underline" href="mailto:safety@365motorsales.ph">safety@365motorsales.ph</a>.</p>
      </article>
    </SiteLayout>
  );
}
