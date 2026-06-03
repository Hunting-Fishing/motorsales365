/**
 * Feature-flags server functions (Phase 3.2).
 *
 * The flag table is public-readable so the UI can render "Coming soon"
 * affordances without an auth round-trip. Writes are admin-only and gated
 * by `requireAdminRoleAudited`.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { requireAdminRoleAudited } from "@/integrations/supabase/admin-middleware";

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  payload: Record<string, unknown>;
  description: string | null;
  updated_at: string;
}

export const listFeatureFlags = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ flags: FeatureFlag[] }> => {
    // Anonymous read is intentional — flag enablement is not sensitive.
    const { data, error } = await supabase
      .from("feature_flags")
      .select("key,enabled,payload,description,updated_at")
      .order("key", { ascending: true });
    if (error) throw new Error(error.message);
    return {
      flags: ((data ?? []) as FeatureFlag[]).map((f) => ({
        ...f,
        payload: (f.payload ?? {}) as Record<string, unknown>,
      })),
    };
  },
);

const ToggleSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9_.-]+$/),
  enabled: z.boolean(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export const setFeatureFlag = createServerFn({ method: "POST" })
  .middleware([requireAdminRoleAudited("flags.toggle")])
  .inputValidator((input) => ToggleSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase: admin } = context;
    const patch: Record<string, unknown> = { enabled: data.enabled };
    if (data.payload !== undefined) patch.payload = data.payload;
    const { error } = await admin
      .from("feature_flags")
      .update(patch)
      .eq("key", data.key);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
