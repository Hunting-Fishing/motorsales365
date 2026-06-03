// Best-effort route access audit logger. Records every call to admin- and
// domain-role-gated server functions / HTTP routes to public.route_audit_log.
// Never throws into the caller — auditing must not block the underlying
// action if the log write fails.

import { supabaseAdmin } from "./client.server";

export type AuditRole =
  | "admin"
  | "moderator"
  | "shop_manager"
  | "ads_manager"
  | "support"
  | "org_manager";

export type AuditOutcome = "allowed" | "denied" | "error";

export type LogRouteAccessArgs = {
  actorId: string | null | undefined;
  role: AuditRole;
  label: string;
  method?: string | null;
  outcome: AuditOutcome;
  errorMessage?: string | null;
  durationMs?: number | null;
  request?: Request | null;
  ip?: string | null;
  userAgent?: string | null;
  targetSummary?: Record<string, unknown> | null;
};

function truncate(s: string | null | undefined, n: number): string | null {
  if (!s) return null;
  return s.length > n ? s.slice(0, n) : s;
}

function extractIp(request?: Request | null, fallback?: string | null): string | null {
  if (fallback) return truncate(fallback, 80);
  if (!request) return null;
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return truncate(cf, 80);
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return truncate(xff.split(",")[0]?.trim() ?? null, 80);
  const real = request.headers.get("x-real-ip");
  return truncate(real, 80);
}

function extractUserAgent(request?: Request | null, fallback?: string | null): string | null {
  if (fallback) return truncate(fallback, 500);
  if (!request) return null;
  return truncate(request.headers.get("user-agent"), 500);
}

export async function logRouteAccess(args: LogRouteAccessArgs): Promise<void> {
  try {
    if (!args.actorId) return; // anonymous failures are not auditable here
    await supabaseAdmin.from("route_audit_log").insert({
      actor_id: args.actorId,
      role_required: args.role,
      route_label: args.label,
      method: args.method ?? null,
      outcome: args.outcome,
      error_message: truncate(args.errorMessage, 1000),
      ip: extractIp(args.request, args.ip),
      user_agent: extractUserAgent(args.request, args.userAgent),
      duration_ms: args.durationMs ?? null,
      target_summary: args.targetSummary ?? null,
    } as any);
  } catch (e) {
    console.warn("[route-audit] insert failed", e);
  }
}
