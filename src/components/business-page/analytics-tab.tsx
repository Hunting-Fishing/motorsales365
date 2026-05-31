import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { getBusinessAnalytics } from "@/lib/business-analytics.functions";
import { Eye, MousePointerClick, CalendarCheck2, TrendingUp, Phone, MessageCircle, Share2, Mail, Compass, Search, Tag, Megaphone, Globe2, Link2, Share, ListOrdered, Smartphone, Monitor, Tablet, Bot, HelpCircle, MapPin, Building2 } from "lucide-react";

const CHANNEL_KIND_LABELS: Record<string, { label: string; icon: any }> = {
  call_click: { label: "Phone calls", icon: Phone },
  whatsapp_click: { label: "WhatsApp", icon: MessageCircle },
  messenger_click: { label: "Messenger", icon: MessageCircle },
  contact_click: { label: "Other channels", icon: MessageCircle },
  website_click: { label: "Website", icon: TrendingUp },
  share_click: { label: "Shares", icon: Share2 },
  inquiry_submitted: { label: "Inquiries", icon: Mail },
  book_click: { label: "Booking clicks", icon: CalendarCheck2 },
};

const SOURCE_LABELS: Record<string, { label: string; icon: any; hint: string }> = {
  ads: { label: "Ads", icon: Megaphone, hint: "Visitors from your ads or promoted slots" },
  directory: { label: "Directory browse", icon: Compass, hint: "Browsing the businesses directory" },
  name_search: { label: "Name searches", icon: Search, hint: "Searched by your business name" },
  relevant_search: { label: "Relevant searches", icon: Tag, hint: "Found via category, tag, or related filters" },
  listing: { label: "From listings / shop", icon: ListOrdered, hint: "Clicked through from a product or listing" },
  search_engine: { label: "Search engines", icon: Globe2, hint: "Google, Bing and other search engines" },
  social: { label: "Social media", icon: Share, hint: "Facebook, Instagram, TikTok and others" },
  internal: { label: "Other pages on site", icon: Link2, hint: "Other pages within this site" },
  external: { label: "External sites", icon: Globe2, hint: "Outside sites that linked to you" },
  direct: { label: "Direct / saved link", icon: Link2, hint: "Typed URL, bookmark, or QR code" },
};

const DEVICE_LABELS: Record<string, { label: string; icon: any }> = {
  mobile: { label: "Mobile", icon: Smartphone },
  tablet: { label: "Tablet", icon: Tablet },
  desktop: { label: "Desktop", icon: Monitor },
  bot: { label: "Bots & crawlers", icon: Bot },
  unknown: { label: "Unknown device", icon: HelpCircle },
};



function Sparkline({ values, max }: { values: number[]; max: number }) {
  const w = 280;
  const h = 50;
  const safeMax = Math.max(1, max);
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const points = values
    .map((v, i) => `${i * step},${h - (v / safeMax) * h}`)
    .join(" ");
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-12 w-full">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="text-primary"
      />
    </svg>
  );
}

function StatCard({ label, value, icon: Icon, accent }: { label: string; value: string | number; icon: any; accent?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className={`mt-2 font-display text-2xl font-bold ${accent ?? ""}`}>{value}</div>
    </Card>
  );
}

