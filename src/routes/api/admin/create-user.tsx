import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";
import { logRouteAccess } from "@/integrations/supabase/route-audit.server";


const RoleEnum = z.enum(["admin", "moderator", "support", "sales", "advertising"]);
const SellerTypeEnum = z.enum(["private", "dealer", "repair_shop", "insurance"]);

const Body = z.object({
  email: z.string().email().max(255),
  full_name: z.string().trim().min(1).max(120),
  password: z.string().min(8).max(72),
  account_type: z.enum(["staff", "business"]),
  roles: z.array(RoleEnum).default([]),
  seller_type: SellerTypeEnum.optional(),
  business_name: z.string().trim().max(160).optional(),
  business_kind: z.enum(["dealer", "repair_shop", "insurance"]).optional(),
  mark_verified: z.boolean().optional(),
});

function admin() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const Route = createFileRoute("/api/admin/create-user")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const label = "admin.createUser";
        let actorId: string | null = null;
        const start = Date.now();
        try {
          const authHeader = request.headers.get("authorization") ?? "";
          const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
          if (!token) {
            await logRouteAccess({
              actorId: null,
              role: "admin",
              label,
              method: "POST",
              outcome: "denied",
              errorMessage: "No bearer token",
              request,
            });
            return new Response("Unauthorized", { status: 401 });
          }

          const sb = admin();
          const { data: userData, error: userErr } = await sb.auth.getUser(token);
          if (userErr || !userData.user) {
            await logRouteAccess({
              actorId: null,
              role: "admin",
              label,
              method: "POST",
              outcome: "denied",
              errorMessage: userErr?.message ?? "Invalid token",
              request,
            });
            return new Response("Unauthorized", { status: 401 });
          }
          actorId = userData.user.id;

          // Verify caller is admin
          const { data: rolesData } = await sb
            .from("user_roles")
            .select("role")
            .eq("user_id", actorId);
          const isAdmin = (rolesData ?? []).some((r: any) => r.role === "admin");
          if (!isAdmin) {
            await logRouteAccess({
              actorId,
              role: "admin",
              label,
              method: "POST",
              outcome: "denied",
              errorMessage: "Not an admin",
              request,
            });
            return new Response("Forbidden", { status: 403 });
          }

          const json = await request.json();
          const parsed = Body.safeParse(json);
          if (!parsed.success) {
            await logRouteAccess({
              actorId,
              role: "admin",
              label,
              method: "POST",
              outcome: "error",
              errorMessage: "Invalid payload",
              durationMs: Date.now() - start,
              request,
            });
            return new Response(JSON.stringify({ error: parsed.error.flatten() }), { status: 400 });
          }
          const input = parsed.data;

          // Create auth user (email_confirm so they can sign in immediately)
          const { data: created, error: createErr } = await sb.auth.admin.createUser({
            email: input.email,
            password: input.password,
            email_confirm: true,
            user_metadata: { full_name: input.full_name },
          });
          if (createErr || !created.user) {
            await logRouteAccess({
              actorId,
              role: "admin",
              label,
              method: "POST",
              outcome: "error",
              errorMessage: createErr?.message ?? "Failed to create user",
              durationMs: Date.now() - start,
              request,
              targetSummary: { email: input.email, account_type: input.account_type },
            });
            return new Response(
              JSON.stringify({ error: createErr?.message ?? "Failed to create user" }),
              { status: 400 },
            );
          }
          const newUserId = created.user.id;

          // handle_new_user trigger creates profile + 'user' role.
          // Insert any extra staff roles.
          if (input.account_type === "staff" && input.roles.length > 0) {
            const rows = input.roles.map((role) => ({ user_id: newUserId, role }));
            const { error: roleErr } = await sb.from("user_roles").insert(rows as any);
            if (roleErr) {
              await logRouteAccess({
                actorId,
                role: "admin",
                label,
                method: "POST",
                outcome: "error",
                errorMessage: `Role assignment failed: ${roleErr.message}`,
                durationMs: Date.now() - start,
                request,
                targetSummary: { email: input.email, new_user_id: newUserId },
              });
              return new Response(
                JSON.stringify({
                  error: `User created but role assignment failed: ${roleErr.message}`,
                  userId: newUserId,
                }),
                { status: 207 },
              );
            }
          }

          // Update profile for business accounts
          if (input.account_type === "business") {
            const profileUpdate: any = {
              full_name: input.full_name,
              seller_type: input.seller_type ?? "private",
            };
            if (input.business_name) profileUpdate.business_name = input.business_name;
            if (input.business_kind) profileUpdate.business_kind = input.business_kind;
            if (input.mark_verified) {
              profileUpdate.verification_status = "verified";
              profileUpdate.verified_at = new Date().toISOString();
            }
            await sb.from("profiles").update(profileUpdate).eq("id", newUserId);
          } else {
            await sb.from("profiles").update({ full_name: input.full_name }).eq("id", newUserId);
          }

          await logRouteAccess({
            actorId,
            role: "admin",
            label,
            method: "POST",
            outcome: "allowed",
            durationMs: Date.now() - start,
            request,
            targetSummary: {
              email: input.email,
              new_user_id: newUserId,
              account_type: input.account_type,
              roles: input.roles,
            },
          });

          return new Response(JSON.stringify({ ok: true, userId: newUserId, email: input.email }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e: any) {
          await logRouteAccess({
            actorId,
            role: "admin",
            label,
            method: "POST",
            outcome: "error",
            errorMessage: e?.message ?? "Server error",
            durationMs: Date.now() - start,
            request,
          });
          return new Response(JSON.stringify({ error: e?.message ?? "Server error" }), {
            status: 500,
          });
        }
      },

    },
  },
});
