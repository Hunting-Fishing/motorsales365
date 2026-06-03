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

// Org-scoped (or any scope-bound) audit helper for cases where the role check
// depends on a per-call argument (e.g. orgId), which the generic middleware
// factories cannot express. Wraps an authorization check + a handler body and
// records `denied`, `allowed`, or `error` rows to route_audit_log.
import { getRequest } from "@tanstack/react-start/server";

export async function withRouteAudit<T>(args: {
  actorId: string;
  label: string;
  role: AuditRole;
  targetSummary?: Record<string, unknown> | null;
  check?: () => Promise<void> | void;
  run: () => Promise<T>;
}): Promise<T> {
  const request = (() => {
    try {
      return getRequest();
    } catch {
      return null;
    }
  })();
  const method = request?.method ?? null;
  if (args.check) {
    try {
      await args.check();
    } catch (err) {
      await logRouteAccess({
        actorId: args.actorId,
        role: args.role,
        label: args.label,
        method,
        outcome: "denied",
        errorMessage: err instanceof Error ? err.message : String(err),
        request,
        targetSummary: args.targetSummary ?? null,
      });
      throw err;
    }
  }
  const start = Date.now();
  try {
    const result = await args.run();
    await logRouteAccess({
      actorId: args.actorId,
      role: args.role,
      label: args.label,
      method,
      outcome: "allowed",
      durationMs: Date.now() - start,
      request,
      targetSummary: args.targetSummary ?? null,
    });
    return result;
  } catch (err) {
    await logRouteAccess({
      actorId: args.actorId,
      role: args.role,
      label: args.label,
      method,
      outcome: "error",
      errorMessage: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - start,
      request,
      targetSummary: args.targetSummary ?? null,
    });
    throw err;
  }
}
