import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  Inbox,
  Users,
  QrCode,
  BarChart3,
  Megaphone,
  LifeBuoy,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/dashboard/partner/overview")({
  component: OverviewTab,
});

type Step = {
  title: string;
  desc: string;
  cta: string;
  to: string;
};

const STEPS: Step[] = [
  {
    title: "1. Grab your referral link",
    desc: "Share it anywhere — every signup that comes from it is tracked to you.",
    cta: "Open Referrals",
    to: "/dashboard/partner/referrals",
  },
  {
    title: "2. Print or share your QR ad",
    desc: "Pick a template, add your QR, and print it or share online.",
    cta: "Open QR Ads",
    to: "/dashboard/partner/qr-ads",
  },
  {
    title: "3. Watch your first scan land",
    desc: "See real-time scans, signups and redemptions from your QR codes.",
    cta: "Open QR Analytics",
    to: "/dashboard/partner/qr-analytics",
  },
  {
    title: "4. Reply to your first lead",
    desc: "Inbound inquiries from listings, businesses and QR scans all land here.",
    cta: "Open Inbox",
    to: "/dashboard/partner/inbox",
  },
];

function OverviewTab() {
  const { isAdmin, isSales, isAdvertising, isSupport } = useAuth();

  const tiles = [
    { to: "/dashboard/partner/inbox", label: "Inbox", desc: "Leads from listings, businesses and QR scans.", Icon: Inbox, show: isSales || isSupport || isAdmin, tint: "sky" },
    { to: "/dashboard/partner/referrals", label: "Referrals", desc: "Your referral link, shareable posts and history.", Icon: Users, show: true, tint: "emerald" },
    { to: "/dashboard/partner/qr-ads", label: "QR Ads", desc: "Printable templates with your personal QR.", Icon: QrCode, show: isSales || isAdvertising || isAdmin, tint: "violet" },
    { to: "/dashboard/partner/qr-analytics", label: "QR Analytics", desc: "Scans, signups and redemptions.", Icon: BarChart3, show: isSales || isAdvertising || isAdmin, tint: "amber" },
    { to: "/dashboard/partner/advertisements", label: "Advertisements", desc: "Sponsored campaigns and promotions.", Icon: Megaphone, show: isAdvertising || isAdmin, tint: "rose" },
    { to: "/dashboard/partner/performance", label: "Performance", desc: "Your sales performance and commissions.", Icon: BarChart3, show: isSales || isAdmin, tint: "sky" },
    { to: "/dashboard/partner/activity", label: "Activity & Reports", desc: "Community activity and moderation reports.", Icon: LifeBuoy, show: isSupport || isAdmin, tint: "emerald" },
  ].filter((t) => t.show);

  const tintClass: Record<string, string> = {
    sky: "border-sky-300 bg-sky-50 dark:border-sky-500/40 dark:bg-sky-500/10",
    emerald: "border-emerald-300 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/10",
    violet: "border-violet-300 bg-violet-50 dark:border-violet-500/40 dark:bg-violet-500/10",
    amber: "border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10",
    rose: "border-rose-300 bg-rose-50 dark:border-rose-500/40 dark:bg-rose-500/10",
  };

  return (
    <div className="space-y-6">
      {/* First-time checklist */}
      <Card className="border-primary/30 bg-primary/5 p-5">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">First-timer? Start here.</h2>
          <Badge variant="outline" className="ml-auto">4 steps</Badge>
        </div>
        <ol className="grid gap-3 sm:grid-cols-2">
          {STEPS.map((s) => (
            <li key={s.to} className="rounded-md border bg-background p-3">
              <p className="font-medium">{s.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.desc}</p>
              <Button asChild size="sm" variant="outline" className="mt-2">
                <Link to={s.to as any}>
                  {s.cta} <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </li>
          ))}
        </ol>
      </Card>

      {/* Section tiles */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map(({ to, label, desc, Icon, tint }) => (
          <Link
            key={to}
            to={to as any}
            className={`group rounded-lg border p-4 transition-shadow hover:shadow-md ${tintClass[tint]}`}
          >
            <div className="mb-2 flex items-center gap-2">
              <Icon className="h-5 w-5" />
              <p className="font-semibold">{label}</p>
              <ArrowRight className="ml-auto h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <p className="text-sm text-muted-foreground">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
