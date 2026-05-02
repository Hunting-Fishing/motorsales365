import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — 365 MotorSales Philippines" },
      { name: "description", content: "365 MotorSales Philippines is the trusted marketplace for vehicles, equipment, and transport across the country." },
    ],
  }),
  component: () => (
    <SiteLayout>
      <div className="container mx-auto max-w-3xl px-4 py-16">
        <h1 className="font-display text-4xl font-bold">About 365 MotorSales Philippines</h1>
        <p className="mt-4 text-muted-foreground">
          We're building the standard marketplace for buying and selling cars, motorcycles, boats, airplanes, and heavy equipment across the Philippines —
          serving private sellers and businesses alike with a clean, modern experience.
        </p>
        <p className="mt-4 text-muted-foreground">
          Coming soon: a directory of trusted repair shops and insurance providers across the country, so you can find help wherever you are.
        </p>
        <Button asChild className="mt-6"><Link to="/sell">Post a listing</Link></Button>
      </div>
    </SiteLayout>
  ),
});
