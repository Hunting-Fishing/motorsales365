import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: any) {
  const { data: ok } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!ok) throw new Error("Forbidden");
}

export const adminListSuppliers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("parts_suppliers")
      .select("*")
      .order("priority", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw error;
    return data ?? [];
  });

export const adminUpsertSupplier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const row = { ...data };
    if (!row.slug) row.slug = String(row.name ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const { data: out, error } = await context.supabase
      .from("parts_suppliers")
      .upsert(row, { onConflict: "id" })
      .select()
      .single();
    if (error) throw error;
    return out;
  });

export const adminDeleteSupplier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("parts_suppliers").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
