import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BadgePercent, Filter, RefreshCw, Search } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPHP, formatDate } from "@/lib/format";
import { listClubDiscountGrants } from "@/lib/club-discount-admin.functions";

const SCOPES = [
  { value: "all", label: "All scopes" },
  { value: "ad_order", label: "Ad order" },
  { value: "boost", label: "Boost" },
  { value: "bundle", label: "Bundle" },
  { value: "subscription", label: "Subscription" },
  { value: "passport_premium", label: "Passport Premium" },
  { value: "promotion", label: "Promotion" },
] as const;

export const Route = createFileRoute("/admin/discount-audits")({
  head: () => ({
    meta: [
      { title: "Admin — Club discount audits" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DiscountAuditsPage,
});

function DiscountAuditsPage() {
  const listFn = useServerFn(listClubDiscountGrants);

  const [scope, setScope] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [userId, setUserId] = useState("");
  const [clubId, setClubId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const filters = useMemo(
    () => ({
      scope: scope === "all" ? null : (scope as any),
      search: search.trim() || null,
      userId: userId.trim() || null,
      clubId: clubId.trim() || null,
      from: from ? new Date(from).toISOString() : null,
      to: to ? new Date(to).toISOString() : null,
      limit: pageSize,
      offset: page * pageSize,
    }),
    [scope, search, userId, clubId, from, to, page],
  );

  const query = useQuery({
    queryKey: ["admin-club-discount-grants", filters],
    queryFn: () => listFn({ data: filters }),
  });

  const rows = query.data?.rows ?? [];
  const summary = query.data?.summary;
  const totalPages = summary ? Math.max(1, Math.ceil(summary.totalRows / pageSize)) : 1;

  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
              <BadgePercent className="h-6 w-6 text-emerald-600" /> Club discount audits
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Every application of the club-member discount, keyed to the user, club, and purchase.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Summary */}
        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          <SummaryCard label="Grants (matched)" value={String(summary?.totalRows ?? "—")} />
          <SummaryCard
            label="Total discount"
            value={summary ? formatPHP(summary.totalDiscount) : "—"}
            hint="Sum on current page"
          />
          <SummaryCard
            label="Original total"
            value={summary ? formatPHP(summary.totalOriginal) : "—"}
            hint="Before discount, current page"
          />
        </section>

        {/* Filters */}
        <section className="mt-6 rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium">
            <Filter className="h-4 w-4" /> Filters
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="text-xs text-muted-foreground">Purchase type</label>
              <Select value={scope} onValueChange={(v) => { setPage(0); setScope(v); }}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCOPES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Search (email, name, club)</label>
              <div className="relative mt-1">
                <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  value={search}
                  onChange={(e) => { setPage(0); setSearch(e.target.value); }}
                  placeholder="jane@example.com"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">User ID</label>
              <Input
                className="mt-1"
                value={userId}
                onChange={(e) => { setPage(0); setUserId(e.target.value); }}
                placeholder="uuid"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Club ID</label>
              <Input
                className="mt-1"
                value={clubId}
                onChange={(e) => { setPage(0); setClubId(e.target.value); }}
                placeholder="uuid"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">From</label>
              <Input
                type="datetime-local"
                className="mt-1"
                value={from}
                onChange={(e) => { setPage(0); setFrom(e.target.value); }}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">To</label>
              <Input
                type="datetime-local"
                className="mt-1"
                value={to}
                onChange={(e) => { setPage(0); setTo(e.target.value); }}
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setScope("all"); setSearch(""); setUserId(""); setClubId("");
                  setFrom(""); setTo(""); setPage(0);
                }}
              >
                Reset filters
              </Button>
            </div>
          </div>
        </section>

        {/* Table */}
        <section className="mt-6 overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="bg-secondary/50 text-left">
              <tr>
                <th className="p-3">When</th>
                <th className="p-3">User</th>
                <th className="p-3">Club</th>
                <th className="p-3">Type</th>
                <th className="p-3 text-right">Original</th>
                <th className="p-3 text-right">Discount</th>
                <th className="p-3">Payment</th>
              </tr>
            </thead>
            <tbody>
              {query.isLoading ? (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Loading…</td></tr>
              ) : query.isError ? (
                <tr><td colSpan={7} className="p-8 text-center text-destructive">
                  {(query.error as Error)?.message ?? "Failed to load"}
                </td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">
                  No discount grants match these filters.
                </td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-t border-border align-top">
                    <td className="p-3 whitespace-nowrap">{formatDate(r.applied_at)}</td>
                    <td className="p-3">
                      <div className="font-medium">{r.user_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{r.user_email ?? r.user_id}</div>
                      <button
                        type="button"
                        className="mt-1 text-[10px] uppercase text-muted-foreground underline"
                        onClick={() => { setPage(0); setUserId(r.user_id); }}
                      >
                        filter user
                      </button>
                    </td>
                    <td className="p-3">
                      {r.club_slug ? (
                        <Link to="/clubs/$slug" params={{ slug: r.club_slug }} className="font-medium text-primary hover:underline">
                          {r.club_name ?? r.club_id}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">{r.club_name ?? "—"}</span>
                      )}
                      {r.club_id && (
                        <div>
                          <button
                            type="button"
                            className="mt-1 text-[10px] uppercase text-muted-foreground underline"
                            onClick={() => { setPage(0); setClubId(r.club_id!); }}
                          >
                            filter club
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <Badge variant="secondary" className="capitalize">{r.scope.replace(/_/g, " ")}</Badge>
                      <div className="mt-1 text-[10px] uppercase text-muted-foreground">{r.discount_pct}% off</div>
                    </td>
                    <td className="p-3 text-right">{formatPHP(r.original_amount_php)}</td>
                    <td className="p-3 text-right font-medium text-emerald-600">
                      − {formatPHP(r.discount_amount_php)}
                    </td>
                    <td className="p-3">
                      {r.payment_id ? (
                        <Link
                          to="/payments/$id/receipt"
                          params={{ id: r.payment_id }}
                          target="_blank"
                          className="text-primary hover:underline"
                        >
                          Receipt ↗
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                      {r.payment_status && (
                        <div className="mt-1 text-[10px] uppercase text-muted-foreground">{r.payment_status}</div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <div>
            Page {page + 1} of {totalPages}
            {summary && ` · ${summary.totalRows} total`}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}

function SummaryCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl font-bold">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
