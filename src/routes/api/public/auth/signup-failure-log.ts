// Client-reported signup failure logger.
//
// The primary /api/public/auth/signup route logs its own failures, but it
// cannot log the case where it is entirely missing from the deployed Worker
// (HTTP 404) or where the browser never reaches it (network error, CORS,
// aborted request). This endpoint gives the client a place to report those
// so `signup_failure_events` captures them too.
//
// Rules:
//   - PUBLIC endpoint; validate everything and log conservatively.
//   - No PII: no email, password, name, phone number, address.
//   - Only accepts a small, fixed set of `reason` values.
//   - Payload is capped; strings are truncated before insertion.
//   - Best-effort: on any internal failure we still return 204 so the
//     client's UX is not affected.

import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";
import { createHash } from "crypto";

const ReasonEnum = z.enum([
  "client_route_missing",       // signup POST returned 404
  "client_server_error",         // signup POST returned 5xx
  "client_non_json_response",    // signup POST returned unexpected content-type
  "client_network_error",        // fetch threw (offline, DNS, CORS, aborted)
  "client_unexpected_status",    // any other non-2xx we did not classify
]);

const Body = z
  .object({
    reason: ReasonEnum,
    status_code: z.number().int().min(0).max(599).default(0),
    error_code: z.string().trim().max(100).optional().default(""),
    error_message: z.string().trim().max(500).optional().default(""),
    intent: z.string().trim().max(40).optional().default(""),
    phone_iso: z.string().trim().max(2).optional().default(""),
  })
  .strict();

function admin() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export const Route = createFileRoute("/api/public/auth/signup-failure-log")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const raw = await request.json().catch(() => null);
          const parsed = Body.safeParse(raw);
          if (!parsed.success) {
            // Silent no-op on bad input — this endpoint must never be a vector
            // for noise. Return 204 so client fire-and-forget stays clean.
            return new Response(null, { status: 204 });
          }
          const input = parsed.data;

          const ip =
            request.headers.get("cf-connecting-ip") ??
            request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
            null;
          const salt =
            process.env.SIGNUP_AUDIT_SALT ?? process.env.SUPABASE_URL ?? "";
          const ip_hash = ip
            ? createHash("sha256").update(`${salt}:${ip}`).digest("hex")
            : null;
          const ua = (request.headers.get("user-agent") ?? "").slice(0, 200);

          const sb = admin();
          await (sb.from("signup_failure_events") as any).insert({
            reason: input.reason,
            missing_fields: [],
            status_code: input.status_code,
            intent: input.intent || null,
            phone_iso: input.phone_iso || null,
            ip_hash,
            user_agent: ua || null,
            error_code: input.error_code || null,
            error_message: input.error_message || null,
          });
          return new Response(null, { status: 204 });
        } catch {
          // Never let logging failures surface to the browser.
          return new Response(null, { status: 204 });
        }
      },
    },
  },
});
