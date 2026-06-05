import { createFileRoute } from "@tanstack/react-router";
import { SupportStep, SupportSteps } from "@/components/support/support-step";
import { SupportArticleLayout } from "@/components/support/support-article-layout";

const TITLE = "Account & verification";
const DESC =
  "Sign up, sign in, reset your password, and earn the Verified badge on 365 MotorSales.";

export const Route = createFileRoute("/support_/account")({
  component: AccountSupport,
  head: () => ({
    meta: [
      { title: `${TITLE} — Help & Support | 365 MotorSales` },
      { name: "description", content: DESC },
      { property: "og:title", content: `${TITLE} — 365 MotorSales Help` },
      { property: "og:description", content: DESC },
      { property: "og:url", content: "https://www.365motorsales.com/support/account" },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: "https://www.365motorsales.com/support/account" }],
  }),
});

function AccountSupport() {
  return (
    <SupportArticleLayout title={TITLE} description={DESC}>
      <section className="space-y-10">
        <div>
          <h2 className="text-xl font-semibold sm:text-2xl">Sign up or log in</h2>
          <SupportSteps>
            <SupportStep n={1} title="Click Account → Sign up">
              Top-right of the header. Use email + password or continue with Google.
            </SupportStep>
            <SupportStep n={2} title="Verify your email">
              We send a confirmation link. Click it to activate your account.
            </SupportStep>
            <SupportStep n={3} title="Forgot password?">
              On the Login page click <strong>Forgot password</strong> — we email a secure reset
              link valid for 1 hour.
            </SupportStep>
            <SupportStep n={4} title="Change your email">
              Dashboard → Profile lets you update your email address (you'll need to confirm the new
              one).
            </SupportStep>
          </SupportSteps>
        </div>

        <div>
          <h2 className="text-xl font-semibold sm:text-2xl">Get the Verified badge</h2>
          <SupportSteps>
            <SupportStep n={1} title="Open Dashboard → Verification">
              You'll see the checklist of what we need.
            </SupportStep>
            <SupportStep n={2} title="Upload a valid government ID">
              Driver's license, passport, UMID or PhilSys ID. Make sure all corners are visible and
              text is readable.
            </SupportStep>
            <SupportStep n={3} title="Take a selfie">
              A short selfie helps us confirm the ID belongs to you. We never publish this image.
            </SupportStep>
            <SupportStep n={4} title="Wait 24–48 hours">
              Our team reviews and applies the blue Verified badge. You'll get an email when it's
              live.
            </SupportStep>
          </SupportSteps>
        </div>

        <div>
          <h2 className="text-xl font-semibold sm:text-2xl">Privacy & data</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            We are DPA-compliant. Your contact details are only shared when you initiate a message.
            From Dashboard → Profile you can request a full export of your data, or delete your
            account at any time. Verification documents are stored encrypted and never displayed
            publicly.
          </p>
        </div>
      </section>
    </SupportArticleLayout>
  );
}
