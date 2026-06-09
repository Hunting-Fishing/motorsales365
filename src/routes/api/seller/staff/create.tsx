import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";

const Body = z.object({
  orgId: z.string().uuid(),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9][a-z0-9._-]*$/i, "username may only contain letters, numbers, . _ -"),
  password: z.string().min(8).max(72),
  fullName: z.string().trim().min(1).max(120),
});

function admin() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const STAFF_EMAIL_DOMAIN = "staff.365motorsales.local";

export const Route = createFileRoute("/api/seller/staff/create")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authHeader = request.headers.get("authorization") ?? "";
          const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
          if (!token) return new Response("Unauthorized", { status: 401 });

          const sb = admin();
          const { data: userData, error: userErr } = await sb.auth.getUser(token);
          if (userErr || !userData.user) return new Response("Unauthorized", { status: 401 });
          const actorId = userData.user.id;

          const body = await request.json();
          const parsed = Body.safeParse(body);
          if (!parsed.success) {
            return Response.json({ error: parsed.error.flatten() }, { status: 400 });
          }
          const input = parsed.data;

          // Verify caller can manage this org (owner/admin role)
          const { data: canManage, error: manageErr } = await sb.rpc("can_manage_org", {
            _user_id: actorId,
            _org_id: input.orgId,
          });
          if (manageErr) return Response.json({ error: manageErr.message }, { status: 500 });
          if (!canManage) return new Response("Forbidden", { status: 403 });

          // Load org slug for synthetic email + login_username
          const { data: org } = await sb
            .from("organizations")
            .select("slug, name")
            .eq("id", input.orgId)
            .maybeSingle();
          if (!org) return new Response("Org not found", { status: 404 });

          // Seat limit check
          const [{ data: seatCount }, { data: maxSeats }] = await Promise.all([
            sb.rpc("org_seat_count", { _org_id: input.orgId }),
            sb.rpc("org_max_seats", { _org_id: input.orgId }),
          ]);
          const currentSeats = Number(seatCount ?? 0);
          const cap = maxSeats == null ? null : Number(maxSeats);
          if (cap !== null && currentSeats >= cap) {
            return Response.json(
              {
                error: "Seat limit reached for current plan",
                upgrade_required: true,
                current_seats: currentSeats,
                max_seats: cap,
              },
              { status: 402 },
            );
          }

          const slug = (org as any).slug as string;
          const username = input.username.toLowerCase();
          const loginUsername = `${username}@${slug}`; // friendly login key
          const syntheticEmail = `${username}.${slug}@${STAFF_EMAIL_DOMAIN}`;

          // Reject duplicates within same org
          const { data: existing } = await sb
            .from("profiles")
            .select("id")
            .eq("login_username", loginUsername)
            .maybeSingle();
          if (existing) {
            return Response.json(
              { error: `Username "${username}" is already used in this account.` },
              { status: 409 },
            );
          }

          // Create the auth user (email confirmed, no invite email)
          const { data: created, error: createErr } = await sb.auth.admin.createUser({
            email: syntheticEmail,
            password: input.password,
            email_confirm: true,
            user_metadata: {
              full_name: input.fullName,
              is_staff_account: true,
              parent_org_id: input.orgId,
              login_username: loginUsername,
            },
          });
          if (createErr || !created.user) {
            return Response.json(
              { error: createErr?.message ?? "Failed to create staff user" },
              { status: 400 },
            );
          }
          const newUserId = created.user.id;

          // Update the profile created by handle_new_user trigger
          const { error: profErr } = await sb
            .from("profiles")
            .update({
              full_name: input.fullName,
              login_username: loginUsername,
              parent_org_id: input.orgId,
              is_staff_account: true,
            } as any)
            .eq("id", newUserId);
          if (profErr) {
            // Roll back the auth user to keep state consistent
            await sb.auth.admin.deleteUser(newUserId);
            return Response.json({ error: profErr.message }, { status: 500 });
          }

          // Add to organization_members as "member" (Staff role)
          const { error: memErr } = await sb
            .from("organization_members")
            .insert({
              organization_id: input.orgId,
              user_id: newUserId,
              role: "member" as any,
              invited_by: actorId,
            } as any);
          if (memErr) {
            await sb.auth.admin.deleteUser(newUserId);
            return Response.json({ error: memErr.message }, { status: 500 });
          }

          return Response.json({
            ok: true,
            userId: newUserId,
            loginUsername,
            seatsAfter: currentSeats + 1,
            maxSeats: cap,
          });
        } catch (e: any) {
          return Response.json({ error: e?.message ?? "Server error" }, { status: 500 });
        }
      },
    },
  },
});
