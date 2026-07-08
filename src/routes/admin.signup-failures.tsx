import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Loader2, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getSignupFailureById,
  getSignupFailureSummary,
  listSignupFailures,
  REASON_OPTIONS,
  type SignupFailureDetail,
  type SignupFailureRow,
  type SignupFailureSummary,
} from "@/lib/admin-signup-failures.functions";

function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export const Route = createFileRoute("/admin/signup-failures")({
  component: SignupFailuresPage,
  head: () => ({
    meta: [
      { title: "Signup failures — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

const ALL = "__all__";
const PAGE_SIZE = 50;

function toIsoOrUndef(local: string): string | undefined {
  if (!local) return undefined;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function StatusBadge({ code }: { code: number | null }) {
  if (code == null) return <Badge variant="outline">—</Badge>;
  const tone =
    code === 0
      ? "border-slate-400/60 bg-slate-500/10 text-slate-700 dark:text-slate-200"
      : code >= 500
        ? "border-destructive/60 bg-destructive/10 text-destructive"
        : code === 404
          ? "border-amber-500/60 bg-amber-500/10 text-amber-800 dark:text-amber-200"
          : code >= 400
            ? "border-orange-500/60 bg-orange-500/10 text-orange-800 dark:text-orange-200"
            : "border-emerald-500/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200";
  return (
    <Badge variant="outline" className={tone}>
      {code === 0 ? "network" : code}
    </Badge>
  );
}

function SignupFailuresPage() {
  const listFn = useServerFn(listSignupFailures);
  const summaryFn = useServerFn(getSignupFailureSummary);
  const detailFn = useServerFn(getSignupFailureById);

  const [reason, setReason] = useState<string>(ALL);
  const [statusCode, setStatusCode] = useState<string>("");
  const [errorCode, setErrorCode] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [since, setSince] = useState<string>("");
  const [until, setUntil] = useState<string>("");
  const [page, setPage] = useState(0);
  const [detailId, setDetailId] = useState<string | null>(null);

  // Free-text inputs are debounced so typing doesn't fire a query per
  // keystroke. Any change to the debounced values resets pagination.
  const debouncedErrorCode = useDebounced(errorCode.trim(), 300);
  const debouncedErrorMessage = useDebounced(errorMessage.trim(), 300);
  useEffect(() => {
    setPage(0);
  }, [debouncedErrorCode, debouncedErrorMessage]);

  const baseFilters = useMemo(
    () => ({
      reason: reason === ALL ? undefined : reason,
      status_code:
        statusCode.trim() && !Number.isNaN(Number(statusCode))
          ? Number(statusCode)
          : undefined,
      error_code: debouncedErrorCode || undefined,
      error_message: debouncedErrorMessage || undefined,
      since: toIsoOrUndef(since),
      until: toIsoOrUndef(until),
    }),
    [
      reason,
      statusCode,
      debouncedErrorCode,
      debouncedErrorMessage,
      since,
      until,
    ],
  );

  const filters = useMemo(
    () => ({
      ...baseFilters,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    }),
    [baseFilters, page],
  );

  const query = useQuery({
    queryKey: ["admin", "signup-failures", filters],
    queryFn: () => listFn({ data: filters }),
    staleTime: 15_000,
  });

  const summaryQuery = useQuery({
    queryKey: ["admin", "signup-failures", "summary", baseFilters],
    queryFn: () => summaryFn({ data: baseFilters }),
    staleTime: 15_000,
  });

  const rows: SignupFailureRow[] = query.data?.rows ?? [];
  const total = query.data?.total ?? 0;
  const showingFrom = rows.length ? page * PAGE_SIZE + 1 : 0;
  const showingTo = page * PAGE_SIZE + rows.length;

  const resetFilters = () => {
    setReason(ALL);
    setStatusCode("");
    setErrorCode("");
    setErrorMessage("");
    setSince("");
    setUntil("");
    setPage(0);
  };


  return (
    <div className="mx-auto max-w-7xl p-4 md:p-6 space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-amber-600" aria-hidden />
          Signup failures
        </h1>
        <p className="text-sm text-muted-foreground">
          Recent entries from <code>signup_failure_events</code>. Filter by reason, HTTP status, and time range.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>
            All filters combine with AND. Reference IDs shown match the ones surfaced on the signup error banner.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label htmlFor="reason">Reason</Label>
              <Select
                value={reason}
                onValueChange={(v) => {
                  setPage(0);
                  setReason(v);
                }}
              >
                <SelectTrigger id="reason">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Any</SelectItem>
                  {REASON_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="status">HTTP status</Label>
              <Input
                id="status"
                inputMode="numeric"
                placeholder="e.g. 500"
                value={statusCode}
                onChange={(e) => {
                  setPage(0);
                  setStatusCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 3));
                }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="error_code">Error code</Label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  id="error_code"
                  placeholder="e.g. http_500, route_404"
                  className="pl-8"
                  value={errorCode}
                  onChange={(e) => setErrorCode(e.target.value.slice(0, 100))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="error_message">Error message contains</Label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  id="error_message"
                  placeholder="substring, case-insensitive"
                  className="pl-8"
                  value={errorMessage}
                  onChange={(e) => setErrorMessage(e.target.value.slice(0, 200))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="since">From</Label>
              <Input
                id="since"
                type="datetime-local"
                value={since}
                onChange={(e) => {
                  setPage(0);
                  setSince(e.target.value);
                }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="until">To</Label>
              <Input
                id="until"
                type="datetime-local"
                value={until}
                onChange={(e) => {
                  setPage(0);
                  setUntil(e.target.value);
                }}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                onClick={resetFilters}
                className="w-full"
                type="button"
              >
                Reset
              </Button>
              <Button
                variant="outline"
                onClick={() => query.refetch()}
                disabled={query.isFetching}
                type="button"
                title="Refresh"
              >
                {query.isFetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <SummarySection
        summary={summaryQuery.data}
        isLoading={summaryQuery.isLoading}
        error={summaryQuery.error as Error | null}
      />



      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Results</CardTitle>
            <CardDescription>
              {query.isLoading
                ? "Loading…"
                : total === 0
                  ? "No matching failures."
                  : `Showing ${showingFrom}–${showingTo} of ${total}`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || query.isFetching}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={showingTo >= total || query.isFetching}
            >
              Next
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {query.error ? (
            <p className="text-sm text-destructive">
              {(query.error as Error).message}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Ref</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>HTTP</TableHead>
                    <TableHead>Intent</TableHead>
                    <TableHead>Error code</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {fmtDate(r.created_at)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        <button
                          type="button"
                          onClick={() => setDetailId(r.id)}
                          className="underline-offset-2 hover:underline text-primary"
                          title="Show full details"
                        >
                          {r.ref}
                        </button>
                      </TableCell>
                      <TableCell className="text-xs">{r.reason ?? "—"}</TableCell>
                      <TableCell>
                        <StatusBadge code={r.status_code} />
                      </TableCell>
                      <TableCell className="text-xs">{r.intent ?? "—"}</TableCell>
                      <TableCell className="text-xs">{r.error_code ?? "—"}</TableCell>
                      <TableCell
                        className="max-w-[420px] truncate text-xs"
                        title={r.error_message ?? undefined}
                      >
                        {r.error_message ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!query.isLoading && rows.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-sm text-muted-foreground py-8"
                      >
                        No failures match the current filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <FailureDetailDialog
        id={detailId}
        onOpenChange={(open) => !open && setDetailId(null)}
        fetchDetail={detailFn}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function BreakdownList({
  title,
  items,
  formatKey,
}: {
  title: string;
  items: Array<{ key: string; count: number }>;
  formatKey?: (k: string) => React.ReactNode;
}) {
  const max = items[0]?.count ?? 1;
  return (
    <div>
      <div className="text-xs font-semibold text-muted-foreground mb-2">{title}</div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">—</p>
      ) : (
        <ul className="space-y-1.5">
          {items.slice(0, 6).map((it) => (
            <li key={it.key} className="text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-mono">
                  {formatKey ? formatKey(it.key) : it.key}
                </span>
                <span className="tabular-nums text-muted-foreground">{it.count}</span>
              </div>
              <div className="mt-1 h-1 rounded bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary/60"
                  style={{ width: `${Math.max(4, (it.count / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SummarySection({
  summary,
  isLoading,
  error,
}: {
  summary: SignupFailureSummary | undefined;
  isLoading: boolean;
  error: Error | null;
}) {
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error.message}</p>
        </CardContent>
      </Card>
    );
  }

  const total = summary?.total ?? 0;
  const scanned = summary?.scanned ?? 0;
  const truncated = summary?.truncated ?? false;
  const byReason = (summary?.by_reason ?? []).map((r) => ({
    key: r.reason,
    count: r.count,
  }));
  const byStatus = (summary?.by_status ?? []).map((r) => ({
    key: String(r.status_code),
    count: r.count,
  }));
  const byErrorCode = (summary?.by_error_code ?? []).map((r) => ({
    key: r.error_code,
    count: r.count,
  }));
  const routes = summary?.top_failing_routes ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Summary</CardTitle>
        <CardDescription>
          {isLoading
            ? "Computing…"
            : truncated
              ? `Aggregating the most recent ${scanned.toLocaleString()} of ${total.toLocaleString()} matching failures.`
              : `Aggregating all ${total.toLocaleString()} matching failures.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Total (filtered)" value={total.toLocaleString()} />
          <Stat label="Distinct reasons" value={byReason.length} />
          <Stat label="Distinct HTTP statuses" value={byStatus.length} />
          <Stat label="Distinct error codes" value={byErrorCode.length} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <BreakdownList title="Top reasons" items={byReason} />
          <BreakdownList title="Top HTTP statuses" items={byStatus} />
          <BreakdownList title="Top error codes" items={byErrorCode} />
        </div>

        <div>
          <div className="text-xs font-semibold text-muted-foreground mb-2">
            Top failing routes
          </div>
          <p className="text-[11px] text-muted-foreground mb-2">
            Each row is a distinct failure surface (reason × HTTP × error code)
            on <code>/api/public/auth/signup</code>. Fix the top rows first —
            they represent the largest share of failed signups.
          </p>
          {routes.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No grouped failures in the selected window.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reason</TableHead>
                    <TableHead>HTTP</TableHead>
                    <TableHead>Error code</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead>Last seen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {routes.map((b) => (
                    <TableRow key={b.key}>
                      <TableCell className="text-xs">{b.reason ?? "—"}</TableCell>
                      <TableCell>
                        <StatusBadge code={b.status_code} />
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {b.error_code ?? "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">
                        {b.count.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {fmtDate(b.last_seen_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

