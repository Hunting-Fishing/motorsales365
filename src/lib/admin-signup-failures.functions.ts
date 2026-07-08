import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SignupFailureRow = {
  id: string;
  created_at: string;
  reason: string | null;
  status_code: number | null;
  intent: string | null;
  phone_iso: string | null;
  error_code: string | null;
  error_message: string | null;
  user_agent: string | null;
  ref: string;
};

export type ListSignupFailuresResult = {
  rows: SignupFailureRow[];
  total: number;
  limit: number;
  offset: number;
};

export type SignupFailureFilters = {
  reason?: string;
  status_code?: number;
  error_code?: string;      // exact match / prefix (uses ILIKE prefix)
  error_message?: string;   // substring, case-insensitive
  since?: string;           // ISO
  until?: string;           // ISO
};

export type ListSignupFailuresInput = SignupFailureFilters & {
  limit?: number;
  offset?: number;
};

export type SignupFailureBucket = {
  key: string;
  reason: string | null;
  status_code: number | null;
  error_code: string | null;
  count: number;
  last_seen_at: string;
};

export type SignupFailureSummary = {
  total: number;
  scanned: number;
  truncated: boolean;
  window: { since: string | null; until: string | null };
  by_reason: Array<{ reason: string; count: number }>;
  by_status: Array<{ status_code: number; count: number }>;
  by_error_code: Array<{ error_code: string; count: number }>;
  top_failing_routes: SignupFailureBucket[];
};

function shortRef(id: string) {
  return `SF-${id.replace(/-/g, "").slice(-8).toUpperCase()}`;
}

// PostgREST-safe escape: `%`, `_`, and `,` have meaning inside `ilike`
// patterns / the OR filter. Strip control chars and clamp length so a
// pathological input can't blow up the query.
function safeLike(input: string): string {
  return input
    .replace(/[\p{Cc}]/gu, "")
    .replace(/[%_,]/g, " ")
    .trim()
    .slice(0, 200);
}

function normalizeFilters(input: SignupFailureFilters | undefined) {
  const reason = (input?.reason ?? "").trim().slice(0, 60);
  const status_code =
    typeof input?.status_code === "number" && Number.isFinite(input.status_code)
      ? Math.max(0, Math.min(599, Math.trunc(input.status_code)))
      : undefined;
  const error_code = safeLike(input?.error_code ?? "");
  const error_message = safeLike(input?.error_message ?? "");
  const isIso = (s: string) => !Number.isNaN(Date.parse(s));
  const since = input?.since && isIso(input.since) ? input.since : undefined;
  const until = input?.until && isIso(input.until) ? input.until : undefined;
  return { reason, status_code, error_code, error_message, since, until };
}

function applyFilters<T extends { eq: any; ilike: any; gte: any; lte: any }>(
  q: T,
  f: ReturnType<typeof normalizeFilters>,
): T {
  let out: any = q;
  if (f.reason) out = out.eq("reason", f.reason);
  if (typeof f.status_code === "number") out = out.eq("status_code", f.status_code);
  if (f.error_code) out = out.ilike("error_code", `${f.error_code}%`);
  if (f.error_message) out = out.ilike("error_message", `%${f.error_message}%`);
  if (f.since) out = out.gte("created_at", f.since);
  if (f.until) out = out.lte("created_at", f.until);
  return out as T;
}

async function requireAdmin(context: {
  supabase: any;
  userId: string;
}): Promise<void> {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden");
}

export const listSignupFailures = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: ListSignupFailuresInput) => {
    const f = normalizeFilters(input);
    const limit = Math.max(1, Math.min(200, Math.trunc(input?.limit ?? 50)));
    const offset = Math.max(0, Math.trunc(input?.offset ?? 0));
    return { ...f, limit, offset };
  })
  .handler(async ({ data, context }): Promise<ListSignupFailuresResult> => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let q = supabaseAdmin
      .from("signup_failure_events")
      .select(
        "id, created_at, reason, status_code, intent, phone_iso, error_code, error_message, user_agent",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);
    q = applyFilters(q as any, data);

    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);

    return {
      rows: ((rows ?? []) as any[]).map((r) => ({
        id: r.id,
        created_at: r.created_at,
        reason: r.reason,
        status_code: r.status_code,
        intent: r.intent,
        phone_iso: r.phone_iso,
        error_code: r.error_code,
        error_message: r.error_message,
        user_agent: r.user_agent,
        ref: shortRef(r.id),
      })),
      total: count ?? 0,
      limit: data.limit,
      offset: data.offset,
    };
  });

