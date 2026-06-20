import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";


import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";



import { Button } from "@/components/ui/button";
import { Copy, Download, Printer, MousePointerClick, UserPlus, Percent, Users, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { siteOrigin } from "@/lib/site-config";

export const Route = createFileRoute("/dashboard/referral")({
  component: StaffReferral,
});

const sb = supabase as any;

type StaffRow = {
  id: string;
  email: string;
  full_name: string;
  referral_code: string;
  qr_storage_path: string | null;
  active: boolean;
};

type Promo = {
  id: string;
  title: string;
  description: string | null;
  kind: string;
  percent_off: number | null;
  flat_amount_php: number | null;
  applies_to: string;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
  terms: string | null;
};

const RANGES = { "7": "7 days", "30": "30 days", "90": "90 days", all: "All time" } as const;
type RangeKey = keyof typeof RANGES;

function sinceFor(r: RangeKey): string | null {
  if (r === "all") return null;
  const d = new Date();
  d.setDate(d.getDate() - Number(r));
  return d.toISOString();
}

function StaffReferral() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [staff, setStaff] = useState<StaffRow | null>(null);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [range, setRange] = useState<RangeKey>("30");
  const [stats, setStats] = useState({ scans: 0, visitors: 0, signups: 0 });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data: s } = await sb
        .from("staff_referrals")
        .select("id,email,full_name,referral_code,qr_storage_path,active")
        .or(`staff_user_id.eq.${user.id},email.eq.${user.email?.toLowerCase()}`)
        .maybeSingle();
      if (!s) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setStaff(s as StaffRow);

      const { data: pr } = await sb
        .from("staff_promotions")
        .select("*")
        .eq("staff_referral_id", (s as StaffRow).id)
        .order("created_at", { ascending: false });
      setPromos((pr as Promo[]) || []);

      setLoading(false);
    })();
  }, [user]);

  const adContext = useMemo(() => {
    if (!staff) return null;
    const origin = siteOrigin();
    return {
      name: staff.full_name,
      firstName: staff.full_name.split(" ")[0] || staff.full_name,
      code: staff.referral_code,
      link: `${origin}/r/${staff.referral_code}`,
    };
  }, [staff]);

  useEffect(() => {
    if (!staff) return;
    (async () => {
      const since = sinceFor(range);
      let scansQ = sb
        .from("qr_scans")
        .select("visitor_id,scanned_at")
        .eq("referral_code", staff.referral_code);
      if (since) scansQ = scansQ.gte("scanned_at", since);
      const { data: scans } = await scansQ;

      let signupsQ = sb
        .from("user_referrals")
        .select("user_id,signup_date")
        .eq("referred_by_staff_id", staff.id);
      if (since) signupsQ = signupsQ.gte("signup_date", since);
      const { data: signups } = await signupsQ;

      const visitors = new Set<string>();
      ((scans as any[]) || []).forEach((x) => x.visitor_id && visitors.add(x.visitor_id));
      setStats({
        scans: ((scans as any[]) || []).length,
        visitors: visitors.size,
        signups: ((signups as any[]) || []).length,
      });
    })();
  }, [staff, range]);

  const link = useMemo(
    () => (staff ? `${siteOrigin()}/r/${staff.referral_code}` : ""),
    [staff],
  );
  const posterUrl = useMemo(
    () => (staff ? `${siteOrigin()}/r/${staff.referral_code}/poster` : ""),
    [staff],
  );
  const qrUrl = useMemo(() => {
    if (!staff?.qr_storage_path) return null;
    const { data } = supabase.storage.from("qr-codes").getPublicUrl(staff.qr_storage_path);
    return data.publicUrl;
  }, [staff]);

  const conversion =
    stats.visitors > 0 ? Math.round((stats.signups / stats.visitors) * 1000) / 10 : 0;

  if (authLoading || loading) {
    return <div className="p-12 text-center text-muted-foreground">Loading…</div>;
  }

  if (notFound) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <h1 className="font-display text-2xl font-bold">No referral code yet</h1>
        <p className="mt-2 text-muted-foreground">
          Your account doesn’t have a personal QR referral set up. Ask an admin to create one tied
          to your company email.
        </p>
      </div>
    );
  }

  if (!staff) return null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">My referral</h1>
          <p className="text-sm text-muted-foreground">
            Share your QR or link. Anyone who scans and signs up in the same browser within 90 days
            is credited to you.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/resources/qr-landing">
            <Button size="sm" variant="outline">Preview scanner view</Button>
          </Link>
          <Link to="/dashboard/qr-ads">
            <Button size="sm">Open QR ads</Button>
          </Link>
          <span
            className={`rounded-full px-3 py-1 text-xs ${staff.active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
          >
            {staff.active ? "Active" : "Inactive"}
          </span>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          {
            to: "/dashboard/promoter-resources",
            title: "Promoter resources",
            body: "Copy/paste ad templates, placement tips, scanner walkthrough.",
            Icon: Megaphone,
            cta: "Open resources",
          },
          {
            to: "/resources/qr-landing",
            title: "Preview scanner view",
            body: "See the exact page a new visitor sees after scanning your QR.",
            Icon: MousePointerClick,
            cta: "Open preview",
          },
          {
            to: "/dashboard/qr-ads",
            title: "QR Ads & print",
            body: "Posters, arm bands, banners and shirts with your QR baked in.",
            Icon: Printer,
            cta: "Open QR ads",
          },
        ].map(({ to, title, body, Icon, cta }) => (
          <Link
            key={to}
            to={to}
            className="group rounded-xl border border-border bg-card p-4 transition hover:border-primary/40 hover:bg-secondary/40"
          >
            <Icon className="h-4 w-4 text-primary" />
            <h3 className="mt-2 text-sm font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            <p className="mt-3 text-xs font-medium text-primary group-hover:underline">
              {cta} →
            </p>
          </Link>
        ))}
      </section>


      <section className="grid gap-6 md:grid-cols-[260px_1fr]">
        <div className="rounded-xl border border-border bg-card p-4">
          {qrUrl ? (
            <img
              src={qrUrl}
              alt={`QR for ${staff.full_name}`}
              className="aspect-square w-full rounded-md bg-white object-contain p-2"
            />
          ) : (
            <div className="aspect-square w-full rounded-md bg-muted" />
          )}
          <div className="mt-3 text-center">
            <div className="font-display text-lg font-bold">{staff.full_name}</div>
            <div className="font-mono text-xs text-muted-foreground">{staff.referral_code}</div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {qrUrl && (
              <a href={qrUrl} download={`${staff.referral_code}.png`}>
                <Button variant="outline" size="sm" className="w-full">
                  <Download className="mr-1 h-4 w-4" /> PNG
                </Button>
              </a>
            )}
            <a href={posterUrl} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm" className="w-full">
                <Printer className="mr-1 h-4 w-4" /> Poster
              </Button>
            </a>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Your referral link
            </div>
            <div className="mt-1 flex items-center gap-2">
              <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-sm">{link}</code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(link);
                  toast.success("Copied");
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Range:</span>
            {(Object.keys(RANGES) as RangeKey[]).map((k) => (
              <button
                key={k}
                onClick={() => setRange(k)}
                className={`rounded-full px-3 py-1 text-xs ${range === k ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
              >
                {RANGES[k]}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi
              icon={<MousePointerClick className="h-4 w-4" />}
              label="Scans"
              value={stats.scans.toLocaleString()}
            />
            <Kpi
              icon={<Users className="h-4 w-4" />}
              label="Unique visitors"
              value={stats.visitors.toLocaleString()}
            />
            <Kpi
              icon={<UserPlus className="h-4 w-4" />}
              label="Signups"
              value={stats.signups.toLocaleString()}
            />
            <Kpi
              icon={<Percent className="h-4 w-4" />}
              label="Conversion"
              value={`${conversion}%`}
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-display text-lg font-semibold">My promotions</h2>
        <p className="text-xs text-muted-foreground">
          Offers your scanned visitors will see on your landing page. Managed by admins.
        </p>
        {promos.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No promotions attached yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {promos.map((p) => (
              <li key={p.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium">
                      {p.title}
                      <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-xs uppercase">
                        {p.kind}
                      </span>
                      {!p.active && (
                        <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs">paused</span>
                      )}
                    </div>
                    {p.description && (
                      <p className="text-sm text-muted-foreground">{p.description}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {p.percent_off ? `${p.percent_off}% off · ` : ""}
                      {p.flat_amount_php ? `₱${p.flat_amount_php} · ` : ""}
                      applies to {p.applies_to}
                      {p.ends_at ? ` · ends ${new Date(p.ends_at).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display flex items-center gap-2 text-lg font-semibold">
              <Megaphone className="h-4 w-4 text-primary" /> 365 Advertisements
            </h2>
            <p className="text-xs text-muted-foreground">
              All branded 365 Motor Sales ads — with your personal QR baked in — now live on
              one page. Browse by category, download, share, or tweak the layout. Every scan
              is credited to you for 90 days.
            </p>
          </div>
          <Link to="/dashboard/qr-ads">
            <Button size="sm">Open QR Advertisements</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="text-primary">{icon}</span>
        <span className="uppercase tracking-wider">{label}</span>
      </div>
      <div className="font-display mt-1 text-xl font-bold">{value}</div>
    </div>
  );
}