export function AnalyticsTab({ businessId }: { businessId: string }) {
  const fetchAnalytics = useServerFn(getBusinessAnalytics);
  const { data, isLoading } = useQuery({
    queryKey: ["business-analytics", businessId, 30],
    queryFn: () => fetchAnalytics({ data: { businessId, days: 30 } }),
    enabled: !!businessId,
  });

  if (isLoading || !data) return <div className="text-sm text-muted-foreground">Loading analytics…</div>;

  const a: any = data;
  const series = a.series as Array<{ date: string; views: number; clicks: number; bookings: number }>;
  const maxView = Math.max(0, ...series.map((s) => s.views));

  const channelRows = Object.entries(CHANNEL_KIND_LABELS)
    .map(([kind, meta]) => ({ kind, ...meta, count: (a.byKind[kind] as number) ?? 0 }))
    .filter((r) => r.count > 0)
    .sort((x, y) => y.count - x.count);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Page views" value={a.totalViews} icon={Eye} />
        <StatCard label="Clicks (all CTAs)" value={Object.entries(a.byKind).reduce((acc, [k, v]) => acc + (k.endsWith("_click") ? (v as number) : 0), 0)} icon={MousePointerClick} />
        <StatCard label="Bookings" value={a.totalBookings} icon={CalendarCheck2} />
        <StatCard label="Conversion rate" value={`${a.conversionRate}%`} icon={TrendingUp} />
      </div>

      <Card className="p-4">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Views — last 30 days</div>
        <Sparkline values={series.map((s) => s.views)} max={maxView} />
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
          <span>{series[0]?.date}</span>
          <span>{series[series.length - 1]?.date}</span>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="mb-3 font-display text-base font-semibold">Top actions</h3>
        {channelRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No CTA clicks recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {channelRows.map((r) => {
              const Icon = r.icon;
              const pct = a.totalViews > 0 ? Math.round((r.count / a.totalViews) * 100) : 0;
              return (
                <li key={r.kind} className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{r.label}</span>
                      <span className="text-muted-foreground">{r.count} ({pct}% of views)</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-primary" style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="p-4">
        <h3 className="mb-1 font-display text-base font-semibold">Where visitors came from</h3>
        <p className="mb-3 text-xs text-muted-foreground">Traffic sources for the last {a.series.length} days.</p>
        {(() => {
          const rows = Object.entries(a.bySource ?? {})
            .map(([k, v]) => ({ key: k, count: v as number, meta: SOURCE_LABELS[k] ?? { label: k, icon: Globe2, hint: "" } }))
            .filter((r) => r.count > 0)
            .sort((x, y) => y.count - x.count);
          if (rows.length === 0) return <p className="text-sm text-muted-foreground">No view sources recorded yet.</p>;
          const total = rows.reduce((acc, r) => acc + r.count, 0);
          return (
            <ul className="space-y-2">
              {rows.map((r) => {
                const Icon = r.meta.icon;
                const pct = total > 0 ? Math.round((r.count / total) * 100) : 0;
                return (
                  <li key={r.key} className="flex items-start gap-3">
                    <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="font-medium">{r.meta.label}</span>
                        <span className="text-muted-foreground">{r.count} ({pct}%)</span>
                      </div>
                      {r.meta.hint && <div className="text-[11px] text-muted-foreground">{r.meta.hint}</div>}
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-primary" style={{ width: `${Math.min(100, pct)}%` }} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          );
        })()}
      </Card>

      {Array.isArray(a.topQueries) && a.topQueries.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-1 font-display text-base font-semibold">Top search terms</h3>
          <p className="mb-3 text-xs text-muted-foreground">Search terms visitors used before landing on your page.</p>
          <ul className="space-y-1">
            {a.topQueries.map((q: { term: string; count: number }) => (
              <li key={q.term} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-1.5 text-sm">
                <span className="truncate font-medium">{q.term}</span>
                <span className="text-muted-foreground">{q.count}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-1 font-display text-base font-semibold">Devices</h3>
          <p className="mb-3 text-xs text-muted-foreground">What visitors used to view your page.</p>
          {(() => {
            const rows = Object.entries(a.byDevice ?? {})
              .map(([k, v]) => ({ key: k, count: v as number, meta: DEVICE_LABELS[k] ?? DEVICE_LABELS.unknown }))
              .filter((r) => r.count > 0)
              .sort((x, y) => y.count - x.count);
            if (rows.length === 0) return <p className="text-sm text-muted-foreground">No device info recorded yet.</p>;
            const total = rows.reduce((acc, r) => acc + r.count, 0);
            return (
              <ul className="space-y-2">
                {rows.map((r) => {
                  const Icon = r.meta.icon;
                  const pct = total > 0 ? Math.round((r.count / total) * 100) : 0;
                  return (
                    <li key={r.key} className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{r.meta.label}</span>
                          <span className="text-muted-foreground">{r.count} ({pct}%)</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div className="h-full bg-primary" style={{ width: `${Math.min(100, pct)}%` }} />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            );
          })()}
        </Card>

        <Card className="p-4">
          <h3 className="mb-1 font-display text-base font-semibold">Top locations</h3>
          <p className="mb-3 text-xs text-muted-foreground">Where your visitors are browsing from.</p>
          {(() => {
            const cities = (a.topCities ?? []) as Array<{ name: string; count: number }>;
            const regions = (a.topRegions ?? []) as Array<{ name: string; count: number }>;
            const countries = (a.topCountries ?? []) as Array<{ code: string; count: number }>;
            if (cities.length === 0 && regions.length === 0 && countries.length === 0) {
              return <p className="text-sm text-muted-foreground">No location info recorded yet.</p>;
            }
            const totalCities = cities.reduce((acc, r) => acc + r.count, 0);
            const totalRegions = regions.reduce((acc, r) => acc + r.count, 0);
            return (
              <div className="space-y-4">
                {cities.length > 0 && (
                  <div>
                    <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <MapPin className="h-3 w-3" /> Cities
                    </div>
                    <ul className="space-y-1">
                      {cities.map((c) => {
                        const pct = totalCities > 0 ? Math.round((c.count / totalCities) * 100) : 0;
                        return (
                          <li key={c.name} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-1.5 text-sm">
                            <span className="truncate font-medium">{c.name}</span>
                            <span className="text-muted-foreground">{c.count} ({pct}%)</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                {regions.length > 0 && (
                  <div>
                    <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <Building2 className="h-3 w-3" /> Regions
                    </div>
                    <ul className="space-y-1">
                      {regions.map((r) => {
                        const pct = totalRegions > 0 ? Math.round((r.count / totalRegions) * 100) : 0;
                        return (
                          <li key={r.name} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-1.5 text-sm">
                            <span className="truncate font-medium">{r.name}</span>
                            <span className="text-muted-foreground">{r.count} ({pct}%)</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                {countries.length > 0 && (
                  <div>
                    <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <Globe2 className="h-3 w-3" /> Countries
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {countries.map((c) => (
                        <span key={c.code} className="rounded-md bg-muted/40 px-2 py-0.5 text-xs">
                          {c.code} · {c.count}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Stats cover the last {a.series.length} days. Page views are de-duplicated per browser session per business.
        Source is detected from referrer and link parameters; device and location are inferred from request headers — some visits may show as “Direct” or have no location when the browser hides this info.
      </p>


    </div>
  );
}
