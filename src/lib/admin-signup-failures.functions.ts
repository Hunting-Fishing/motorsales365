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

export type ListSignupFailuresInput = {
  reason?: string;
  status_code?: number;
  since?: string; // ISO
  until?: string; // ISO
  limit?: number;
  offset?: number;
};

function shortRef(id: string) {
  return `SF-${id.replace(/-/g, "").slice(-8).toUpperCase()}`;
}

export const listSignupFailures = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: ListSignupFailuresInput) => {
    const reason = (input?.reason ?? "").trim().slice(0, 60);
    const status_code =
      typeof input?.status_code === "number" && Number.isFinite(input.status_code)
        ? Math.max(0, Math.min(599, Math.trunc(input.status_code)))
        : undefined;
    const isIso = (s: string) => !Number.isNaN(Date.parse(s));
    const since = input?.since && isIso(input.since) ? input.since : undefined;
    const until = input?.until && isIso(input.until) ? input.until : undefined;
    const limit = Math.max(1, Math.min(200, Math.trunc(input?.limit ?? 50)));
    const offset = Math.max(0, Math.trunc(input?.offset ?? 0));
    return { reason, status_code, since, until, limit, offset };
  })
  .handler(async ({ data, context }): Promise<ListSignupFailuresResult> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let q = supabaseAdmin
      .from("signup_failure_events")
      .select(
        "id, created_at, reason, status_code, intent, phone_iso, error_code, error_message, user_agent",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);

    if (data.reason) q = q.eq("reason", data.reason);
    if (typeof data.status_code === "number") q = q.eq("status_code", data.status_code);
    if (data.since) q = q.gte("created_at", data.since);
    if (data.until) q = q.lte("created_at", data.until);

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
