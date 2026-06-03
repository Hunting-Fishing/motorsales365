// Server-side role gates with built-in access auditing.
//
// Three middlewares are exported:
//   - requireAdminRole               (admin-only, audited only if you don't pass a label)
//   - requireAdminRoleAudited(label) (admin-only, records every call to route_audit_log)
//   - requireDomainRole(role, label) (gates by can_* RPC for non-admin staff roles)
//
// All three compose `requireSupabaseAuth` so handlers still receive
// `context.userId` and an authenticated `context.supabase`.

import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "./auth-middleware";
import { supabaseAdmin } from "./client.server";
import { logRouteAccess, type AuditRole } from "./route-audit.server";

type DomainRole = Exclude<AuditRole, "admin" | "org_manager">;

const RPC_BY_ROLE: Record<DomainRole, string> = {
  moderator: "can_moderate",
  shop_manager: "can_manage_shop",
  ads_manager: "can_manage_ads",
  support: "can_support",
};

async function userHasAdminRole(userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  return !error && data === true;
}

async function userHasDomainRole(userId: string, role: DomainRole): Promise<boolean> {
  const rpc = RPC_BY_ROLE[role];
  const { data, error } = await (supabaseAdmin.rpc as any)(rpc, { _user_id: userId });
  return !error && data === true;
}

// Backward-compatible: existing callers using requireAdminRole keep working.
// Records access under route_label="(unlabeled)". Prefer requireAdminRoleAudited(label).
export const requireAdminRole = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
      const request = getRequest(); {
    const userId = (context as { userId?: string }).userId;
    if (!userId) {
      throw new Response("Unauthorized", { status: 401 });
    }
    const ok = await userHasAdminRole(userId);
    if (!ok) {
      await logRouteAccess({
        actorId: userId,
        role: "admin",
        label: "(unlabeled)",
        method: request?.method,
        outcome: "denied",
        request,
      });
      throw new Response("Forbidden", { status: 403 });
    }
    const start = Date.now();
    try {
      const result = await next({ context: { isAdmin: true as const } });
      await logRouteAccess({
        actorId: userId,
        role: "admin",
        label: "(unlabeled)",
        method: request?.method,
        outcome: "allowed",
        durationMs: Date.now() - start,
        request,
      });
      return result;
    } catch (err) {
      await logRouteAccess({
        actorId: userId,
        role: "admin",
        label: "(unlabeled)",
        method: request?.method,
        outcome: "error",
        errorMessage: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - start,
        request,
      });
      throw err;
    }
  });

export function requireAdminRoleAudited(label: string) {
  return createMiddleware({ type: "function" })
    .middleware([requireSupabaseAuth])
    .server(async ({ next, context }) => {
      const request = getRequest(); {
      const userId = (context as { userId?: string }).userId;
      if (!userId) throw new Response("Unauthorized", { status: 401 });
      const ok = await userHasAdminRole(userId);
      if (!ok) {
        await logRouteAccess({
          actorId: userId,
          role: "admin",
          label,
          method: request?.method,
          outcome: "denied",
          request,
        });
        throw new Response("Forbidden", { status: 403 });
      }
      const start = Date.now();
      try {
        const result = await next({ context: { isAdmin: true as const } });
        await logRouteAccess({
          actorId: userId,
          role: "admin",
          label,
          method: request?.method,
          outcome: "allowed",
          durationMs: Date.now() - start,
          request,
        });
        return result;
      } catch (err) {
        await logRouteAccess({
          actorId: userId,
          role: "admin",
          label,
          method: request?.method,
          outcome: "error",
          errorMessage: err instanceof Error ? err.message : String(err),
          durationMs: Date.now() - start,
          request,
        });
        throw err;
      }
    });
}

export function requireDomainRole(role: DomainRole, label: string) {
  return createMiddleware({ type: "function" })
    .middleware([requireSupabaseAuth])
    .server(async ({ next, context }) => {
      const request = getRequest(); {
      const userId = (context as { userId?: string }).userId;
      if (!userId) throw new Response("Unauthorized", { status: 401 });
      const ok = await userHasDomainRole(userId, role);
      if (!ok) {
        await logRouteAccess({
          actorId: userId,
          role,
          label,
          method: request?.method,
          outcome: "denied",
          request,
        });
        throw new Response("Forbidden", { status: 403 });
      }
      const start = Date.now();
      try {
        const result = await next({ context: { domainRole: role } });
        await logRouteAccess({
          actorId: userId,
          role,
          label,
          method: request?.method,
          outcome: "allowed",
          durationMs: Date.now() - start,
          request,
        });
        return result;
      } catch (err) {
        await logRouteAccess({
          actorId: userId,
          role,
          label,
          method: request?.method,
          outcome: "error",
          errorMessage: err instanceof Error ? err.message : String(err),
          durationMs: Date.now() - start,
          request,
        });
        throw err;
      }
    });
}
