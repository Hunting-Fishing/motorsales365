import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdminRole } from "@/integrations/supabase/admin-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const Input = z.object({
  query: z.string().min(1).max(200),
  includeUnverified: z.boolean().optional().default(false),
});

export type TransferUserHit = {
  id: string;
  full_name: string | null;
  business_name: string | null;
  signup_intent: string | null;
  email: string | null;
  email_confirmed_at: string | null;
};

export const searchTransferableUsers = createServerFn({ method: "POST" })
  .middleware([requireAdminRole])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<{ rows: TransferUserHit[] }> => {

    const q = data.query.trim();
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    let profiles: Array<{
      id: string;
      full_name: string | null;
      business_name: string | null;
      signup_intent: string | null;
    }> = [];

    if (uuidRe.test(q)) {
      const { data: d, error } = await supabaseAdmin
        .from("profiles")
        .select("id,full_name,business_name,signup_intent")
        .eq("id", q)
        .limit(1);
      if (error) throw new Error(error.message);
      profiles = (d as any) ?? [];
    } else {
      const safe = q.replace(/[%,()]/g, " ");
      const { data: d, error } = await supabaseAdmin
        .from("profiles")
        .select("id,full_name,business_name,signup_intent")
        .or(`full_name.ilike.%${safe}%,business_name.ilike.%${safe}%`)
        .limit(50);
      if (error) throw new Error(error.message);
      profiles = (d as any) ?? [];
    }

    if (profiles.length === 0) return { rows: [] };

    // Pull verification status from auth.users via admin API
    const verified = await Promise.all(
      profiles.map(async (p) => {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(p.id);
        return {
          ...p,
          email: u?.user?.email ?? null,
          email_confirmed_at: (u?.user?.email_confirmed_at as string | null) ?? null,
        };
      }),
    );

    const rows = data.includeUnverified ? verified : verified.filter((r) => !!r.email_confirmed_at);

    return { rows: rows.slice(0, 20) };
  });
