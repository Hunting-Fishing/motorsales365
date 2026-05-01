import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { formatPHP } from "@/lib/format";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing & plans — AutoTrader Philippines" },
      { name: "description", content: "Listing fees, upgrades, boosts, and monthly subscriptions for sellers in the Philippines." },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  const [settings, setSettings] = useState<Record<string, number>>({});
  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("pricing_settings").select("key,value").then(({ data }) => {
      const m: Record<string, number> = {};
      (data ?? []).forEach((r: any) => { m[r.key] = Number(r.value); });
      setSettings(m);
    });
    supabase.from("subscription_plans").select("*").eq("active", true).order("sort_order")
      .then(({ data }) => setPlans(data ?? []));
  }, []);

  return (
    <SiteLayout>
      <section className="bg-secondary/40 py-12">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-display text-4xl font-bold">Simple pricing</h1>
          <p className="mt-2 text-muted-foreground">Pay per listing, or subscribe monthly. All prices in ₱ PHP.</p>
        </div>
      </section>

      <section className="container mx-auto grid gap-4 px-4 py-12 sm:grid-cols-3">
        {[
          { t: "Standard listing", p: settings.listing_fee_php ?? 20, d: "5 photos, 1 video. Stays live for 60 days." },
          { t: "Upgraded listing", p: (settings.listing_fee_php ?? 20) + (settings.upgrade_fee_php ?? 100), d: "20 photos, 3 videos. Stand out from the crowd." },
          { t: "Boost", p: settings.boost_fee_php ?? 150, d: `Pin to top of search and renew the ad every ${settings.boost_renewal_days ?? 14} days.` },
        ].map((c) => (
          <div key={c.t} className="rounded-xl border border-border bg-card p-6">
            <div className="text-sm font-semibold text-muted-foreground">{c.t}</div>
            <div className="mt-2 font-display text-3xl font-bold text-primary">{formatPHP(c.p)}</div>
            <p className="mt-2 text-sm text-muted-foreground">{c.d}</p>
          </div>
        ))}
      </section>

      <section className="container mx-auto px-4 pb-16">
        <h2 className="mb-6 text-center font-display text-2xl font-bold">Business subscriptions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((p) => (
            <div key={p.id} className="flex flex-col rounded-xl border border-border bg-card p-6">
              <div className="font-display text-lg font-semibold">{p.name}</div>
              <div className="mt-2 font-display text-3xl font-bold">{formatPHP(p.price_php)}<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
              <div className="mt-1 text-sm text-muted-foreground">
                {p.listings_per_month ?? "Unlimited"} listings/month
              </div>
              <ul className="mt-4 space-y-2 text-sm">
                {(p.features ?? []).map((f: string) => (
                  <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-primary" />{f}</li>
                ))}
              </ul>
              <Button asChild className="mt-6"><Link to="/signup">Get started</Link></Button>
            </div>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
