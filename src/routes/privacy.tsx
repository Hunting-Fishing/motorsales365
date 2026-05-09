import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — 365 MotorSales Philippines" },
      { name: "description", content: "How 365 MotorSales Philippines collects, uses, and protects your personal data under the Data Privacy Act (RA 10173)." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <SiteLayout>
      <article className="container mx-auto max-w-3xl px-4 py-16 prose prose-sm dark:prose-invert">
        <h1 className="font-display text-4xl font-bold">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}</p>

        <p className="mt-4 text-muted-foreground">365 MotorSales Philippines ("we", "us") respects your privacy and complies with the Philippines' <strong>Data Privacy Act of 2012 (RA 10173)</strong> and its Implementing Rules and Regulations.</p>

        <h2 className="mt-8 text-xl font-semibold">1. Information we collect</h2>
        <ul className="mt-2 list-disc pl-6 text-muted-foreground">
          <li><strong>Account data:</strong> name, email, phone number, password (hashed).</li>
          <li><strong>Profile data:</strong> avatar, business name, location, optional government ID for verification.</li>
          <li><strong>Listing data:</strong> photos, descriptions, prices, vehicle details, contact preferences.</li>
          <li><strong>Usage data:</strong> pages viewed, searches, device type, IP address, approximate location.</li>
          <li><strong>Communications:</strong> messages between buyers and sellers sent through the Platform.</li>
        </ul>

        <h2 className="mt-6 text-xl font-semibold">2. How we use your data</h2>
        <ul className="mt-2 list-disc pl-6 text-muted-foreground">
          <li>To operate the marketplace and display your listings to other users.</li>
          <li>To verify your identity and reduce fraud.</li>
          <li>To send transactional emails (account, listing status, messages).</li>
          <li>To improve search, rankings, and personalization.</li>
          <li>To comply with legal obligations and respond to lawful requests from authorities.</li>
        </ul>

        <h2 className="mt-6 text-xl font-semibold">3. Sharing</h2>
        <p className="mt-2 text-muted-foreground">We share data with infrastructure providers (cloud hosting, email, analytics) bound by confidentiality. We do not sell your personal data. We may disclose data when required by Philippine law or court order.</p>

        <h2 className="mt-6 text-xl font-semibold">4. Cookies</h2>
        <p className="mt-2 text-muted-foreground">We use essential cookies for login and session management, and optional cookies for analytics. You can decline non-essential cookies via the banner shown on first visit.</p>

        <h2 className="mt-6 text-xl font-semibold">5. Your rights under RA 10173</h2>
        <ul className="mt-2 list-disc pl-6 text-muted-foreground">
          <li>Right to be informed about how your data is processed.</li>
          <li>Right to access, correct, or update your data.</li>
          <li>Right to object to or withdraw consent for certain processing.</li>
          <li>Right to data portability.</li>
          <li>Right to erasure or blocking, subject to legal retention.</li>
          <li>Right to file a complaint with the National Privacy Commission (NPC).</li>
        </ul>

        <h2 className="mt-6 text-xl font-semibold">6. Retention</h2>
        <p className="mt-2 text-muted-foreground">We keep account data while your account is active. After deletion, we retain limited data (transaction records, dispute history) for up to 5 years to comply with tax and legal requirements.</p>

        <h2 className="mt-6 text-xl font-semibold">7. Security</h2>
        <p className="mt-2 text-muted-foreground">We protect your data with HTTPS, encrypted storage, role-based access control, and routine security reviews. No system is 100% secure; please use a strong, unique password.</p>

        <h2 className="mt-6 text-xl font-semibold">8. Data Protection Officer</h2>
        <p className="mt-2 text-muted-foreground">For privacy questions or to exercise your rights, contact our Data Protection Officer at <a className="text-primary underline" href="mailto:dpo@365motorsales.ph">dpo@365motorsales.ph</a>.</p>

        <h2 className="mt-6 text-xl font-semibold">9. Changes</h2>
        <p className="mt-2 text-muted-foreground">We will post any updates to this policy on this page and notify users by email of material changes.</p>
      </article>
    </SiteLayout>
  );
}
