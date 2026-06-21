import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, Phone, MapPin, MessageSquare } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — 365 MotorSales Philippines" },
      {
        name: "description",
        content: "Reach the 365 MotorSales Philippines support, sales, and partnerships team.",
      },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <SiteLayout>
      <div className="container mx-auto max-w-4xl px-4 py-16">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Get in touch</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          We're based in the Philippines and reply in English or Tagalog. For listing-specific
          questions, please message the seller directly from the listing page.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <Card
            icon={<Mail className="h-5 w-5" />}
            title="General support"
            body="hello@365motorsales.com"
            href="mailto:hello@365motorsales.com"
          />
          <Card
            icon={<MessageSquare className="h-5 w-5" />}
            title="Trust & safety"
            body="safety@365motorsales.com"
            href="mailto:safety@365motorsales.com"
          />
          <Card
            icon={<Mail className="h-5 w-5" />}
            title="Billing & refunds"
            body="billing@365motorsales.com"
            href="mailto:billing@365motorsales.com"
          />
          <Card
            icon={<Mail className="h-5 w-5" />}
            title="Partnerships & ads"
            body="partners@365motorsales.com"
            href="mailto:partners@365motorsales.com"
          />
          <Card
            icon={<Phone className="h-5 w-5" />}
            title="Phone (Mon–Sat, 9am–6pm)"
            body="09696063830"
            href="tel:09696063830"
          />
          <Card
            icon={<MapPin className="h-5 w-5" />}
            title="Office"
            body="Metro Manila, Philippines"
          />
        </div>

        <div className="mt-10 rounded-xl border border-border bg-secondary/40 p-5 text-sm text-muted-foreground">
          <p>
            For privacy or data requests, contact our Data Protection Officer at{" "}
            <a className="text-primary underline" href="mailto:dpo@365motorsales.com">
              dpo@365motorsales.com
            </a>
            . See our{" "}
            <Link to="/privacy" className="underline hover:text-foreground">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </SiteLayout>
  );
}

function Card({
  icon,
  title,
  body,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  href?: string;
}) {
  const inner = (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 truncate text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  );
  return href ? (
    <a href={href} className="block">
      {inner}
    </a>
  ) : (
    inner
  );
}