// Aggregated counts + top failing "routes" (reason × status_code × error_code
// buckets — each bucket identifies a distinct failure surface that admins
// would triage together). Fetches up to 5000 matching rows and aggregates in
// memory so a single query call answers the summary.
export const getSignupFailureSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: SignupFailureFilters) => normalizeFilters(input))
  .handler(async ({ data, context }): Promise<SignupFailureSummary> => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const CAP = 5000;

    // Get exact total for the filter set.
    let countQ = supabaseAdmin
      .from("signup_failure_events")
      .select("id", { count: "exact", head: true });
    countQ = applyFilters(countQ as any, data);
    const { count: totalCount, error: countErr } = await countQ;
    if (countErr) throw new Error(countErr.message);

    // Fetch the most-recent slice for grouping.
    let rowsQ = supabaseAdmin
      .from("signup_failure_events")
      .select("created_at, reason, status_code, error_code")
      .order("created_at", { ascending: false })
      .limit(CAP);
    rowsQ = applyFilters(rowsQ as any, data);
    const { data: rows, error: rowsErr } = await rowsQ;
    if (rowsErr) throw new Error(rowsErr.message);

    const arr = (rows ?? []) as Array<{
      created_at: string;
      reason: string | null;
      status_code: number | null;
      error_code: string | null;
    }>;
    const scanned = arr.length;
    const total = totalCount ?? scanned;
    const truncated = total > scanned;

    const bumpMap = <K extends string | number>(m: Map<K, number>, k: K) =>
      m.set(k, (m.get(k) ?? 0) + 1);

    const reasonMap = new Map<string, number>();
    const statusMap = new Map<number, number>();
    const errCodeMap = new Map<string, number>();
    const bucketMap = new Map<string, SignupFailureBucket>();

    for (const r of arr) {
      if (r.reason) bumpMap(reasonMap, r.reason);
      if (typeof r.status_code === "number") bumpMap(statusMap, r.status_code);
      if (r.error_code) bumpMap(errCodeMap, r.error_code);

      const key = `${r.reason ?? "-"}|${r.status_code ?? "-"}|${r.error_code ?? "-"}`;
      const existing = bucketMap.get(key);
      if (existing) {
        existing.count += 1;
        if (r.created_at > existing.last_seen_at) existing.last_seen_at = r.created_at;
      } else {
        bucketMap.set(key, {
          key,
          reason: r.reason,
          status_code: r.status_code,
          error_code: r.error_code,
          count: 1,
          last_seen_at: r.created_at,
        });
      }
    }

    const sortByCountDesc = <T extends { count: number }>(list: T[]) =>
      list.sort((a, b) => b.count - a.count);

    return {
      total,
      scanned,
      truncated,
      window: { since: data.since ?? null, until: data.until ?? null },
      by_reason: sortByCountDesc(
        Array.from(reasonMap, ([reason, count]) => ({ reason, count })),
      ).slice(0, 20),
      by_status: sortByCountDesc(
        Array.from(statusMap, ([status_code, count]) => ({ status_code, count })),
      ).slice(0, 20),
      by_error_code: sortByCountDesc(
        Array.from(errCodeMap, ([error_code, count]) => ({ error_code, count })),
      ).slice(0, 20),
      top_failing_routes: sortByCountDesc(Array.from(bucketMap.values())).slice(0, 10),
    };
  });

export const REASON_OPTIONS = [
  "client_route_missing",
  "client_server_error",
  "client_non_json_response",
  "client_network_error",
  "client_unexpected_status",
  "server_signup_error",
  "server_validation_error",
  "server_exception",
] as const;
