import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Eye,
  Phone,
  MessageCircle,
  Globe,
  Share2,
  CalendarDays,
  Inbox,
  Lock,
  ArrowLeft,
} from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getBusinessAnalytics } from "@/lib/business-directory.functions";

export const Route = createFileRoute("/_authenticated/dashboard/businesses_/$id/analytics")({
  component: BusinessAnalyticsPage,
});

const KIND_META: Record<string, { label: string; icon: typeof Eye }> = {
  view: { label: "Page views", icon: Eye },
  call_click: { label: "Call clicks", icon: Phone },
  whatsapp_click: { label: "WhatsApp clicks", icon: MessageCircle },
  messenger_click: { label: "Messenger clicks", icon: MessageCircle },
  website_click: { label: "Website clicks", icon: Globe },
  contact_click: { label: "Contact clicks", icon: Phone },
  share_click: { label: "Shares", icon: Share2 },
  book_click: { label: "Book clicks", icon: CalendarDays },
  book_created: { label: "Bookings started", icon: CalendarDays },
  book_confirmed: { label: "Bookings confirmed", icon: CalendarDays },
  inquiry_submitted: { label: "Inquiries", icon: Inbox },
  gallery_view: { label: "Gallery views", icon: Eye },
  video_play: { label: "Video plays", icon: Eye },
};

function BusinessAnalyticsPage() {
  const { id } = Route.useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["business-analytics", id],
    queryFn: () => getBusinessAnalytics({ data: { businessId: id, days: 30 } }),
  });

  const tier = data?.subscriptionTier ?? "free";
  const isPaid = tier === "featured" || tier === "premium";

  return (
    <SiteLayout>
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/dashboard/businesses">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to my businesses
          </Link>
        </Button>

        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">
              {data?.businessName ?? "Business analytics"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Last {data?.days ?? 30} days of activity on your business page.
            </p>
          </div>
          <Badge
            className={
              tier === "premium"
                ? "bg-amber-500 text-amber-950"
                : tier === "featured"
                  ? "bg-primary"
                  : "bg-muted text-muted-foreground"
            }
          >
            {tier} tier
          </Badge>
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && (
          <p className="text-sm text-destructive">
            Couldn't load analytics: {(error as Error).message}
          </p>
        )}

        {data && (
          <>
            {!isPaid && (
              <Card className="mb-6 border-2 border-amber-400/40 bg-amber-50/50 p-5 dark:bg-amber-500/5">
                <div className="flex items-start gap-3">
                  <Lock className="mt-0.5 h-5 w-5 text-amber-600" />
                  <div className="flex-1">
                    <h3 className="font-semibold">Upgrade to unlock full analytics</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Free businesses see summary totals only. Featured and Premium plans get
                      daily trend charts, traffic source breakdowns, and competitor benchmarks.
                    </p>
                    <Button asChild size="sm" className="mt-3">
                      <Link to="/dashboard/businesses">Upgrade plan</Link>
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { kind: "view" },
                { kind: "call_click" },
                { kind: "inquiry_submitted" },
                { kind: "book_confirmed" },
              ].map(({ kind }) => {
                const meta = KIND_META[kind];
                const Icon = meta.icon;
                return (
                  <Card key={kind} className="p-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Icon className="h-3.5 w-3.5" />
                      {meta.label}
                    </div>
                    <div className="mt-1 text-2xl font-bold">{data.byKind[kind] ?? 0}</div>
                  </Card>
                );
              })}
            </div>

            <Card className="p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Activity breakdown
              </h2>
              <div className="space-y-2">
                {Object.entries(KIND_META).map(([kind, meta]) => {
                  const count = data.byKind[kind] ?? 0;
                  if (count === 0) return null;
                  const Icon = meta.icon;
                  return (
                    <div
                      key={kind}
                      className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                    >
                      <span className="flex items-center gap-2 text-sm">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        {meta.label}
                      </span>
                      <span className="font-semibold tabular-nums">{count}</span>
                    </div>
                  );
                })}
                {data.total === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No activity recorded in the last {data.days} days yet.
                  </p>
                )}
              </div>
            </Card>

            {isPaid && Object.keys(data.byDay).length > 0 && (
              <Card className="mt-6 p-5">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Daily activity
                </h2>
                <DailySparkline byDay={data.byDay} />
              </Card>
            )}
          </>
        )}
      </div>
    </SiteLayout>
  );
}

function DailySparkline({ byDay }: { byDay: Record<string, number> }) {
  const entries = Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b));
  const max = Math.max(1, ...entries.map(([, v]) => v));
  return (
    <div className="flex h-32 items-end gap-1">
      {entries.map(([day, count]) => (
        <div
          key={day}
          className="flex-1 min-w-1 rounded-t bg-primary/70 transition-all hover:bg-primary"
          style={{ height: `${(count / max) * 100}%` }}
          title={`${day}: ${count}`}
        />
      ))}
    </div>
  );
}
