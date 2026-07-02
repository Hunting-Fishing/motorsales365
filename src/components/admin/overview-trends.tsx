import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { QrCode, UserPlus, Wallet, MessagesSquare, Rocket, ListChecks } from "lucide-react";
import {
  getAdminOverviewTrends,
  type AdminOverviewTrends,
  type TrendPoint,
} from "@/lib/admin-overview.functions";
import { formatPHP } from "@/lib/format";

type Range = 7 | 30;

type SeriesKey = "scans" | "signups" | "revenue" | "messages" | "listings" | "boosts";

type SeriesDef = {
  key: SeriesKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** semantic hue — mapped to a Tailwind color at render time */
  hue: "indigo" | "emerald" | "amber" | "sky" | "violet" | "rose";
  format: (v: number) => string;
};

const SERIES: SeriesDef[] = [
  { key: "scans",    label: "QR scans",         icon: QrCode,          hue: "indigo",  format: (v) => v.toLocaleString() },
  { key: "signups",  label: "New signups",      icon: UserPlus,        hue: "emerald", format: (v) => v.toLocaleString() },
  { key: "revenue",  label: "Revenue (paid)",   icon: Wallet,          hue: "amber",   format: (v) => formatPHP(v) },
  { key: "messages", label: "Messages sent",    icon: MessagesSquare,  hue: "sky",     format: (v) => v.toLocaleString() },
  { key: "listings", label: "Listings created", icon: ListChecks,      hue: "violet",  format: (v) => v.toLocaleString() },
  { key: "boosts",   label: "Boosts sold",      icon: Rocket,          hue: "rose",    format: (v) => v.toLocaleString() },
];

const HUE_STROKE: Record<SeriesDef["hue"], string> = {
  indigo:  "#6366f1",
  emerald: "#10b981",
  amber:   "#f59e0b",
  sky:     "#0ea5e9",
  violet:  "#8b5cf6",
  rose:    "#f43f5e",
};

export function OverviewTrends() {
  const [range, setRange] = useState<Range>(30);
  const call = useServerFn(getAdminOverviewTrends);
  const q = useQuery<AdminOverviewTrends>({
    queryKey: ["admin", "overview", "trends", range],
    queryFn: () => call({ data: { days: range } }),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Trends</h2>
          <p className="text-xs text-muted-foreground">
            Daily activity across scans, signups, payments and messaging.
          </p>
        </div>
        <div
          role="tablist"
          aria-label="Trend range"
          className="inline-flex rounded-lg border border-border bg-card p-0.5 text-xs font-medium"
        >
          {([7, 30] as Range[]).map((r) => (
            <button
              key={r}
              role="tab"
              type="button"
              aria-selected={range === r}
              onClick={() => setRange(r)}
              className={
                "rounded-md px-3 py-1 transition-colors " +
                (range === r
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted")
              }
            >
              Last {r} days
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {SERIES.map((s) => (
          <TrendCard
            key={s.key}
            def={s}
            loading={q.isLoading}
            error={q.error as Error | null}
            series={q.data?.series ?? []}
          />
        ))}
      </div>
    </section>
  );
}

function TrendCard({
  def,
  series,
  loading,
  error,
}: {
  def: SeriesDef;
  series: TrendPoint[];
  loading: boolean;
  error: Error | null;
}) {
  const Icon = def.icon;
  const stroke = HUE_STROKE[def.hue];
  const gradientId = `trend-grad-${def.key}`;

  const { total, delta, deltaPct, chartData } = useMemo(() => {
    const values = series.map((p) => Number(p[def.key]) || 0);
    const total = values.reduce((a, b) => a + b, 0);
    const half = Math.floor(values.length / 2);
    const prev = values.slice(0, half).reduce((a, b) => a + b, 0);
    const curr = values.slice(half).reduce((a, b) => a + b, 0);
    const delta = curr - prev;
    const deltaPct = prev === 0 ? (curr > 0 ? 100 : 0) : (delta / prev) * 100;
    const chartData = series.map((p) => ({
      day: p.day,
      value: Number(p[def.key]) || 0,
    }));
    return { total, delta, deltaPct, chartData };
  }, [series, def.key]);

  const trendTone =
    delta > 0 ? "text-emerald-600 dark:text-emerald-400"
    : delta < 0 ? "text-rose-600 dark:text-rose-400"
    : "text-muted-foreground";

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          {def.label}
        </div>
        <div className={`text-[11px] font-semibold ${trendTone}`}>
          {delta === 0 ? "—" : `${delta > 0 ? "▲" : "▼"} ${Math.abs(deltaPct).toFixed(0)}%`}
        </div>
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <div className="font-display text-2xl font-bold">{def.format(total)}</div>
        <div className="text-[11px] text-muted-foreground">total in range</div>
      </div>

      <div className="mt-3 h-24 w-full">
        {loading ? (
          <div className="h-full w-full animate-pulse rounded-md bg-muted/40" />
        ) : error ? (
          <div className="flex h-full items-center text-[11px] text-destructive">
            Couldn't load trend.
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-full items-center text-[11px] text-muted-foreground">
            No data in range.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={stroke} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" hide />
              <YAxis hide domain={[0, "dataMax"]} />
              <Tooltip
                cursor={{ stroke: "hsl(var(--muted-foreground) / 0.3)", strokeWidth: 1 }}
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                  padding: "6px 8px",
                }}
                labelStyle={{ color: "hsl(var(--muted-foreground))", fontSize: 11 }}
                formatter={(v: number) => [def.format(Number(v) || 0), def.label]}
                labelFormatter={(l: string) => l}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={stroke}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
