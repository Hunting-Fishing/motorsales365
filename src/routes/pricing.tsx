import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { formatPHP } from "@/lib/format";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing & plans — 365 MotorSales Philippines" },
      { name: "description", content: "Listing fees, upgrades, boosts, and monthly subscriptions for sellers in the Philippines." },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<Record<string, number>>({});
  const [plans, setPlans] = useState<any[]>([]);
  const [mySub, setMySub] = useState<any | null>(null);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [discounts, setDiscounts] = useState<Record<string, any>>({});

  const loadSub = async (uid: string) => {
    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setMySub(data ?? null);
  };

  useEffect(() => {
    supabase.from("pricing_settings").select("key,value").then(({ data }) => {
      const m: Record<string, number> = {};
      (data ?? []).forEach((r: any) => { m[r.key] = Number(r.value); });
      setSettings(m);
    });
    supabase.from("subscription_plans").select("*").eq("active", true).order("sort_order")
      .then(({ data }) => setPlans(data ?? []));
    if (user?.id) loadSub(user.id);
  }, [user?.id]);

  // Preview discounts per plan once we have plans + a signed-in user
  useEffect(() => {
    if (!user?.id || plans.length === 0) return;
    (async () => {
      const out: Record<string, any> = {};
      await Promise.all(plans.map(async (p) => {
        const { data } = await (supabase as any).rpc("preview_referral_discount", {
          _kind: "subscription",
          _base_amount: Number(p.price_php) || 0,
        });
        if (data?.ok) out[p.id] = data;
      }));
      setDiscounts(out);
    })();
  }, [user?.id, plans]);

  const requestPlan = async (planId: string) => {
    if (!user) {
      navigate({ to: "/signup" });
      return;
    }
    if (mySub && ["pending", "active", "paused"].includes(mySub.status)) {
      toast.info("You already have a subscription on file. Visit Billing to view it.");
      return;
    }
    setRequesting(planId);
    const plan = plans.find((p) => p.id === planId);
    const base = Number(plan?.price_php) || 0;
    const { data: sub, error } = await supabase.from("subscriptions").insert({
      user_id: user.id,
      plan_id: planId,
      status: "pending",
    }).select("id").maybeSingle();
    if (error) { setRequesting(null); return toast.error(error.message); }

    // Record referral redemption if eligible
    const { data: redemption } = await (supabase as any).rpc("apply_referral_redemption", {
      _kind: "subscription",
      _base_amount: base,
      _subscription_id: sub?.id ?? null,
    });
    setRequesting(null);
    if (redemption?.ok) {
      toast.success(
        `Referral discount applied — ₱${redemption.discount_amount_php} off. Final: ₱${redemption.final_amount_php}.`
      );
    } else {
      toast.success("Subscription requested — our team will reach out shortly.");
    }
    loadSub(user.id);
  };

  return (
    <SiteLayout>
      <section className="bg-secondary/40 py-12">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-display text-4xl font-bold">Simple pricing</h1>
          <p className="mt-2 text-muted-foreground">Pay per listing, or subscribe monthly. All prices in ₱ PHP.</p>
        </div>
      </section>

      <section className="container mx-auto grid gap-4 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { t: "Free listing", p: 0, d: "1 photo, no video. 1 free listing per week." },
          { t: "Standard listing", p: settings.listing_fee_php ?? 20, d: "5 photos, 1 video. Stays live for 60 days." },
          { t: "Upgraded listing", p: (settings.listing_fee_php ?? 20) + (settings.upgrade_fee_php ?? 100), d: "20 photos, 3 videos. Stand out from the crowd." },
          { t: "Boost", p: settings.boost_fee_php ?? 150, d: `Pin to top of search and renew the ad every ${settings.boost_renewal_days ?? 14} days.` },
        ].map((c) => (
          <div key={c.t} className="rounded-xl border border-border bg-card p-6">
            <div className="text-sm font-semibold text-muted-foreground">{c.t}</div>
            <div className="mt-2 font-display text-3xl font-bold text-primary">{c.p === 0 ? "Free" : formatPHP(c.p)}</div>
            <p className="mt-2 text-sm text-muted-foreground">{c.d}</p>
          </div>
        ))}
      </section>

      <section className="container mx-auto px-4 pb-16">
        <h2 className="mb-2 text-center font-display text-2xl font-bold">Business subscriptions</h2>
        {mySub && (
          <p className="mb-6 text-center text-sm text-muted-foreground">
            You have a <span className="font-semibold uppercase">{mySub.status}</span> subscription on file.{" "}
            <Link to="/dashboard/billing" className="text-primary underline">View billing →</Link>
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((p) => {
            const isCurrent = mySub?.plan_id === p.id;
            const hasOther = mySub && !isCurrent && ["pending","active","paused"].includes(mySub.status);
            return (
              <div key={p.id} className={`flex flex-col rounded-xl border bg-card p-6 ${isCurrent ? "border-primary ring-2 ring-primary/30" : "border-border"}`}>
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
                <Button
                  className="mt-6"
                  disabled={requesting === p.id || isCurrent || hasOther}
                  onClick={() => requestPlan(p.id)}
                >
                  {isCurrent ? `Current (${mySub.status})` : hasOther ? "Subscription on file" : user ? "Request this plan" : "Sign up to subscribe"}
                </Button>
              </div>
            );
          })}
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-muted-foreground">
          Requests are reviewed manually by our sales team — you'll receive an email once it's activated. Live card payments are coming soon.
        </p>
      </section>
    </SiteLayout>
  );
}
