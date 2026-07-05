import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";
import { logRouteAccess } from "@/integrations/supabase/route-audit.server";

const FIELD_KEYS = [
  "phone_e164",
  "personal_email",
  "street_address",
  "postal_code",
  "signup_region",
  "signup_province",
  "signup_city",
  "business_address",
  "business_postal_code",
  "business_region",
  "business_province",
  "business_city",
] as const;
type FieldKey = (typeof FIELD_KEYS)[number];

const RequiredKey = ["phone_e164", "personal_email", "street_address"] as const;

const Row = z
  .object({
    user_id: z.string().uuid().optional(),
    email: z.string().trim().email().optional(),
    phone: z.string().trim().max(40).optional(),
    personal_email: z.string().trim().max(255).optional(),
    street_address: z.string().trim().max(200).optional(),
    postal_code: z.string().trim().max(20).optional(),
    signup_region: z.string().trim().max(120).optional(),
    signup_province: z.string().trim().max(120).optional(),
    signup_city: z.string().trim().max(120).optional(),
    business_address: z.string().trim().max(300).optional(),
    business_postal_code: z.string().trim().max(20).optional(),
    business_region: z.string().trim().max(120).optional(),
    business_province: z.string().trim().max(120).optional(),
    business_city: z.string().trim().max(120).optional(),
  })
  .refine((r) => r.user_id || r.email, { message: "user_id or email required" });

const Body = z.object({
  dry_run: z.boolean(),
  only_fill_empty: z.boolean(),
  rows: z.array(Row).min(1).max(500),
});

type RowInput = z.infer<typeof Row>;

type ResultRow = {
  index: number;
  user_id: string | null;
  email: string | null;
  current: Partial<Record<FieldKey, string | null>>;
  incoming: Partial<Record<FieldKey, string | null>>;
  would_apply: FieldKey[];
  would_skip: FieldKey[];
  applied: FieldKey[];
  still_missing: FieldKey[];
  errors: string[];
};

function admin() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function normalizeE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^0-9+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("09") && digits.length === 11) return "+63" + digits.slice(1);
  if (digits.startsWith("9") && digits.length === 10) return "+63" + digits;
  if (digits.startsWith("63") && digits.length === 12) return "+" + digits;
  return digits || null;
}

function mapIncoming(r: RowInput): {
  incoming: Partial<Record<FieldKey, string | null>>;
  errors: string[];
} {
  const out: Partial<Record<FieldKey, string | null>> = {};
  const errors: string[] = [];
  if (r.phone !== undefined && r.phone !== "") {
    const p = normalizeE164(r.phone);
    if (!p || !/^\+?\d{7,15}$/.test(p)) errors.push(`invalid phone "${r.phone}"`);
    else out.phone_e164 = p;
  }
  if (r.personal_email !== undefined && r.personal_email !== "") {
    const e = r.personal_email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) errors.push(`invalid personal_email "${r.personal_email}"`);
    else out.personal_email = e;
  }
  const passthrough: FieldKey[] = [
    "street_address",
    "postal_code",
    "signup_region",
    "signup_province",
    "signup_city",
    "business_address",
    "business_postal_code",
    "business_region",
    "business_province",
    "business_city",
  ];
  for (const k of passthrough) {
    const v = (r as any)[k];
    if (typeof v === "string" && v.trim() !== "") out[k] = v.trim();
  }
  return { incoming: out, errors };
}

