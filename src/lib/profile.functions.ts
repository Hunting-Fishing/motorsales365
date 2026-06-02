import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Whitelist of columns a user is allowed to set on their own profile.
// Privileged columns (verification_status, account_status, is_founding_member,
// founding_member_number, role) are deliberately excluded and can only be
// changed by admins/sales via separate flows.
const ProfilePatchSchema = z.object({
  first_name: z.string().trim().max(100).nullable().optional(),
  last_name: z.string().trim().max(100).nullable().optional(),
  full_name: z.string().trim().max(200).nullable().optional(),
  phone: z.string().trim().max(32).nullable().optional(),
  phone_e164: z.string().trim().max(32).nullable().optional(),
  phone_verified_at: z.string().nullable().optional(),
  avatar_url: z.string().trim().max(2048).nullable().optional(),
  seller_type: z.enum(["private", "business", "dealer"]).nullable().optional(),
  business_name: z.string().trim().max(200).nullable().optional(),
  business_address: z.string().trim().max(500).nullable().optional(),
  business_region: z.string().trim().max(100).nullable().optional(),
  business_province: z.string().trim().max(100).nullable().optional(),
  business_city: z.string().trim().max(100).nullable().optional(),
  business_barangay: z.string().trim().max(100).nullable().optional(),
  display_currency: z.string().trim().max(8).nullable().optional(),
});

export type ProfilePatch = z.infer<typeof ProfilePatchSchema>;

export const saveProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ProfilePatchSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Strip undefined keys so we don't blank out columns the client didn't send.
    const patch: Record<string, unknown> = { id: userId };
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) patch[k] = v;
    }
    const { data: saved, error } = await supabase
      .from("profiles")
      .upsert(patch)
      .eq("id", userId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { profile: saved };
  });
