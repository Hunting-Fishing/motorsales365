import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Handshake,
  Megaphone,
  PackageCheck,
  Users,
  LayoutDashboard,
  ExternalLink,
  CreditCard,
} from "lucide-react";
import { getStripeEnvironment } from "@/lib/stripe";
import {
  getMyApplication,
  listActiveTiers,
  createFranchisePortalSession,
} from "@/lib/franchise.functions";


export const Route = createFileRoute("/_authenticated/franchise/dashboard")({
  head: () => ({
    meta: [
      { title: "Partner Dashboard — 365 MotorSales" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const getMy = useServerFn(getMyApplication);
  const getTiers = useServerFn(listActiveTiers);
  const my = useQuery({ queryKey: ["franchise", "my-app"], queryFn: () => getMy() });
  const tiers = useQuery({
    queryKey: ["franchise", "tiers", "active"],
    queryFn: () => getTiers(),
  });

  const membership = my.data?.membership;
  const tier = tiers.data?.find((t) => t.slug === membership?.tier_slug);

  if (my.isLoading) {
    return (
      <SiteLayout>
        <div className="container mx-auto max-w-4xl px-4 py-12 text-sm text-muted-foreground">
          Loading…
        </div>
      </SiteLayout>
    );
  }

  if (!membership) {
    return (
      <SiteLayout>
        <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
          <h1 className="font-display text-2xl font-bold">Not a partner yet</h1>
          <p className="mt-2 text-muted-foreground">
            Your 365 Franchise or Partner membership isn't active. Check your application status or
            apply to join.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild>
              <Link to="/franchise/status">Application status</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/franchise">Learn more</Link>
            </Button>
          </div>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <section className="container mx-auto max-w-5xl px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link to="/franchise" className="text-sm text-muted-foreground hover:text-foreground">
              ← 365 Franchise & Partner Program
            </Link>
            <h1 className="mt-2 font-display text-3xl font-bold">
              {tier?.name ?? "365 Partner"} dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Member number <strong>{membership.member_number}</strong> · Active since{" "}
              {new Date(membership.started_at).toLocaleDateString()}
            </p>
          </div>
          <Badge variant="default" className="text-sm">
            <Handshake className="mr-1 h-3 w-3" /> Active
          </Badge>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="p-5">
            <PackageCheck className="mb-2 h-6 w-6 text-primary" />
            <h3 className="font-semibold">Parts network discount</h3>
            <p className="mt-1 text-3xl font-bold">
              {tier ? `${(tier.parts_discount_bps / 100).toFixed(0)}%` : "—"}
            </p>
            <p className="text-sm text-muted-foreground">On parts sourced via 365.</p>
            <Button asChild size="sm" variant="outline" className="mt-3">
              <Link to="/parts">Browse parts</Link>
            </Button>
          </Card>

          <Card className="p-5">
            <Megaphone className="mb-2 h-6 w-6 text-primary" />
            <h3 className="font-semibold">Advertising discount</h3>
            <p className="mt-1 text-3xl font-bold">
              {tier ? `${(tier.ad_discount_bps / 100).toFixed(0)}%` : "—"}
            </p>
            {membership.ad_discount_code ? (
              <p className="text-sm">
                Code:{" "}
                <code className="rounded bg-secondary px-2 py-1">{membership.ad_discount_code}</code>
              </p>
            ) : null}
            <Button asChild size="sm" variant="outline" className="mt-3">
              <a href="/advertise">Advertise</a>
            </Button>
          </Card>

          <Card className="p-5">
            <Users className="mb-2 h-6 w-6 text-primary" />
            <h3 className="font-semibold">Shared customer CRM</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              View customer service history across the network (with consent).
            </p>
            <Badge variant="secondary" className="mt-3">
              Coming soon
            </Badge>
          </Card>

          <Card className="p-5">
            <LayoutDashboard className="mb-2 h-6 w-6 text-primary" />
            <h3 className="font-semibold">Shop Manager</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Bookings, inventory, staff — bundled with your membership.
            </p>
            <Button asChild size="sm" className="mt-3">
              <Link to="/shop-manager">
                Open <ExternalLink className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </Card>

          <Card className="p-5">
            <PackageCheck className="mb-2 h-6 w-6 text-primary" />
            <h3 className="font-semibold">Network stock visibility</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              See what other partner shops have in stock near you.
            </p>
            <Badge variant="secondary" className="mt-3">
              Coming soon
            </Badge>
          </Card>

          <Card className="p-5">
            <Handshake className="mb-2 h-6 w-6 text-primary" />
            <h3 className="font-semibold">Marketing kit</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Verified Partner badge, in-store decals, social templates.
            </p>
            <Button asChild size="sm" variant="outline" className="mt-3">
              <Link to="/contact">Request kit</Link>
            </Button>
          </Card>
        </div>
      </section>
    </SiteLayout>
  );
}