export const Route = createFileRoute("/api/admin/backfill-profiles")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const label = "admin.backfillProfiles";
        const start = Date.now();
        let actorId: string | null = null;
        try {
          const authHeader = request.headers.get("authorization") ?? "";
          const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
          if (!token) {
            await logRouteAccess({ actorId: null, role: "admin", label, method: "POST", outcome: "denied", errorMessage: "No bearer token", request });
            return new Response("Unauthorized", { status: 401 });
          }
          const sb = admin();
          const { data: userData, error: userErr } = await sb.auth.getUser(token);
          if (userErr || !userData.user) {
            await logRouteAccess({ actorId: null, role: "admin", label, method: "POST", outcome: "denied", errorMessage: userErr?.message ?? "Invalid token", request });
            return new Response("Unauthorized", { status: 401 });
          }
          actorId = userData.user.id;

          const { data: rolesData } = await sb.from("user_roles").select("role").eq("user_id", actorId);
          const isAdmin = (rolesData ?? []).some((r: any) => r.role === "admin");
          if (!isAdmin) {
            await logRouteAccess({ actorId, role: "admin", label, method: "POST", outcome: "denied", errorMessage: "Not an admin", request });
            return new Response("Forbidden", { status: 403 });
          }

          const json = await request.json();
          const parsed = Body.safeParse(json);
          if (!parsed.success) {
            await logRouteAccess({ actorId, role: "admin", label, method: "POST", outcome: "error", errorMessage: "Invalid payload", durationMs: Date.now() - start, request });
            return new Response(JSON.stringify({ error: parsed.error.flatten() }), { status: 400, headers: { "content-type": "application/json" } });
          }
          const { dry_run, only_fill_empty, rows } = parsed.data;

          // Resolve emails → user ids (auth.users) in one shot.
          const needEmail = rows.filter((r) => !r.user_id && r.email).map((r) => r.email!.toLowerCase());
          const emailToId = new Map<string, string>();
          if (needEmail.length > 0) {
            const { data: authUsers } = await (sb as any)
              .schema("auth")
              .from("users")
              .select("id,email")
              .in("email", needEmail);
            for (const u of (authUsers ?? []) as Array<{ id: string; email: string }>) {
              if (u.email) emailToId.set(u.email.toLowerCase(), u.id);
            }
          }

          // Collect user ids and fetch current profile rows.
          const results: ResultRow[] = rows.map((r, i) => {
            const uid = r.user_id ?? (r.email ? emailToId.get(r.email.toLowerCase()) ?? null : null);
            const { incoming, errors } = mapIncoming(r);
            if (!uid && r.email) errors.unshift(`no user found for email "${r.email}"`);
            return {
              index: i,
              user_id: uid,
              email: r.email ?? null,
              current: {},
              incoming,
              would_apply: [],
              would_skip: [],
              applied: [],
              still_missing: [],
              errors,
            };
          });

          const ids = Array.from(new Set(results.map((r) => r.user_id).filter(Boolean))) as string[];
          const currentById = new Map<string, Record<string, any>>();
          if (ids.length > 0) {
            const { data: profs, error: profErr } = await sb
              .from("profiles")
              .select(["id", ...FIELD_KEYS].join(","))
              .in("id", ids);
            if (profErr) throw profErr;
            for (const p of (profs ?? []) as any[]) currentById.set(p.id, p);
          }

          // Compute would_apply / would_skip per row.
          for (const res of results) {
            if (!res.user_id) continue;
            const cur = currentById.get(res.user_id);
            if (!cur) {
              res.errors.push("profile row not found");
              continue;
            }
            for (const k of FIELD_KEYS) res.current[k] = cur[k] ?? null;
            for (const k of Object.keys(res.incoming) as FieldKey[]) {
              const incoming = res.incoming[k];
              if (incoming == null || incoming === "") continue;
              const existing = cur[k];
              const filled = existing !== null && existing !== undefined && String(existing).trim() !== "";
              if (only_fill_empty && filled) res.would_skip.push(k);
              else if (existing === incoming) res.would_skip.push(k);
              else res.would_apply.push(k);
            }
          }

          if (dry_run) {
            await logRouteAccess({ actorId, role: "admin", label, method: "POST", outcome: "allowed", durationMs: Date.now() - start, request, targetSummary: { dry_run: true, rows: rows.length } });
            return Response.json({ results });
          }

          // Apply per row.
          for (const res of results) {
            if (!res.user_id || res.errors.length > 0 || res.would_apply.length === 0) continue;
            const patch: Record<string, any> = {};
            for (const k of res.would_apply) patch[k] = res.incoming[k];
            const { error: updErr } = await sb.from("profiles").update(patch).eq("id", res.user_id);
            if (updErr) {
              res.errors.push(`update failed: ${updErr.message}`);
              continue;
            }
            // Audit each field change.
            const auditRows = res.would_apply.map((k) => ({
              target_user_id: res.user_id!,
              actor_id: actorId!,
              actor_role: "admin",
              field: k,
              old_value: (res.current[k] ?? null) as any,
              new_value: (res.incoming[k] ?? null) as any,
              note: "bulk backfill",
            }));
            if (auditRows.length > 0) await sb.from("account_audit_log").insert(auditRows);
            res.applied = [...res.would_apply];
          }

          // Verify: re-select updated rows and report still-missing required fields.
          const touched = results.filter((r) => r.applied.length > 0 && r.user_id).map((r) => r.user_id!) as string[];
          if (touched.length > 0) {
            const { data: after } = await sb
              .from("profiles")
              .select(["id", ...FIELD_KEYS].join(","))
              .in("id", touched);
            const afterById = new Map<string, any>();
            for (const p of (after ?? []) as any[]) afterById.set(p.id, p);
            for (const res of results) {
              if (!res.user_id) continue;
              const row = afterById.get(res.user_id);
              if (!row) continue;
              for (const k of RequiredKey) {
                const v = row[k];
                if (v === null || v === undefined || String(v).trim() === "") res.still_missing.push(k);
              }
            }
          } else {
            for (const res of results) {
              if (!res.user_id) continue;
              for (const k of RequiredKey) {
                const v = res.current[k];
                if (v === null || v === undefined || String(v).trim() === "") res.still_missing.push(k);
              }
            }
          }

          await logRouteAccess({ actorId, role: "admin", label, method: "POST", outcome: "allowed", durationMs: Date.now() - start, request, targetSummary: { dry_run: false, rows: rows.length, applied: results.reduce((n, r) => n + r.applied.length, 0) } });
          return Response.json({ results });
        } catch (e: any) {
          await logRouteAccess({ actorId, role: "admin", label, method: "POST", outcome: "error", errorMessage: e?.message ?? "Unhandled", durationMs: Date.now() - start, request });
          return new Response(JSON.stringify({ error: e?.message ?? "Unhandled" }), { status: 500, headers: { "content-type": "application/json" } });
        }
      },
    },
  },
});
