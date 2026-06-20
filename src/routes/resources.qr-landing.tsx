import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, QrCode, Share2, Users } from "lucide-react";
import { QrLandingContent } from "@/components/qr-landing-content";
import { Button } from "@/components/ui/button";
import bannerAsset from "@/assets/qr-landing-uploaded/find-vehicles-parts-services-faster.png.asset.json";

export const Route = createFileRoute("/resources/qr-landing")({
  head: () => ({
    meta: [
      { title: "365 Motor Sales — Buy, Sell & Grow in the PH Motor World" },
      {
        name: "description",
        content:
          "Scanned a 365 QR? Welcome. Browse verified vehicles, parts and motor services across the Philippines — list free, boost fairly, sell faster.",
      },
    ],
  }),
  component: ResourceQrLandingPreview,
});

function ResourceQrLandingPreview() {
  return (
    <div>
      <section className="border-b border-border bg-secondary/40">
        <div className="container mx-auto max-w-7xl px-4 py-8 sm:py-10">
          <img
            src={bannerAsset.url}
            alt="365 Motor Sales — find vehicles, parts and services faster"
            className="w-full max-h-48 sm:max-h-64 object-cover rounded-xl border border-border"
            loading="eager"
          />
          <p className="mt-6 max-w-3xl text-muted-foreground">
            This is the exact page someone sees after scanning your 365 QR code. Use it to brief
            new promoters, gather feedback, and improve the message before printing more codes.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/advertise">
              <Button>
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
