import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Camera,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Sparkles,
  Building2,
  UserRound,
  Upload,
  MessagesSquare,
  Zap,
} from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/start-selling")({
  head: () => ({
    meta: [
      { title: "Start selling on 365 MotorSales — How it works" },
      {
        name: "description",
        content:
          "Sell your car, motorcycle, boat or equipment in the Philippines. Free listings, photo tips, OR/CR checklist, dealer plans, and scam prevention — everything you need before you post.",
      },
      { property: "og:title", content: "Start selling on 365 MotorSales" },
      {
        property: "og:description",
        content:
          "Step-by-step seller guide for the Philippines — free plan, photo tips, OR/CR checklist, dealer benefits.",
      },
    ],
  }),
  component: StartSellingPage,
});

function StartSellingPage() {
  return (
    <SiteLayout>
      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 py-14 md:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-4">For sellers in the Philippines</Badge>
            <h1 className="font-display text-3xl font-bold tracking-tight md:text-5xl">
              Sell your vehicle on 365 MotorSales
            </h1>
            <p className="mt-4 text-base text-muted-foreground md:text-lg">
              Reach Filipino buyers nationwide. Free to start, simple to post, and built around the
              OR/CR realities of selling in the Philippines.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg">
                <Link to="/sell">Post a listing</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/pricing">See pricing</Link>
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              No credit card needed for the free plan.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container mx-auto px-4 py-14">
        <h2 className="font-display text-2xl font-semibold md:text-3xl">How it works</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {[
            { icon: UserRound, title: "1. Create an account", body: "Sign up free with email. Verify your phone to build buyer trust." },
            { icon: Camera, title: "2. Add photos & details", body: "Up to 12 photos and 1 video on the free plan. Add OR/CR status and location." },
            { icon: MessagesSquare, title: "3. Receive messages", body: "Buyers contact you directly. Reply fast to rank higher in search." },
            { icon: CheckCircle2, title: "4. Close the deal safely", body: "Meet in public, verify documents, and mark your listing sold." },
          ].map((s) => (
            <Card key={s.title} className="p-5">
              <s.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-3 font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* What you need */}
      <section className="border-y border-border bg-muted/30">
        <div className="container mx-auto px-4 py-14">
          <h2 className="font-display text-2xl font-semibold md:text-3xl">What you need before you post</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Card className="p-6">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Vehicle documents (PH)</h3>
              </div>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>• Original Receipt (OR) and Certificate of Registration (CR)</li>
                <li>• Registered owner name matches the seller (or a notarized Deed of Sale chain)</li>
                <li>• Chassis, engine and plate numbers match the CR</li>
                <li>• Latest LTO registration / no alarm or encumbrance</li>
                <li>• Valid government ID of the seller</li>
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">
                Don't have OR/CR yet? You can still list, but mark the status honestly — buyers
                expect it.
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Photo & video tips</h3>
              </div>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>• Daylight, clean vehicle, neutral background</li>
                <li>• Front 3/4, rear 3/4, both sides, dashboard, odometer, engine bay</li>
                <li>• Interior front + back seats, tires, any damage (honesty sells)</li>
                <li>• 30–60 second walkaround video gets ~2× more replies</li>
                <li>• Avoid stock photos — buyers downrank listings that look fake</li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* Plan comparison */}
      <section className="container mx-auto px-4 py-14">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-2xl font-semibold md:text-3xl">Plans at a glance</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/pricing">Full pricing →</Link>
          </Button>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Card className="p-6">
            <Badge variant="outline">Free</Badge>
            <h3 className="mt-2 font-display text-xl font-semibold">Private Seller</h3>
            <p className="text-sm text-muted-foreground">For one-off sales.</p>
            <ul className="mt-4 space-y-1.5 text-sm">
              <li>• 5 active listings</li>
              <li>• 12 photos + 1 video each</li>
              <li>• 60-day listing duration</li>
              <li>• Direct buyer messaging</li>
            </ul>
          </Card>
          <Card className="border-primary/40 p-6">
            <Badge>Popular</Badge>
            <h3 className="mt-2 font-display text-xl font-semibold">Verified Seller</h3>
            <p className="text-sm text-muted-foreground">For frequent sellers.</p>
            <ul className="mt-4 space-y-1.5 text-sm">
              <li>• More active listings</li>
              <li>• 20 photos + video</li>
              <li>• Verified badge on every listing</li>
              <li>• Priority buyer trust</li>
            </ul>
          </Card>
          <Card className="p-6">
            <Badge variant="outline">Dealer</Badge>
            <h3 className="mt-2 font-display text-xl font-semibold">Dealer Starter / Pro</h3>
            <p className="text-sm text-muted-foreground">For shops & dealerships.</p>
            <ul className="mt-4 space-y-1.5 text-sm">
              <li>• 25 to unlimited listings</li>
              <li>• Bulk upload & sales rep tracking</li>
              <li>• Dealer profile & inventory page</li>
              <li>• Featured / boost placements</li>
            </ul>
          </Card>
        </div>
      </section>

      {/* Tips to sell faster */}
      <section className="border-y border-border bg-muted/30">
        <div className="container mx-auto px-4 py-14">
          <h2 className="font-display text-2xl font-semibold md:text-3xl">Tips to sell faster</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              { icon: Zap, title: "Reply within an hour", body: "Fast responders close 3× more deals. We highlight fast-responder sellers." },
              { icon: Sparkles, title: "Write a clear title", body: "Year + Make + Model + Variant + Location. E.g. \"2018 Toyota Vios E 1.3 MT — Quezon City\"." },
              { icon: Upload, title: "Be honest about condition", body: "Disclose flood/accident history. Buyers reward transparency with offers." },
            ].map((t) => (
              <Card key={t.title} className="p-5">
                <t.icon className="h-6 w-6 text-primary" />
                <h3 className="mt-3 font-semibold">{t.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Scam prevention */}
      <section className="container mx-auto px-4 py-14">
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-amber-500/30 bg-amber-500/5 p-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <h3 className="font-semibold">Scam prevention for sellers</h3>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>• Never ship a vehicle before full payment is cleared in your account.</li>
              <li>• Don't accept "overpayment + refund the difference" — it's always a scam.</li>
              <li>• Meet in a public, well-lit place. Bring a friend for high-value units.</li>
              <li>• Verify the buyer's payment manually — wait for actual bank confirmation, not just a screenshot.</li>
              <li>• Don't hand over the OR/CR until the Deed of Sale is signed and payment is received.</li>
            </ul>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link to="/guidelines">Read full safety guide</Link>
            </Button>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">365 Verified seller program</h3>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Verified sellers get a trust badge, higher placement in search, and convert more
              buyers. Verify your phone, government ID, and (for shops) DTI/SEC documents.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link to="/dashboard/verification">Start verification</Link>
            </Button>
          </Card>
        </div>
      </section>

      {/* Dealers */}
      <section className="border-t border-border bg-muted/30">
        <div className="container mx-auto px-4 py-14">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div>
              <Badge variant="secondary">For dealers & shops</Badge>
              <h2 className="mt-3 font-display text-2xl font-semibold md:text-3xl">
                Built for Philippine dealerships
              </h2>
              <p className="mt-3 text-sm text-muted-foreground md:text-base">
                Manage your whole inventory in one place. Invite your sales reps, track who closed
                each lead, and showcase your dealership on a public profile page.
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                <li className="flex gap-2"><Building2 className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Dealer profile + inventory page</li>
                <li className="flex gap-2"><Upload className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Bulk upload from spreadsheet</li>
                <li className="flex gap-2"><UserRound className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Sales rep accounts & lead tracking</li>
                <li className="flex gap-2"><Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Featured & boosted placements</li>
              </ul>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button asChild>
                  <Link to="/pricing">Compare dealer plans</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/contact">Talk to our team</Link>
                </Button>
              </div>
            </div>
            <Card className="p-6">
              <h3 className="font-semibold">What a complete listing looks like</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>• Year, Make, Model, Variant, Color</li>
                <li>• Mileage, Transmission, Fuel, Engine</li>
                <li>• OR/CR status, plate ending, registered owner status</li>
                <li>• Location (region / province / city)</li>
                <li>• Honest disclosure: flood, accident, repaint, financing</li>
                <li>• 6–12 photos + walkaround video</li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="container mx-auto px-4 py-14">
        <Card className="bg-gradient-to-br from-primary/10 to-transparent p-8 text-center md:p-12">
          <h2 className="font-display text-2xl font-semibold md:text-3xl">
            Ready to post your first listing?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground md:text-base">
            It takes about 5 minutes. You can save as a draft anytime.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/sell">Post a listing</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/support_/selling">Selling FAQ</Link>
            </Button>
          </div>
        </Card>
      </section>
    </SiteLayout>
  );
}
