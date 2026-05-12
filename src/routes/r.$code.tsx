import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getVisitorId, recordTouch } from "@/lib/referral";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, RotateCcw, Info } from "lucide-react";

export const Route = createFileRoute("/r/$code")({
  component: ReferralLanding,
});

type Promo = {
  id: string;
  title: string;
  description: string | null;
  kind: string;
  percent_off: number | null;
  flat_amount_php: number | null;
  applies_to: string;
  ends_at: string | null;
  terms: string | null;
};

const VISITS_KEY = (code: string) => `mref_visits_${code}`;

function ReferralLanding() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const [staffName, setStaffName] = useState<string | null>(null);
  const [active, setActive] = useState<boolean | null>(null);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [counted, setCounted] = useState<boolean | null>(null);
  const [visitCount, setVisitCount] = useState<number>(0);
  const [firstSeenAt, setFirstSeenAt] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const visitorId = getVisitorId();
      const ua = navigator.userAgent;
      const { data, error } = await (supabase.rpc as any)("record_qr_scan", {
        _code: code,
        _visitor_id: visitorId,
        _user_agent: ua,
        _landing: window.location.href,
      });
      if (error || !data?.ok) {
        setActive(false);
        setLoading(false);
        return;
      }
      setStaffName(data.first_name || data.staff_name || null);
      setActive(Boolean(data.active));
      setCounted(data.active ? Boolean(data.counted) : null);
      if (data.active) recordTouch(code);

      // Local visit history (per-device): bumps every landing, including repeats.
      try {
        const raw = localStorage.getItem(VISITS_KEY(code));
        const prev = raw ? JSON.parse(raw) : { count: 0, first: null as string | null };
        const next = {
          count: (prev.count || 0) + 1,
          first: prev.first || new Date().toISOString(),
        };
        localStorage.setItem(VISITS_KEY(code), JSON.stringify(next));
        setVisitCount(next.count);
        setFirstSeenAt(next.first);
      } catch {
        setVisitCount(1);
      }

      // Look up the staff_referral_id, then load active promos.
      const sb = supabase as any;
      const { data: staff } = await sb
        .from("staff_referrals")
        .select("id")
        .eq("referral_code", code)
        .maybeSingle();
      if (staff?.id) {
        const nowIso = new Date().toISOString();
        const { data: pr } = await sb
          .from("staff_promotions")
          .select("id,title,description,kind,percent_off,flat_amount_php,applies_to,ends_at,terms,starts_at,active")
          .eq("staff_referral_id", staff.id)
          .eq("active", true);
        const filtered = ((pr as any[]) || []).filter((p) =>
          (!p.starts_at || p.starts_at <= nowIso) && (!p.ends_at || p.ends_at >= nowIso),
        );
        setPromos(filtered as Promo[]);
      }
      setLoading(false);
    })();
  }, [code]);

  return (
    <SiteLayout>
      <TooltipProvider delayDuration={150}>
        <div className="container mx-auto max-w-2xl px-4 py-12">
          {loading ? (
            <p className="text-center text-muted-foreground">Loading…</p>
          ) : active === false ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <h1 className="font-display text-2xl font-bold">Referral link unavailable</h1>
              <p className="mt-2 text-muted-foreground">
                This referral code isn’t active. You can still create an account and browse.
              </p>
              <Button className="mt-6" onClick={() => navigate({ to: "/" })}>Continue to site</Button>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-8">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Referred by</p>
                  <h1 className="font-display mt-1 text-3xl font-bold">{staffName} sent you here</h1>
                </div>
                {counted !== null && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className={
                          "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors " +
                          (counted
                            ? "bg-primary/15 text-primary hover:bg-primary/20"
                            : "bg-secondary text-muted-foreground hover:bg-secondary/80")
                        }
                        aria-label={counted ? "New scan counted" : "Repeat scan"}
                      >
                        {counted ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5" />
                        )}
                        <span>{counted ? "New scan counted" : "Repeat scan"}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" align="end" className="max-w-[260px] text-xs">
                      {counted ? (
                        <p>
                          First scan from this device — counted toward {staffName}’s stats.
                          Repeat visits won’t inflate their numbers.
                        </p>
                      ) : (
                        <p>
                          You’ve already scanned this code from this device. We don’t count
                          repeat scans, so {staffName}’s stats stay accurate.
                        </p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>

              <p className="mt-2 text-muted-foreground">
                {counted === false
                  ? `Welcome back! Your original visit is still credited to ${staffName}.`
                  : `Your visit is credited to ${staffName}. Sign up in this browser within 90 days and they'll receive credit for your account.`}
              </p>

              {visitCount > 0 && (
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {visitCount === 1 ? (
                      <>This is your first visit to this referral page.</>
                    ) : (
                      <>
                        You’ve opened this page <strong className="text-foreground">{visitCount}</strong> times
                        {firstSeenAt ? (
                          <> since {new Date(firstSeenAt).toLocaleDateString()}</>
                        ) : null}
                        . Only the first scan counts toward stats.
                      </>
                    )}
                  </span>
                </div>
              )}

              {promos.length > 0 && (
                <div className="mt-6">
                  <h2 className="font-display text-lg font-semibold">Active offers</h2>
                  <ul className="mt-3 space-y-3">
                    {promos.map((p) => (
                      <li key={p.id} className="rounded-lg border border-border p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-semibold">{p.title}</div>
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs uppercase">{p.kind}</span>
                        </div>
                        {p.description && <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>}
                        <div className="mt-2 text-sm">
                          {p.percent_off ? <span className="font-semibold">{p.percent_off}% off</span> : null}
                          {p.flat_amount_php ? <span className="font-semibold">₱{p.flat_amount_php}</span> : null}
                          {(p.percent_off || p.flat_amount_php) && <span className="text-muted-foreground"> · applies to {p.applies_to}</span>}
                        </div>
                        {p.ends_at && (
                          <p className="mt-1 text-xs text-muted-foreground">Ends {new Date(p.ends_at).toLocaleDateString()}</p>
                        )}
                        {p.terms && <p className="mt-1 text-xs text-muted-foreground">{p.terms}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-6 flex gap-3">
                <Button onClick={() => navigate({ to: "/signup" })}>Create an account</Button>
                <Button variant="outline" onClick={() => navigate({ to: "/" })}>Browse listings</Button>
              </div>
            </div>
          )}
        </div>
      </TooltipProvider>
    </SiteLayout>
  );
}
