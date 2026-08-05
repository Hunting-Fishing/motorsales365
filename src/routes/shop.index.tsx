import { createFileRoute, Link } from "@tanstack/react-router";
import { Shirt, Package, Wrench, ArrowRight } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/shop/")({
  head: () => ({
    meta: [
      { title: "365 Store — Official 365 MotorSales merch & gear" },
      {
        name: "description",
        content:
          "Official 365 MotorSales gear: sun shades, poker chips, shirts, stickers and garage accessories. Shipped from the Philippines.",
      },
      { property: "og:title", content: "365 Store — Official merch & gear" },
      {
        property: "og:description",
        content: "Sun shades, poker chips, shirts and garage gear from 365 MotorSales.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://www.365motorsales.com/shop" }],
  }),
  component: StorePage,
});

function StorePage() {
  return (
    <SiteLayout>
      <section className="border-b bg-gradient-to-b from-primary/10 to-background">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <Badge className="mb-3">365 Store</Badge>
          <h1 className="font-display text-3xl tracking-tight sm:text-4xl md:text-5xl">
            Official 365 gear
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Our own merch — sun shades, poker chips, shirts, stickers and garage accessories.
            Designed by us, shipped by us. Checkout is coming online shortly.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link to="/parts">
                Looking for parts? <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="container mx-auto grid gap-4 px-4 py-10 sm:grid-cols-3">
        {[
          { icon: Shirt, title: "Apparel", desc: "Tees, caps and crew gear with the 365 mark." },
          {
            icon: Package,
            title: "Garage goods",
            desc: "Sun shades, poker chips, plates, stickers and desk pieces.",
          },
          {
            icon: Wrench,
            title: "Tools & care",
            desc: "365-branded detailing kits and workshop essentials.",
          },
        ].map((c) => (
          <Card key={c.title}>
            <CardContent className="p-5">
              <c.icon className="h-5 w-5 text-primary" />
              <p className="mt-3 font-semibold">{c.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="container mx-auto px-4 pb-14">
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm font-semibold">Third-party parts and accessories moved</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Marketplace and affiliate listings now live under{" "}
            <Link to="/parts/partners" className="text-primary underline">
              Parts → Partner links
            </Link>
            . The 365 Store only carries products we make ourselves.
          </p>
        </div>
      </div>
    </SiteLayout>
  );
}
