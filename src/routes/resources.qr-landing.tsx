import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Printer, QrCode, Share2, Users } from "lucide-react";
import { QrLandingContent } from "@/components/qr-landing-content";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/resources/qr-landing")({
  head: () => ({
    meta: [
      { title: "QR Landing Preview — 365 Promoter Resources" },
      {
        name: "description",
        content:
          "Preview the QR scan landing page exactly as a new visitor sees it. Promoter resources for sharing 365 Motor Sales.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ResourceQrLandingPreview,
});

function ResourceQrLandingPreview() {
  return (
    <div>
      <section className="border-b border-border bg-secondary/40">
        <div className="container mx-auto max-w-7xl px-4 py-8 sm:py-10">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            Promoter resources
          </p>
          <h1 className="font-display mt-2 text-3xl font-bold sm:text-4xl">
            QR Landing Preview
          </h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            This is the exact page someone sees after scanning your 365 QR code. Use it to brief
            new promoters, gather feedback, and improve the message before printing more codes.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/dashboard/referral">
              <Button>
                <QrCode className="mr-2 h-4 w-4" /> My QR &amp; stats
              </Button>
            </Link>
            <Link to="/dashboard/qr-ads">
              <Button variant="outline">
                <Printer className="mr-2 h-4 w-4" /> Print materials
              </Button>
            </Link>
            <Link to="/admin/qr-leads">
              <Button variant="outline">
                <Users className="mr-2 h-4 w-4" /> Leads (admin)
              </Button>
            </Link>
            <Link to="/advertise">
              <Button variant="ghost">
                Advertise with 365 <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              {
                Icon: Share2,
                title: "Where to place it",
                body: "Helmet sticker, shop window, business card back, receipt footer, side of a tow truck.",
              },
              {
                Icon: Users,
                title: "How to introduce it",
                body: "\"Scan this and get my offers + the marketplace built for PH motor — no Facebook scroll.\"",
              },
              {
                Icon: QrCode,
                title: "What gets tracked",
                body: "First scan per device counts toward your stats for 90 days. Repeats don't inflate numbers.",
              },
            ].map(({ Icon, title, body }) => (
              <div
                key={title}
                className="rounded-xl border border-border bg-card p-4"
              >
                <Icon className="h-4 w-4 text-primary" />
                <p className="mt-2 text-sm font-semibold">{title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <QrLandingContent code={null} preview />
    </div>
  );
}
