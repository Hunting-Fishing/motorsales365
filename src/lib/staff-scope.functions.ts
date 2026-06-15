import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type StaffScope = {
  userId: string;
  email: string | null;
  is365Staff: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  isSupport: boolean;
  isSales: boolean;
  isAdvertising: boolean;
  /** Admin/moderator can see all staff data; others are scoped. */
  canSeeAll: boolean;
};

export const getMyStaffScope = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StaffScope> => {
    const { supabase, userId, claims } = context;
    const email = (claims?.email as string | undefined)?.toLowerCase() ?? null;
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const set = new Set((roles ?? []).map((r: any) => r.role));
    const isAdmin = set.has("admin");
    const isModerator = set.has("moderator");
    return {
      userId,
      email,
      is365Staff:
        !!email && (email.endsWith("@365motorsales.com") || isAdmin || isModerator),
      isAdmin,
      isModerator,
      isSupport: set.has("support"),
      isSales:
        set.has("sales") ||
        set.has("sales_junior") ||
        set.has("sales_senior") ||
        set.has("sales_manager"),
      isAdvertising: set.has("advertising"),
      canSeeAll: isAdmin || isModerator,
    };
  });
