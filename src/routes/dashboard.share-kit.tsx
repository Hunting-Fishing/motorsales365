import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { TemplateCard } from "@/components/share-kit/template-card";
import { TEMPLATES } from "@/lib/share-kit/templates";

export const Route = createFileRoute("/dashboard/share-kit")({
  component: ShareKitPage,
  head: () => ({
    meta: [
      { title: "Your Share Kit — 365 Motor Sales" },
      {
        name: "description",
        content:
          "Download and share branded 365 Motor Sales ads with your personal referral QR code baked in.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

type StaffRow = {
  referral_code: string;
  full_name: string;
  active: boolean;
};

function ShareKitPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [staff, setStaff] = useState<StaffRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            or: (q: string) => {
              maybeSingle: () => Promise<{ data: StaffRow | null }>;
            };
          };
        };
      })
        .from("staff_referrals")
        .select("referral_code, full_name, active")
        .or(`staff_user_id.eq.${user.id},email.eq.${user.email?.toLowerCase()}`)
        .maybeSingle();
      setStaff(data ?? null);
      setLoading(false);
    })();
  }, [user]);

  const context = useMemo(() => {
    if (!staff) return null;
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://365motorsales.com";
    return {
      name: staff.full_name,
      firstName: staff.full_name.split(" ")[0] || staff.full_name,
      code: staff.referral_code,
      link: `${origin}/r/${staff.referral_code}`,
    };
  }, [staff]);

  if (authLoading || loading) {
    return <div className="p-12 text-center text-muted-foreground">Loading your share kit…</div>;
  }

  if (!staff) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <h1 className="font-display text-2xl font-bold">No referral code yet</h1>
        <p className="mt-2 text-muted-foreground">
          Your account doesn't have a personal referral code, so we can't build personalized ads
          yet. Ask an admin to create one tied to your 365 email.
        </p>
        <Link to="/dashboard" className="mt-4 inline-block">
          <Button variant="outline">Back to dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            365 Member Share Kit
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold">
            {staff.full_name}'s personalized ads
          </h1>
          <p className="text-sm text-muted-foreground">
            Every design below has your QR code baked in. Download, print, or share — every scan
            and signup is credited to you for 90 days.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs ${
            staff.active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          }`}
        >
          {staff.active ? "Active" : "Inactive"}
        </span>
      </header>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link to="/my-qr">
          <Button variant="outline" size="sm">
            My QR
          </Button>
        </Link>
        <Link to="/dashboard/referral">
          <Button variant="outline" size="sm">
            Referral dashboard
          </Button>
        </Link>
        <Link to="/r/$code/poster" params={{ code: staff.referral_code }}>
          <Button variant="outline" size="sm">
            Classic A4 poster
          </Button>
        </Link>
      </div>

      {context && (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {TEMPLATES.map((t) => (
            <TemplateCard key={t.id} template={t} context={context} />
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Tip: when posting on Facebook or Messenger, attach the downloaded image AND paste your
        link — the QR in the image makes it scannable in-person, and the link keeps mobile taps
        tracked.
      </p>
    </div>
  );
}
