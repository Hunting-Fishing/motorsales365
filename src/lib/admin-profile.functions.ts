import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { BUSINESS_KIND_VALUES } from "@/data/business-kinds";

const ALLOWED_ADMIN_EMAIL = "jordilwbailey@gmail.com";

const ProfilePatch = z.object({
  targetUserId: z.string().uuid(),
  // identity
  full_name: z.string().trim().min(1).max(160).optional(),
  first_name: z.string().trim().max(80).nullable().optional(),
  last_name: z.string().trim().max(80).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  avatar_url: z.string().url().max(2048).nullable().optional(),
  // email (auth.users)
  email: z.string().email().max(255).optional(),
  personal_email: z.string().trim().email().max(255).nullable().optional().or(z.literal("")),
  // address
  street_address: z.string().trim().max(200).nullable().optional(),
  postal_code: z.string().trim().max(20).nullable().optional(),
  signup_city: z.string().trim().max(120).nullable().optional(),
  signup_region: z.string().trim().max(120).nullable().optional(),
  signup_province: z.string().trim().max(120).nullable().optional(),
  // business
  business_name: z.string().trim().max(200).nullable().optional(),
  business_kind: z.enum(BUSINESS_KIND_VALUES).nullable().optional(),
  business_address: z.string().trim().max(300).nullable().optional(),
  business_region: z.string().trim().max(120).nullable().optional(),
  business_province: z.string().trim().max(120).nullable().optional(),
  business_city: z.string().trim().max(120).nullable().optional(),
  business_postal_code: z.string().trim().max(20).nullable().optional(),
  // access
  seller_type: z.enum(["private", "business"]).optional(),
  verification_status: z.enum(["unverified", "pending", "verified", "rejected"]).optional(),
});

function normalizeE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^0-9+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("09") && digits.length === 11) return "+63" + digits.slice(1);
  if (digits.startsWith("9") && digits.length === 10) return "+63" + digits;
  if (digits.startsWith("63") && digits.length === 12) return "+" + digits;
  return digits || null;
}

export const adminUpdateUserProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ProfilePatch.parse(input))
  .handler(async ({ data, context }) => {
    const callerEmail = (context.claims?.email as string | undefined)?.toLowerCase();
    if (!callerEmail || callerEmail !== ALLOWED_ADMIN_EMAIL) {
      throw new Error("Not permitted");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { targetUserId, email, phone, ...rest } = data;

    // Update auth email if provided
    if (email) {
      const { error: emailErr } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
        email,
        email_confirm: true,
      });
      if (emailErr) throw new Error(`Email update failed: ${emailErr.message}`);
    }

    // Build profile patch
    const profilePatch: Record<string, any> = { ...rest };
    if (phone !== undefined) {
      profilePatch.phone = phone;
      profilePatch.phone_e164 = normalizeE164(phone);
    }
    if (data.verification_status) {
      profilePatch.verified_at =
        data.verification_status === "verified" ? new Date().toISOString() : null;
    }

    if (Object.keys(profilePatch).length > 0) {
      const { error: pErr } = await supabaseAdmin
        .from("profiles")
        .update(profilePatch as any)
        .eq("id", targetUserId);
      if (pErr) throw new Error(pErr.message);
    }

    // Mirror business fields onto the user's single owned business row, when
    // exactly one exists. Multi-owner / no-owner cases are left alone so the
    // admin can edit each business directly from its own page.
    const businessTouched =
      "business_name" in profilePatch ||
      "business_address" in profilePatch ||
      "business_city" in profilePatch ||
      "business_province" in profilePatch ||
      "business_region" in profilePatch ||
      "business_postal_code" in profilePatch ||
      "business_kind" in profilePatch;
    let mirroredBusinessId: string | null = null;
    if (businessTouched) {
      const { data: owned } = await supabaseAdmin
        .from("businesses")
        .select("id")
        .eq("owner_id", targetUserId);
      if (owned && owned.length === 1) {
        const bizPatch: Record<string, any> = {};
        if ("business_name" in profilePatch) bizPatch.name = profilePatch.business_name;
        if ("business_address" in profilePatch)
          bizPatch.street_address = profilePatch.business_address;
        if ("business_city" in profilePatch) bizPatch.city = profilePatch.business_city;
        if ("business_province" in profilePatch)
          bizPatch.province = profilePatch.business_province;
        if ("business_region" in profilePatch) bizPatch.region = profilePatch.business_region;
        if ("business_postal_code" in profilePatch)
          bizPatch.postal_code = profilePatch.business_postal_code;
        if ("business_kind" in profilePatch) bizPatch.type_slug = profilePatch.business_kind;
        if (Object.keys(bizPatch).length > 0) {
          const { error: bErr } = await supabaseAdmin
            .from("businesses")
            .update(bizPatch as any)
            .eq("id", owned[0].id);
          if (bErr) throw new Error(`Business mirror failed: ${bErr.message}`);
          mirroredBusinessId = owned[0].id;
        }
      }
    }

    // Audit (best effort)
    try {
      await supabaseAdmin.from("admin_audit_log").insert({
        actor_id: context.userId,
        target_user_id: targetUserId,
        action: "profile_edited",
        field: "profile",
        old_value: null,
        new_value: null,
        note: `Admin edited profile fields: ${Object.keys(profilePatch).join(", ")}${email ? " + email" : ""}`,
      } as any);
    } catch {
      // ignore
    }

    return { ok: true, mirroredBusinessId };
  });

/**
 * Returns a lightweight summary of businesses owned by the target user so
 * the admin "Edit user profile" dialog can show whether business-tab edits
 * will mirror to a `businesses` row.
 */
export const adminGetOwnedBusinesses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ targetUserId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const callerEmail = (context.claims?.email as string | undefined)?.toLowerCase();
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin && callerEmail !== ALLOWED_ADMIN_EMAIL) {
      throw new Error("Not permitted");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("businesses")
      .select("id,name,slug")
      .eq("owner_id", data.targetUserId);
    if (error) throw new Error(error.message);
    return { businesses: rows ?? [] };
  });
